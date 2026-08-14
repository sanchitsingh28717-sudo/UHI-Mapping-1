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

# 2. Other regions
other_regions_files = {
    "Gandhinagar": "boundary_gandhinagar.geojson",
    "Delhi": "boundary_delhi.geojson",
    "Mumbai_City": "boundary_mumbai_city.geojson",
    "Mumbai_Suburban": "boundary_mumbai_suburban.geojson",
    "Thane": "boundary_thane.geojson",
    "Mumbai_Metro": "boundary_mumbai_metro.geojson"
}

for prefix, filename in other_regions_files.items():
    filepath = BASE_DIR / 'datasets' / filename
    if filepath.exists():
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                _data = json.load(f)
            CITY_BOUNDARIES[prefix] = shape(_data["features"][0]["geometry"])
        except Exception as e:
            print(f"Error loading boundary for {prefix}: {e}")

# Search order prioritizing smaller administrative boundaries over the larger metro boundary
CHECK_ORDER = ["Ahmedabad", "Gandhinagar", "Delhi", "Mumbai_City", "Mumbai_Suburban", "Thane", "Mumbai_Metro"]

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

def sample_environmental_data(lon, lat):
    """
    Samples environmental indicators dynamically from the correct city's GeoTIFFs.
    """
    city_prefix = get_containing_city(lon, lat)
    if not city_prefix:
        raise ValueError("Analysis unavailable due to missing validated datasets.")
        
    results = {}
    
    for key, filename_suffix in TIFF_FILES.items():
        # Resolve path using the containing city's prefix
        # e.g., Ahmedabad_DEM.tif -> Delhi_DEM.tif
        suffix_part = filename_suffix.split('_', 1)[1]
        filename = f"{city_prefix}_{suffix_part}"
        filepath = MAPS_DIR / filename
        
        if not filepath.exists():
            # Fallback to the default Ahmedabad file in case city specific file is missing
            filepath = MAPS_DIR / filename_suffix
            if not filepath.exists():
                raise ValueError("Analysis unavailable due to missing validated datasets.")
            
        with rasterio.open(filepath) as src:
            row, col = src.index(lon, lat)
            try:
                val = src.read(1)[row, col]
            except IndexError:
                raise ValueError("Analysis unavailable due to missing validated datasets.")
                
            if np.isnan(val) or val == src.nodata:
                raise ValueError("Analysis unavailable due to missing validated datasets.")
                
            if isinstance(val, (np.integer, np.int8, np.int16, np.int32, np.int64, np.uint8, np.uint16, np.uint32, np.uint64)):
                results[key] = int(val)
            elif isinstance(val, (np.floating, np.float32, np.float64)):
                results[key] = float(val)
            else:
                results[key] = val
                
    required_keys = ['dem', 'lst', 'lulc', 'ndbi', 'ndvi', 'ndwi']
    if not all(k in results for k in required_keys):
         raise ValueError("Analysis unavailable due to missing validated datasets.")
         
    return results

def get_heat_zones_grid_cached(city_prefix='Ahmedabad'):
    """
    Dynamically generates a regularly spaced 35x35 grid of UHI heat zones covering the bounding box
    of the selected city.
    """
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
    
    with rasterio.open(lst_path) as src:
        data = src.read(1)
        for lon in lons:
            for lat in lats:
                pt = Point(lon, lat)
                if boundary_geom.contains(pt):
                    row, col = src.index(lon, lat)
                    try:
                        val = data[row, col]
                        if not np.isnan(val) and val != src.nodata and val > 0:
                            lst_val = float(val)
                            # Classify heat zones dynamically based on average values
                            if lst_val < 32.5:
                                zone = "Low Heat Zone"
                            elif lst_val < 35.5:
                                zone = "Medium Heat Zone"
                            else:
                                zone = "High Heat Zone"
                                
                            grid_points.append({
                                'latitude': float(lat),
                                'longitude': float(lon),
                                'lst': round(lst_val, 2),
                                'heat_zone': zone
                            })
                    except IndexError:
                        pass
                        
    return grid_points

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
