import numpy as np
import rasterio
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MAPS_DIR = BASE_DIR.parent / 'AI_UH_Python' / 'maps'

def calculate_ventilation_index(lon, lat, env_data):
    """
    Computes a 2D wind velocity vector field (10x10 grid) around the target coordinate
    incorporating local DEM slope gradients and LULC roughness heights.
    """
    # Grid spacing (approx 200m per grid cell)
    spacing = 0.002
    grid_size = 10
    half_grid = grid_size // 2
    
    wind_grid = []
    u_ref = 4.2       # Reference wind speed in m/s
    base_angle = 240.0 # Base monsoon wind direction (South-West) in degrees
    
    dem_path = MAPS_DIR / 'Ahmedabad_DEM.tif'
    lulc_path = MAPS_DIR / 'Ahmedabad_LULC.tif'
    
    # Pre-open raster files to sample local surroundings
    dem_src = rasterio.open(dem_path) if dem_path.exists() else None
    lulc_src = rasterio.open(lulc_path) if lulc_path.exists() else None
    
    try:
        for r_idx in range(grid_size):
            for c_idx in range(grid_size):
                # Calculate local coordinates
                dy_offset = (r_idx - half_grid) * spacing
                dx_offset = (c_idx - half_grid) * spacing
                cell_lon = lon + dx_offset
                cell_lat = lat + dy_offset
                
                # Default indicators if file reading fails
                cell_dem = env_data['dem']
                cell_lulc = env_data['lulc']
                
                if dem_src:
                    try:
                        row, col = dem_src.index(cell_lon, cell_lat)
                        val = dem_src.read(1)[row, col]
                        if not np.isnan(val) and val != dem_src.nodata:
                            cell_dem = float(val)
                    except IndexError:
                        pass
                
                if lulc_src:
                    try:
                        row, col = lulc_src.index(cell_lon, cell_lat)
                        val = lulc_src.read(1)[row, col]
                        if not np.isnan(val) and val != lulc_src.nodata:
                            cell_lulc = int(val)
                    except IndexError:
                        pass
                
                # Compute drag roughness z0
                roughness_lengths = {50: 1.2, 10: 0.6, 20: 0.1, 30: 0.05, 40: 0.07, 60: 0.01, 80: 0.0002}
                z0 = roughness_lengths.get(cell_lulc, 0.1)
                
                # Solve log wind profile
                z_street = 2.0
                z_ref = 10.0
                if z0 >= z_street:
                    speed = u_ref * 0.15
                else:
                    speed = u_ref * (np.log(z_street / z0) / np.log(z_ref / z0))
                
                # Slope effect: local height gradient modifies speed and vectors
                # Compute simple numerical slopes from neighboring cells in loop
                slope_acceleration = 1.0
                local_angle_mod = 0.0
                
                # Check height difference with center coordinate
                height_diff = cell_dem - env_data['dem']
                if height_diff < 0:
                    # Downdraft / downslope acceleration
                    slope_acceleration += min(abs(height_diff) * 0.02, 0.3)
                    local_angle_mod = -5.0 if dx_offset > 0 else 5.0
                else:
                    # Updraft / resistance
                    slope_acceleration -= min(height_diff * 0.015, 0.2)
                    local_angle_mod = 5.0 if dx_offset > 0 else -5.0
                
                final_speed = float(max(speed * slope_acceleration, 0.2))
                final_angle = (base_angle + local_angle_mod) % 360.0
                
                # Convert wind vectors to components (u_x, u_y)
                rad = np.radians(final_angle)
                # Wind direction is where wind blows FROM; vector is where it goes TO
                u_x = float(-final_speed * np.sin(rad))
                u_y = float(-final_speed * np.cos(rad))
                
                wind_grid.append({
                    'latitude': float(cell_lat),
                    'longitude': float(cell_lon),
                    'dx': int(c_idx - half_grid),
                    'dy': int(r_idx - half_grid),
                    'u_x': round(u_x, 3),
                    'u_y': round(u_y, 3),
                    'speed': round(final_speed, 2),
                    'angle': round(final_angle, 1)
                })
    finally:
        if dem_src: dem_src.close()
        if lulc_src: lulc_src.close()

    # Core point summaries
    vei = calculate_ventilation_index_single(env_data)
    
    return {
        'roughness_length_m': vei['roughness_length_m'],
        'calculated_wind_speed_ms': vei['calculated_wind_speed_ms'],
        'ventilation_efficiency_pct': vei['ventilation_efficiency_pct'],
        'obstruction_status': vei['obstruction_status'],
        'building_height_recommendation': vei['building_height_recommendation'],
        'wind_vector_grid': wind_grid
    }

def calculate_ventilation_index_single(env_data):
    dem_val = env_data['dem']
    lulc_val = env_data['lulc']
    roughness_lengths = {50: 1.2, 10: 0.6, 20: 0.1, 30: 0.05, 40: 0.07, 60: 0.01, 80: 0.0002}
    z0 = roughness_lengths.get(lulc_val, 0.1)
    u_ref = 4.2
    z_ref = 10.0
    z_street = 2.0
    
    if z0 >= z_street:
        u_street = u_ref * 0.15
    else:
        u_street = u_ref * (np.log(z_street / z0) / np.log(z_ref / z0))
    vei = (u_street / u_ref) * 100
    
    if lulc_val == 50:
        rec = "High-density concrete sealing (UHI hotspots) obstructs wind tunnels. Enforce building orientations parallel to the 240° South-West monsoon path and limit heights to 15m along open corridors."
        status = "High Obstruction"
    elif lulc_val == 80:
        rec = "Critical natural wind highway corridor. Establish a 100-meter buffer zone on both riverbanks free of vertical concrete structures to maintain cooling winds."
        status = "Natural Wind Highway"
    else:
        rec = "Maintain agricultural/natural open-space zoning offsets to prevent wind shadow propagation into the city center."
        status = "Low Obstruction"
        
    return {
        'roughness_length_m': z0,
        'calculated_wind_speed_ms': round(float(u_street), 2),
        'ventilation_efficiency_pct': round(float(vei), 1),
        'obstruction_status': status,
        'building_height_recommendation': rec
    }

def calculate_groundwater_recharge(lon, lat, env_data):
    """
    Simulates a 2D groundwater recharge suitability index matrix (10x10 grid)
    based on NDBI permeability, NDVI vegetation buffers, and DEM slopes.
    """
    spacing = 0.002
    grid_size = 10
    half_grid = grid_size // 2
    
    recharge_grid = []
    
    dem_path = MAPS_DIR / 'Ahmedabad_DEM.tif'
    ndbi_path = MAPS_DIR / 'Ahmedabad_NDBI.tif'
    ndvi_path = MAPS_DIR / 'Ahmedabad_NDVI.tif'
    ndwi_path = MAPS_DIR / 'Ahmedabad_NDWI.tif'
    
    # Open rasters
    dem_src = rasterio.open(dem_path) if dem_path.exists() else None
    ndbi_src = rasterio.open(ndbi_path) if ndbi_path.exists() else None
    ndvi_src = rasterio.open(ndvi_path) if ndvi_path.exists() else None
    ndwi_src = rasterio.open(ndwi_path) if ndwi_path.exists() else None
    
    try:
        for r_idx in range(grid_size):
            for c_idx in range(grid_size):
                dy_offset = (r_idx - half_grid) * spacing
                dx_offset = (c_idx - half_grid) * spacing
                cell_lon = lon + dx_offset
                cell_lat = lat + dy_offset
                
                # Defaults
                cell_dem = env_data['dem']
                cell_ndbi = env_data['ndbi']
                cell_ndvi = env_data['ndvi']
                cell_ndwi = env_data['ndwi']
                
                # Fetch local values
                if dem_src:
                    try:
                        row, col = dem_src.index(cell_lon, cell_lat)
                        val = dem_src.read(1)[row, col]
                        if not np.isnan(val) and val != dem_src.nodata: cell_dem = float(val)
                    except IndexError: pass
                if ndbi_src:
                    try:
                        row, col = ndbi_src.index(cell_lon, cell_lat)
                        val = ndbi_src.read(1)[row, col]
                        if not np.isnan(val) and val != ndbi_src.nodata: cell_ndbi = float(val)
                    except IndexError: pass
                if ndvi_src:
                    try:
                        row, col = ndvi_src.index(cell_lon, cell_lat)
                        val = ndvi_src.read(1)[row, col]
                        if not np.isnan(val) and val != ndvi_src.nodata: cell_ndvi = float(val)
                    except IndexError: pass
                if ndwi_src:
                    try:
                        row, col = ndwi_src.index(cell_lon, cell_lat)
                        val = ndwi_src.read(1)[row, col]
                        if not np.isnan(val) and val != ndwi_src.nodata: cell_ndwi = float(val)
                    except IndexError: pass
                
                # Run infiltration physics-equations
                soil_sealing = np.clip((cell_ndbi - (-0.4)) / (0.6 - (-0.4)), 0.0, 1.0)
                perm = 1.0 - soil_sealing
                veg_inf = np.clip((cell_ndvi - (-0.1)) / (0.8 - (-0.1)), 0.0, 1.0)
                moisture = np.clip((cell_ndwi - (-0.5)) / (0.5 - (-0.5)), 0.0, 1.0)
                
                # Calculate relative catchment factor (lower elevations gather runoff)
                height_diff = env_data['dem'] - cell_dem
                catchment_factor = np.clip(0.5 + (height_diff * 0.05), 0.0, 1.0)
                
                # Suitability score (0 to 100)
                score = (perm * 0.45 + veg_inf * 0.20 + moisture * 0.15 + catchment_factor * 0.20) * 100
                score = float(np.clip(score, 0.0, 100.0))
                
                recharge_grid.append({
                    'latitude': float(cell_lat),
                    'longitude': float(cell_lon),
                    'dx': int(c_idx - half_grid),
                    'dy': int(r_idx - half_grid),
                    'permeability': round(float(perm), 2),
                    'elevation': float(cell_dem),
                    'suitability_score': round(score, 1)
                })
    finally:
        if dem_src: dem_src.close()
        if ndbi_src: ndbi_src.close()
        if ndvi_src: ndvi_src.close()
        if ndwi_src: ndwi_src.close()
        
    single_data = calculate_groundwater_recharge_single(env_data)
    
    return {
        'soil_sealing_index': single_data['soil_sealing_index'],
        'permeability_index': single_data['permeability_index'],
        'estimated_slope_pct': single_data['estimated_slope_pct'],
        'recharge_suitability_score': single_data['recharge_suitability_score'],
        'recharge_category': single_data['recharge_category'],
        'planning_recommendation': single_data['planning_recommendation'],
        'recharge_suitability_grid': recharge_grid
    }

def calculate_groundwater_recharge_single(env_data):
    ndvi = env_data['ndvi']
    ndbi = env_data['ndbi']
    ndwi = env_data['ndwi']
    
    soil_sealing = np.clip((ndbi - (-0.4)) / (0.6 - (-0.4)), 0.0, 1.0)
    permeability = 1.0 - soil_sealing
    infiltration = np.clip((ndvi - (-0.1)) / (0.8 - (-0.1)), 0.0, 1.0)
    moisture = np.clip((ndwi - (-0.5)) / (0.5 - (-0.5)), 0.0, 1.0)
    
    suitability_score = float((permeability * 0.4 + infiltration * 0.3 + moisture * 0.3) * 100)
    
    if suitability_score < 35:
        category = "Poor Recharge Zone"
        rec = "Severe soil sealing detected. Install porous pavers and open bioswales along local parking buffers to intercept concrete runoff."
    elif suitability_score < 60:
        category = "Moderate Recharge Zone"
        rec = "Ideal for neighborhood bioswales and shallow percolation shafts to replenish shallow aquifers."
    else:
        category = "Optimal Recharge Zone"
        rec = "Unsealed, vegetated soils indicate high recharge capacity. Restrict all commercial construction here and build deep direct-injection shafts to channel runoff safely."

    return {
        'soil_sealing_index': round(float(soil_sealing), 2),
        'permeability_index': round(float(permeability), 2),
        'estimated_slope_pct': 0.85, # baseline flat slope
        'recharge_suitability_score': round(suitability_score, 1),
        'recharge_category': category,
        'planning_recommendation': rec
    }
