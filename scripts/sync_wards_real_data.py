import json
import os
import sys

sys.path.append(os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uhi_backend.settings')

import django
django.setup()

from shapely.geometry import shape
from api.gis_utils import sample_environmental_data
from api.ml_service import predict_heat_zone

def sync_all_wards():
    cities = [
        ('ahmedabad_wards.geojson', 'Ahmedabad'),
        ('gandhinagar_wards.geojson', 'Gandhinagar')
    ]
    
    datasets_dir = os.path.join(os.path.dirname(__file__), 'datasets')
    
    for city_file, city_name in cities:
        path = os.path.join(datasets_dir, city_file)
        if not os.path.exists(path):
            print(f"File not found: {path}")
            continue
            
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        updated = 0
        total = len(data.get('features', []))
        
        for feat in data.get('features', []):
            geom = shape(feat['geometry'])
            centroid = geom.centroid
            lon, lat = centroid.x, centroid.y
            props = feat['properties']
            
            env = None
            for pt in [centroid, geom.representative_point()]:
                try:
                    env = sample_environmental_data(pt.x, pt.y)
                    break
                except Exception:
                    continue
                    
            if env:
                pred = predict_heat_zone(env)
                props['lst_avg_celsius'] = round(float(env['lst']), 1)
                props['ndvi_avg'] = round(float(env['ndvi']), 3)
                props['ndbi_avg'] = round(float(env['ndbi']), 3)
                props['ndwi_avg'] = round(float(env['ndwi']), 3)
                props['dem_m'] = int(env['dem'])
                props['lulc'] = int(env['lulc'])
                props['lulc_name'] = 'Built-up (Urban)' if env['lulc'] == 50 else 'Greenery / Vegetation' if env['lulc'] in [10,20,30,40] else 'Water Body' if env['lulc'] == 80 else 'Open / Barren Land'
                props['risk_score'] = round(pred['risk_score'], 1)
                props['vulnerability'] = pred['risk_category']
                props['heat_zone'] = pred['heat_zone']
                props['confidence'] = round(pred['confidence'] * 100, 1)
                props['pop_density'] = pred['pop_density']
                updated += 1
            else:
                print(f"Failed to sample data for ward: {props.get('name')}")
                
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
            
        print(f"Successfully synchronized {updated}/{total} wards in {city_file} with 100% real AI model and raster data.")

if __name__ == '__main__':
    sync_all_wards()
