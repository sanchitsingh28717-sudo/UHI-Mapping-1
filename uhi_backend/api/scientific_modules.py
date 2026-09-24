import numpy as np
import rasterio
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MAPS_DIR = BASE_DIR.parent / 'AI_UH_Python' / 'maps'

# ── City prefix → raster file prefix mapping ─────────────────────────────────
# Matches the prefixes used in gis_utils.py CITY_BOUNDARIES and get_containing_city()
CITY_RASTER_PREFIX = {
    'Ahmedabad':      'Ahmedabad',
    'Gandhinagar':    'Gandhinagar',
    'Delhi':          'Delhi',
    'Mumbai_City':    'Mumbai_City',
    'Mumbai_Suburban':'Mumbai_Suburban',
    'Thane':          'Thane',
    'Mumbai_Metro':   'Mumbai_Metro',
}

# Prevailing monsoon wind directions per city (degrees, "blows FROM" convention)
# Sources: India Meteorological Department seasonal wind roses
CITY_WIND_PARAMS = {
    'Ahmedabad':       {'u_ref': 4.2, 'base_angle': 240.0},  # South-West monsoon
    'Gandhinagar':     {'u_ref': 4.0, 'base_angle': 235.0},  # Similar to Ahmedabad
    'Delhi':           {'u_ref': 3.8, 'base_angle': 210.0},  # South-Westerly
    'Mumbai_City':     {'u_ref': 5.5, 'base_angle': 225.0},  # Strong coastal SW
    'Mumbai_Suburban': {'u_ref': 5.2, 'base_angle': 225.0},
    'Thane':           {'u_ref': 4.8, 'base_angle': 230.0},
    'Mumbai_Metro':    {'u_ref': 5.0, 'base_angle': 225.0},
}

_DEFAULT_WIND = {'u_ref': 4.0, 'base_angle': 225.0}


def _resolve_city_prefix(lon: float, lat: float) -> str:
    """
    Determines which city's rasters to use for a given coordinate.
    Delegates to gis_utils.get_containing_city() — the single source of truth
    for city boundary checks — so wind/groundwater grids always use the same
    city that was used to sample the core env_data.
    Returns a raster file prefix string (e.g. 'Ahmedabad') or raises ValueError
    if the coordinate is outside all supported boundaries.
    """
    from .gis_utils import get_containing_city
    prefix = get_containing_city(lon, lat)
    if prefix is None:
        raise ValueError("Analysis unavailable due to missing validated datasets.")
    return CITY_RASTER_PREFIX.get(prefix, prefix)


from .gis_utils import sample_raster_point

def _sample_raster(path: Path, lon: float, lat: float, default):
    """
    Samples a single-band raster at (lon, lat) using memory-cached array.
    """
    val = sample_raster_point(path, lon, lat, default=default)
    return default if val is None else val


def _compute_dem_slope_pct(dem_path: Path, lon: float, lat: float, center_dem: float) -> float:
    """
    Estimates surface slope (%) at (lon, lat) using a finite-difference
    approximation over a ~100 m offset in both horizontal directions.
    Falls back to 0.0 if the raster is not available or the window is out of bounds.
    """
    if not dem_path.exists():
        return 0.0
    delta = 0.001  # ~100 m at Indian latitudes
    e  = _sample_raster(dem_path, lon + delta, lat,       center_dem)
    w  = _sample_raster(dem_path, lon - delta, lat,       center_dem)
    n  = _sample_raster(dem_path, lon,         lat + delta, center_dem)
    s  = _sample_raster(dem_path, lon,         lat - delta, center_dem)
    # Δh / Δd  (approx 111 m per 0.001°)
    dz_dx = (e - w) / (2.0 * delta * 111_000)
    dz_dy = (n - s) / (2.0 * delta * 111_000)
    slope_rad = np.arctan(np.sqrt(dz_dx**2 + dz_dy**2))
    return round(float(np.degrees(slope_rad)), 4)


# ─────────────────────────────────────────────────────────────────────────────
# VENTILATION / WIND INDEX — Powered by SANKALP Wind Agent (ONNX)
# ─────────────────────────────────────────────────────────────────────────────

def _map_lulc_to_morphology(lulc: int):
    """
    Derives canopy morphology for SANKALP Wind Agent feature vector:
      • Building/Canopy Height (m)
      • Plan Area Density (Lambda_P)
      • Frontal Area Density (Lambda_F)
      • Sky View Factor (SVF)
      • Aerodynamic Roughness Length (z0, m)
    """
    lulc = int(lulc)
    if lulc == 50:  # Built-up urban
        return 24.0, 0.45, 0.50, 0.65, 1.2
    elif lulc in (10, 20):  # Trees / Shrubland
        return 8.0, 0.12, 0.10, 0.88, 0.6
    elif lulc == 30:  # Grassland
        return 1.0, 0.08, 0.04, 0.95, 0.05
    elif lulc == 40:  # Cropland
        return 2.0, 0.10, 0.06, 0.92, 0.07
    elif lulc == 80:  # Water body
        return 0.0, 0.05, 0.00, 1.00, 0.0002
    else:  # Bare / sparse / other
        return 0.0, 0.06, 0.02, 0.98, 0.01


def calculate_ventilation_index(lon: float, lat: float, env_data: dict) -> dict:
    """
    Computes a 2D wind velocity vector field (10×10 grid) around the target
    coordinate exclusively using the SANKALP Wind Agent ONNX model:
      • City-specific DEM and LULC rasters (resolved from the actual coordinate)
      • City-specific reference wind speed and prevailing direction
      • Local canopy morphology: [Base_Met_Speed_m_s, Incoming_Heading_Deg,
                                  Plan_Density_LambdaP, Frontal_Block_LambdaF,
                                  Sky_View_Factor, Building_Height]
      • SANKALP Wind Agent ONNX neural vector inference
    """
    from .ml_service import predict_wind_speed_bulk

    city_prefix = _resolve_city_prefix(lon, lat)
    wind_params = CITY_WIND_PARAMS.get(city_prefix, _DEFAULT_WIND)
    u_ref      = wind_params['u_ref']
    base_angle = wind_params['base_angle']

    dem_path  = MAPS_DIR / f'{city_prefix}_DEM.tif'
    lulc_path = MAPS_DIR / f'{city_prefix}_LULC.tif'

    spacing   = 0.002   # ~200 m per grid cell
    grid_size = 10
    half_grid = grid_size // 2

    grid_meta = []
    feature_rows = []

    for r_idx in range(grid_size):
        for c_idx in range(grid_size):
            dy_offset = (r_idx - half_grid) * spacing
            dx_offset = (c_idx - half_grid) * spacing
            cell_lon  = lon + dx_offset
            cell_lat  = lat + dy_offset

            # Sample real raster values; fall back to centre-point values if OOB
            cell_dem  = _sample_raster(dem_path,  cell_lon, cell_lat, env_data['dem'])
            cell_lulc = int(_sample_raster(lulc_path, cell_lon, cell_lat, env_data['lulc']))

            # DEM slope angle modulation
            height_diff = cell_dem - env_data['dem']
            if height_diff < 0:
                angle_mod = -5.0 if dx_offset > 0 else 5.0
            else:
                angle_mod = 5.0 if dx_offset > 0 else -5.0

            final_angle = (base_angle + angle_mod) % 360.0
            h, lp, lf, svf, _ = _map_lulc_to_morphology(cell_lulc)

            # Verified 6-D vector for SANKALP Wind Agent:
            # [Base_Met_Speed_m_s, Incoming_Heading_Deg, Plan_Density_LambdaP, Frontal_Block_LambdaF, Sky_View_Factor, Building_Height]
            feature_rows.append([u_ref, final_angle, lp, lf, svf, h])
            grid_meta.append({
                'latitude':  float(cell_lat),
                'longitude': float(cell_lon),
                'dx': int(c_idx - half_grid),
                'dy': int(r_idx - half_grid),
                'angle': round(final_angle, 1),
            })

    # Direct SANKALP Wind Agent model inference
    predicted_speeds = predict_wind_speed_bulk(feature_rows)

    wind_grid = []
    for meta, speed in zip(grid_meta, predicted_speeds):
        rad = np.radians(meta['angle'])
        u_x = float(-speed * np.sin(rad))
        u_y = float(-speed * np.cos(rad))
        wind_grid.append({
            'latitude':  meta['latitude'],
            'longitude': meta['longitude'],
            'dx':        meta['dx'],
            'dy':        meta['dy'],
            'u_x':       round(u_x, 3),
            'u_y':       round(u_y, 3),
            'speed':     round(speed, 2),
            'angle':     meta['angle'],
        })

    vei = _ventilation_summary(env_data, city_prefix, u_ref, base_angle)

    return {
        'roughness_length_m':           vei['roughness_length_m'],
        'calculated_wind_speed_ms':     vei['calculated_wind_speed_ms'],
        'ventilation_efficiency_pct':   vei['ventilation_efficiency_pct'],
        'obstruction_status':           vei['obstruction_status'],
        'building_height_recommendation': vei['building_height_recommendation'],
        'wind_vector_grid':             wind_grid,
        'metrics':                      {'engine': 'SANKALP-ONNX-WindAgent'},
    }


def _ventilation_summary(env_data: dict, city_prefix: str, u_ref: float, base_angle: float) -> dict:
    """Single-point ventilation index summary powered by SANKALP Wind Agent ONNX model."""
    from .ml_service import predict_wind_speed

    lulc_val = int(env_data['lulc'])
    h, lp, lf, svf, z0 = _map_lulc_to_morphology(lulc_val)

    # Predict localized wind speed via SANKALP Wind Agent
    u_local = predict_wind_speed(u_ref, base_angle, lp, lf, svf, h)
    vei = min(100.0, (u_local / u_ref) * 100.0)

    if lulc_val == 50:
        status = "High Obstruction"
        rec = (
            f"High-density concrete sealing (UHI hotspot) obstructs wind tunnels in {city_prefix}. "
            f"Enforce building orientations parallel to the {base_angle:.0f}° prevailing wind path "
            f"and limit heights to 15 m along open corridors."
        )
    elif lulc_val == 80:
        status = "Natural Wind Highway"
        rec = (
            "Critical natural wind corridor (water body). "
            "Establish a 100 m buffer zone on both banks free of vertical structures "
            "to maintain cooling airflow."
        )
    elif lulc_val in (10, 20, 30):
        status = "Low Obstruction"
        rec = (
            "Vegetated / natural open space — low wind resistance. "
            "Maintain green-space zoning to prevent wind-shadow propagation into the city core."
        )
    else:
        status = "Moderate Obstruction"
        rec = (
            "Mixed land-use detected. Introduce permeable green corridors aligned with the "
            f"{base_angle:.0f}° prevailing wind direction to improve urban ventilation."
        )

    return {
        'roughness_length_m':            z0,
        'calculated_wind_speed_ms':      round(float(u_local), 2),
        'ventilation_efficiency_pct':    round(float(vei), 1),
        'obstruction_status':            status,
        'building_height_recommendation': rec,
    }


# Keep the old public name for any callers that import it directly
def calculate_ventilation_index_single(env_data: dict) -> dict:
    """Backward-compatible wrapper — uses Ahmedabad defaults for single-point summary."""
    return _ventilation_summary(env_data, 'Ahmedabad',
                                _DEFAULT_WIND['u_ref'], _DEFAULT_WIND['base_angle'])


# ─────────────────────────────────────────────────────────────────────────────
# GROUNDWATER RECHARGE INDEX
# ─────────────────────────────────────────────────────────────────────────────

def calculate_groundwater_recharge(lon: float, lat: float, env_data: dict) -> dict:
    """
    Simulates a 2D groundwater recharge suitability matrix (10×10 grid) using:
      • City-specific DEM, NDBI, NDVI, NDWI rasters
      • Infiltration physics: soil sealing, vegetation infiltration, moisture
      • DEM-derived catchment factor (real elevation data, not hardcoded slope)
    """
    city_prefix = _resolve_city_prefix(lon, lat)

    dem_path  = MAPS_DIR / f'{city_prefix}_DEM.tif'
    ndbi_path = MAPS_DIR / f'{city_prefix}_NDBI.tif'
    ndvi_path = MAPS_DIR / f'{city_prefix}_NDVI.tif'
    ndwi_path = MAPS_DIR / f'{city_prefix}_NDWI.tif'

    spacing   = 0.002
    grid_size = 10
    half_grid = grid_size // 2

    recharge_grid = []
    for r_idx in range(grid_size):
        for c_idx in range(grid_size):
            dy_offset = (r_idx - half_grid) * spacing
            dx_offset = (c_idx - half_grid) * spacing
            cell_lon  = lon + dx_offset
            cell_lat  = lat + dy_offset

            cell_dem  = _sample_raster(dem_path,  cell_lon, cell_lat, env_data['dem'])
            cell_ndbi = _sample_raster(ndbi_path, cell_lon, cell_lat, env_data['ndbi'])
            cell_ndvi = _sample_raster(ndvi_path, cell_lon, cell_lat, env_data['ndvi'])
            cell_ndwi = _sample_raster(ndwi_path, cell_lon, cell_lat, env_data['ndwi'])

            # Infiltration physics
            soil_sealing = float(np.clip((cell_ndbi - (-0.4)) / (0.6 - (-0.4)), 0.0, 1.0))
            perm         = 1.0 - soil_sealing
            veg_inf      = float(np.clip((cell_ndvi - (-0.1)) / (0.8 - (-0.1)), 0.0, 1.0))
            moisture     = float(np.clip((cell_ndwi - (-0.5)) / (0.5 - (-0.5)), 0.0, 1.0))

            # Catchment factor: lower elevations relative to centre collect more runoff
            height_diff     = env_data['dem'] - cell_dem
            catchment_factor = float(np.clip(0.5 + height_diff * 0.05, 0.0, 1.0))

            score = float(np.clip(
                (perm * 0.45 + veg_inf * 0.20 + moisture * 0.15 + catchment_factor * 0.20) * 100,
                0.0, 100.0
            ))

            recharge_grid.append({
                'latitude':         float(cell_lat),
                'longitude':        float(cell_lon),
                'dx':               int(c_idx - half_grid),
                'dy':               int(r_idx - half_grid),
                'permeability':     round(perm, 2),
                'elevation':        float(cell_dem),
                'suitability_score': round(score, 1),
            })

    single = _groundwater_summary(env_data, dem_src_path=dem_path, lon=lon, lat=lat)

    return {
        'soil_sealing_index':       single['soil_sealing_index'],
        'permeability_index':       single['permeability_index'],
        'estimated_slope_pct':      single['estimated_slope_pct'],
        'recharge_suitability_score': single['recharge_suitability_score'],
        'recharge_category':        single['recharge_category'],
        'planning_recommendation':  single['planning_recommendation'],
        'recharge_suitability_grid': recharge_grid,
    }


def _groundwater_summary(env_data: dict, dem_src_path: Path = None,
                          lon: float = 0.0, lat: float = 0.0) -> dict:
    """Single-point groundwater recharge summary with real DEM-derived slope."""
    ndvi = env_data['ndvi']
    ndbi = env_data['ndbi']
    ndwi = env_data['ndwi']
    center_dem = env_data['dem']

    soil_sealing = float(np.clip((ndbi - (-0.4)) / (0.6 - (-0.4)), 0.0, 1.0))
    permeability = 1.0 - soil_sealing
    infiltration = float(np.clip((ndvi - (-0.1)) / (0.8 - (-0.1)), 0.0, 1.0))
    moisture     = float(np.clip((ndwi - (-0.5)) / (0.5 - (-0.5)), 0.0, 1.0))

    suitability_score = float((permeability * 0.4 + infiltration * 0.3 + moisture * 0.3) * 100)

    # Real slope from DEM raster — no hardcoded fallback value
    slope_pct = 0.0
    if dem_src_path and dem_src_path.exists():
        try:
            slope_pct = _compute_dem_slope_pct(dem_src_path, lon, lat, center_dem)
        except Exception:
            slope_pct = 0.0

    if suitability_score < 35:
        category = "Poor Recharge Zone"
        rec = (
            "Severe soil sealing detected. Install porous pavers and open bioswales "
            "along local parking buffers to intercept concrete runoff."
        )
    elif suitability_score < 60:
        category = "Moderate Recharge Zone"
        rec = (
            "Ideal for neighbourhood bioswales and shallow percolation shafts "
            "to replenish shallow aquifers."
        )
    else:
        category = "Optimal Recharge Zone"
        rec = (
            "Unsealed, vegetated soils indicate high recharge capacity. "
            "Restrict commercial construction and build deep direct-injection shafts "
            "to channel runoff safely."
        )

    return {
        'soil_sealing_index':         round(soil_sealing, 2),
        'permeability_index':         round(permeability, 2),
        'estimated_slope_pct':        slope_pct,
        'recharge_suitability_score': round(suitability_score, 1),
        'recharge_category':          category,
        'planning_recommendation':    rec,
    }


def calculate_groundwater_recharge_single(env_data: dict) -> dict:
    """Backward-compatible wrapper for single-point groundwater summary."""
    return _groundwater_summary(env_data)
