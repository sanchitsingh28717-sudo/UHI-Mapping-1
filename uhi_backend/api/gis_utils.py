import os
import json
import rasterio
import numpy as np
from pathlib import Path
from shapely.geometry import Point, Polygon, shape

BASE_DIR = Path(__file__).resolve().parent.parent
MAPS_DIR = BASE_DIR.parent / 'AI_UH_Python' / 'maps'
GEOJSON_BOUNDARY_PATH = BASE_DIR / 'datasets' / 'OSMB-79e8628a31d52c5611d9359b05a202110159b8fc.geojson'

TIFF_FILES = {
    'dem': 'Ahmedabad_DEM.tif',
    'lst': 'Ahmedabad_LST.tif',
    'lulc': 'Ahmedabad_LULC.tif',
    'ndbi': 'Ahmedabad_NDBI.tif',
    'ndvi': 'Ahmedabad_NDVI.tif',
    'ndwi': 'Ahmedabad_NDWI.tif',
}


# Fallback boundary polygon trace in case GeoJSON is missing
AHMEDABAD_AMC_FALLBACK = [
    (72.485, 23.025), (72.478, 23.010), (72.465, 23.002), (72.460, 22.985), 
    (72.468, 22.970), (72.482, 22.958), (72.505, 22.955), (72.520, 22.942), 
    (72.535, 22.930), (72.548, 22.915), (72.565, 22.905), (72.585, 22.902), 
    (72.602, 22.910), (72.620, 22.918), (72.632, 22.930), (72.645, 22.945), 
    (72.658, 22.952), (72.668, 22.965), (72.678, 22.980), (72.685, 23.000), 
    (72.690, 23.020), (72.685, 23.035), (72.678, 23.050), (72.682, 23.062), 
    (72.675, 23.078), (72.662, 23.090), (72.648, 23.105), (72.635, 23.118), 
    (72.615, 23.125), (72.595, 23.122), (72.580, 23.132), (72.562, 23.135), 
    (72.545, 23.128), (72.530, 23.120), (72.518, 23.102), (72.508, 23.088), 
    (72.495, 23.072), (72.502, 23.058), (72.498, 23.045), (72.485, 23.025)
]

# Load boundaries of all supported regions
CITY_BOUNDARIES = {}

# 1. Ahmedabad
ahm_path = GEOJSON_BOUNDARY_PATH
if ahm_path.exists():
    try:
        with open(ahm_path, 'r', encoding='utf-8') as f:
            _boundary_data = json.load(f)
        CITY_BOUNDARIES["Ahmedabad"] = shape(_boundary_data["features"][0]["geometry"])
    except Exception:
        CITY_BOUNDARIES["Ahmedabad"] = Polygon(AHMEDABAD_AMC_FALLBACK)
else:
    CITY_BOUNDARIES["Ahmedabad"] = Polygon(AHMEDABAD_AMC_FALLBACK)

# 2. Gandhinagar
gandhi_path = BASE_DIR / 'datasets' / 'boundary_gandhinagar.geojson'
if gandhi_path.exists():
    try:
        with open(gandhi_path, 'r', encoding='utf-8') as f:
            _data = json.load(f)
        CITY_BOUNDARIES["Gandhinagar"] = shape(_data["features"][0]["geometry"])
    except Exception as e:
        print(f"Error loading boundary for Gandhinagar: {e}")

# Search order prioritizing Ahmedabad and Gandhinagar
CHECK_ORDER = ["Ahmedabad", "Gandhinagar"]

def get_containing_city(lon, lat):
    pt = Point(lon, lat)
    for prefix in CHECK_ORDER:
        if prefix in CITY_BOUNDARIES and CITY_BOUNDARIES[prefix].contains(pt):
            return prefix
    return None

def is_within_ahmedabad(lon, lat):
    """
    Keep for backward compatibility and test cases.
    """
    pt = Point(lon, lat)
    return CITY_BOUNDARIES["Ahmedabad"].contains(pt)

_RASTER_DATA_CACHE: dict = {}

def get_raster_data(filepath: Path):
    path_str = str(filepath)
    if path_str not in _RASTER_DATA_CACHE:
        if not filepath.exists():
            _RASTER_DATA_CACHE[path_str] = None
        else:
            try:
                with rasterio.open(filepath) as src:
                    arr = src.read(1)
                    transform = src.transform
                    nodata = src.nodata
                    _RASTER_DATA_CACHE[path_str] = (arr, transform, nodata)
            except Exception:
                _RASTER_DATA_CACHE[path_str] = None
    return _RASTER_DATA_CACHE[path_str]

def sample_raster_point(filepath: Path, lon: float, lat: float, default=None):
    raster_info = get_raster_data(filepath)
    if raster_info is None:
        return default
    arr, transform, nodata = raster_info
    try:
        inv_transform = ~transform
        col_f, row_f = inv_transform * (lon, lat)
        row, col = int(np.floor(row_f)), int(np.floor(col_f))
        if 0 <= row < arr.shape[0] and 0 <= col < arr.shape[1]:
            val = arr[row, col]
            if np.isnan(val) or (nodata is not None and val == nodata):
                return default
            if isinstance(val, (np.integer, np.int8, np.int16, np.int32, np.int64, np.uint8, np.uint16, np.uint32, np.uint64)):
                return int(val)
            return float(val)
        return default
    except Exception:
        return default

def sample_environmental_data(lon, lat):
    """
    Samples environmental indicators dynamically from the correct city's GeoTIFFs with memory caching.
    """
    city_prefix = get_containing_city(lon, lat)
    if not city_prefix:
        raise ValueError("Analysis unavailable due to missing validated datasets.")
        
    results = {}
    
    for key, filename_suffix in TIFF_FILES.items():
        suffix_part = filename_suffix.split('_', 1)[1]
        filename = f"{city_prefix}_{suffix_part}"
        filepath = MAPS_DIR / filename
        
        if not filepath.exists():
            filepath = MAPS_DIR / filename_suffix
            if not filepath.exists():
                raise ValueError("Analysis unavailable due to missing validated datasets.")
            
        val = sample_raster_point(filepath, lon, lat, default=None)
        if val is None:
            raise ValueError("Analysis unavailable due to missing validated datasets.")
        results[key] = val
                
    required_keys = ['dem', 'lst', 'lulc', 'ndbi', 'ndvi', 'ndwi']
    if not all(k in results for k in required_keys):
         raise ValueError("Analysis unavailable due to missing validated datasets.")
         
    return results

_HEAT_ZONES_CACHE: dict = {}
CACHE_DIR = BASE_DIR / 'cache'

def get_heat_zones_grid_cached(city_prefix='Ahmedabad'):
    """
    Dynamically generates a regularly spaced 35x35 grid of UHI heat zones covering the bounding box
    of the selected city, and caches both in-memory and on-disk for instantaneous responses.
    """
    global _HEAT_ZONES_CACHE
    # Ensure correct format matching file prefix
    if city_prefix not in CITY_BOUNDARIES:
        # Fallback mapping
        mapped_prefixes = {
            'ahmedabad': 'Ahmedabad',
            'gandhinagar': 'Gandhinagar',
            'delhi': 'Delhi',
            'mumbai_city': 'Mumbai_City',
            'mumbai_suburban': 'Mumbai_Suburban',
            'thane': 'Thane',
            'mumbai_metro': 'Mumbai_Metro'
        }
        city_prefix = mapped_prefixes.get(city_prefix.lower(), 'Ahmedabad')

    if city_prefix in _HEAT_ZONES_CACHE and len(_HEAT_ZONES_CACHE[city_prefix]) > 0:
        return _HEAT_ZONES_CACHE[city_prefix]

    # Check disk cache
    cache_file = CACHE_DIR / f"heat_zones_{city_prefix.lower()}.json"
    if cache_file.exists():
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if data and len(data) > 0:
                _HEAT_ZONES_CACHE[city_prefix] = data
                return data
        except Exception:
            pass
        
    lst_filename = f"{city_prefix}_LST.tif"
    lst_path = MAPS_DIR / lst_filename
    if not lst_path.exists():
        # Fallback
        lst_path = MAPS_DIR / 'Ahmedabad_LST.tif'
        city_prefix = 'Ahmedabad'
        if not lst_path.exists():
            return []
            
    boundary_geom = CITY_BOUNDARIES.get(city_prefix)
    if not boundary_geom:
        return []
        
    bounds = boundary_geom.bounds
    grid_points = []
    
    lons = np.linspace(bounds[0], bounds[2], 35)
    lats = np.linspace(bounds[1], bounds[3], 35)
    
    # Load all raster bands needed by the model for this city
    ndvi_path = MAPS_DIR / f"{city_prefix}_NDVI.tif"
    ndbi_path = MAPS_DIR / f"{city_prefix}_NDBI.tif"
    ndwi_path = MAPS_DIR / f"{city_prefix}_NDWI.tif"
    dem_path  = MAPS_DIR / f"{city_prefix}_DEM.tif"
    lulc_path = MAPS_DIR / f"{city_prefix}_LULC.tif"

    def _open(p):
        return rasterio.open(p) if p.exists() else None

    lst_src  = rasterio.open(lst_path)
    ndvi_src = _open(ndvi_path)
    ndbi_src = _open(ndbi_path)
    ndwi_src = _open(ndwi_path)
    dem_src  = _open(dem_path)
    lulc_src = _open(lulc_path)

    def _read(src, lon, lat, default):
        if src is None:
            return default
        try:
            r, c = src.index(lon, lat)
            v = src.read(1)[r, c]
            return float(v) if not np.isnan(v) and v != src.nodata else default
        except Exception:
            return default

    from shapely.prepared import prep
    prep_geom = prep(boundary_geom)

    # Collect all valid grid points and their raster values
    batch_features = []
    try:
        lst_data = lst_src.read(1)
        for lon in lons:
            for lat in lats:
                pt = Point(lon, lat)
                if not prep_geom.contains(pt):
                    continue
                try:
                    row, col = lst_src.index(lon, lat)
                    lst_val  = lst_data[row, col]
                    if np.isnan(lst_val) or lst_val == lst_src.nodata or lst_val <= 0:
                        continue
                    lst_val = float(lst_val)
                except IndexError:
                    continue

                batch_features.append({
                    'lat':  float(lat),
                    'lon':  float(lon),
                    'lst':  lst_val,
                    'ndvi': _read(ndvi_src, lon, lat, 0.15),
                    'ndbi': _read(ndbi_src, lon, lat, 0.05),
                    'ndwi': _read(ndwi_src, lon, lat, -0.10),
                    'dem':  _read(dem_src,  lon, lat, 50.0),
                    'lulc': _read(lulc_src, lon, lat, 50.0),
                })
    finally:
        lst_src.close()
        for s in [ndvi_src, ndbi_src, ndwi_src, dem_src, lulc_src]:
            if s:
                s.close()

    # Batch-classify using the SANKALP v4 ONNX model — single source of truth
    from .ml_service import predict_heat_zone_bulk
    results = predict_heat_zone_bulk(batch_features)
    _HEAT_ZONES_CACHE[city_prefix] = results
    return results

def validate_uploaded_dataset(filepath, file_type):
    """
    Validates uploaded spatial and CSV datasets for CRS, geometry, attributes.
    """
    validation_result = {
        'status': 'VALIDATED',
        'crs': 'Unknown',
        'geometry_type': 'N/A',
        'error_message': None,
        'metadata': {}
    }
    
    try:
        if file_type == 'TIFF':
            with rasterio.open(filepath) as src:
                validation_result['crs'] = str(src.crs or 'None')
                validation_result['metadata'] = {
                    'width': src.width,
                    'height': src.height,
                    'bounds': list(src.bounds),
                    'count': src.count
                }
                if not src.crs:
                    raise ValueError("Missing Coordinate Reference System (CRS).")
                    
        elif file_type == 'GEOJSON':
            import geopandas as gpd
            gdf = gpd.read_file(filepath)
            validation_result['crs'] = str(gdf.crs or 'EPSG:4326')
            validation_result['geometry_type'] = str(gdf.geom_type.unique().tolist())
            validation_result['metadata'] = {
                'features_count': len(gdf),
                'columns': list(gdf.columns)
            }
            if gdf.empty:
                raise ValueError("GeoJSON vector dataset is empty.")
                
        elif file_type == 'CSV':
            import pandas as pd
            df = pd.read_csv(filepath)
            validation_result['metadata'] = {
                'rows': len(df),
                'columns': list(df.columns)
            }
            coord_cols = [c for c in df.columns if c.lower() in ['lat', 'latitude', 'lon', 'longitude', 'x', 'y']]
            if len(coord_cols) < 2:
                raise ValueError("CSV lacks coordinate columns (latitude/longitude).")
                
        elif file_type == 'SHAPEFILE':
            import geopandas as gpd
            gdf = gpd.read_file(f"zip://{filepath}")
            validation_result['crs'] = str(gdf.crs or 'None')
            validation_result['geometry_type'] = str(gdf.geom_type.unique().tolist())
            validation_result['metadata'] = {
                'features_count': len(gdf),
                'columns': list(gdf.columns)
            }
            if not gdf.crs:
                raise ValueError("Missing Shapefile Coordinate Reference System.")
                
    except Exception as e:
        validation_result['status'] = 'FAILED'
        validation_result['error_message'] = str(e)
        
    return validation_result
