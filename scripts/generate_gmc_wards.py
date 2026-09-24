import json
import os
import sys
import numpy as np
from shapely.geometry import shape, Point, Polygon, MultiPoint, mapping
from shapely.ops import voronoi_diagram
from pathlib import Path

sys.path.append(os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uhi_backend.settings')

import django
django.setup()

from api.gis_utils import sample_environmental_data
from api.ml_service import predict_heat_zone

def build_gandhinagar_seamless_wards():
    base_dir = Path(__file__).resolve().parent
    boundary_path = base_dir / 'datasets' / 'boundary_gandhinagar.geojson'
    
    with open(boundary_path, 'r', encoding='utf-8') as f:
        boundary_data = json.load(f)
        
    boundary_geom = shape(boundary_data['features'][0]['geometry'])
    
    # Precise seed locations representing the official GMC Wards and administrative divisions
    gmc_ward_seeds = [
        {
            "id": 1,
            "name": "Ward 1 (Sectors 1-7)",
            "zone": "Capital Core West",
            "description": "Raj Bhavan, Vidhan Sabha, Secretariat, Mahatma Mandir, Sectors 1-7",
            "seed": (72.646, 23.218),
            "pop_base": 48000
        },
        {
            "id": 2,
            "name": "Ward 2 (Sectors 8-14)",
            "zone": "Capital Core Central",
            "description": "Civil Hospital, Town Hall, Central Library, GH/CH Road, Sectors 8-14",
            "seed": (72.636, 23.235),
            "pop_base": 52000
        },
        {
            "id": 3,
            "name": "Ward 3 (Sectors 15-21)",
            "zone": "Capital Core North",
            "description": "Akshardham Temple, GH Road, Pathikashram, Sectors 15-21",
            "seed": (72.650, 23.250),
            "pop_base": 49000
        },
        {
            "id": 4,
            "name": "Ward 4 (Sectors 22-28)",
            "zone": "Capital Core East",
            "description": "GIDC Electronic Estate, CH Road, Sector 24, 25, 26, 28",
            "seed": (72.670, 23.258),
            "pop_base": 56000
        },
        {
            "id": 5,
            "name": "Ward 5 (Sectors 29-30 & Pethapur)",
            "zone": "Northern Suburban",
            "description": "Sector 29, 30, Pethapur Nagar & Wooden Block Craft Hub",
            "seed": (72.660, 23.295),
            "pop_base": 47000
        },
        {
            "id": 6,
            "name": "Ward 6 (Vavol & Uvarsad)",
            "zone": "Western Growth Corridor",
            "description": "Vavol Railway Link, Uvarsad Knowledge Corridor & Karnavati Univ.",
            "seed": (72.585, 23.230),
            "pop_base": 43000
        },
        {
            "id": 7,
            "name": "Ward 7 (Kudasan & Randesan)",
            "zone": "Southern High-Density Zone",
            "description": "Kudasan Urban Commercial Hub, Randesan Riverfront Link",
            "seed": (72.635, 23.185),
            "pop_base": 61000
        },
        {
            "id": 8,
            "name": "Ward 8 (Raysan & GIFT Link)",
            "zone": "Sabarmati Institutional Zone",
            "description": "PDPU Road, Raysan Institutional Enclave & GIFT City Link",
            "seed": (72.665, 23.175),
            "pop_base": 45000
        },
        {
            "id": 9,
            "name": "Ward 9 (Sargasan & Infocity)",
            "zone": "IT & Innovation Corridor",
            "description": "Infocity, DA-IICT, TCS Garima Park, Sargasan Crossroad Hub",
            "seed": (72.605, 23.195),
            "pop_base": 58000
        },
        {
            "id": 10,
            "name": "Ward 10 (Koba & Nabhoi)",
            "zone": "Airport Metro Corridor",
            "description": "Koba Circle, GNLU, Metro Line 2 Corridor & NIFT",
            "seed": (72.628, 23.148),
            "pop_base": 42000
        },
        {
            "id": 11,
            "name": "Ward 11 (Bhat & Sughad)",
            "zone": "Southern Gateway",
            "description": "Bhat, Apollo Hospital Circle, Tapovan & Motera Link",
            "seed": (72.610, 23.118),
            "pop_base": 51000
        },
        {
            "id": 12,
            "name": "Chiloda & Eastern Belt",
            "zone": "Eastern Peripheral",
            "description": "Chiloda Circle, NH-48 Corridor, Sabarmati East Enclave",
            "seed": (72.740, 23.220),
            "pop_base": 38000
        },
        {
            "id": 13,
            "name": "Northern Sabarmati Belt",
            "zone": "Northern Peripheral",
            "description": "Alampur, Mahudi Link & Upper Sabarmati Basin",
            "seed": (72.740, 23.330),
            "pop_base": 34000
        },
        {
            "id": 14,
            "name": "Western Agro Belt",
            "zone": "Western Peripheral",
            "description": "Sertha, Khoraj & Adalaj Western Ecological Buffer",
            "seed": (72.550, 23.260),
            "pop_base": 29000
        }
    ]

    points = [Point(w["seed"]) for w in gmc_ward_seeds]
    mp = MultiPoint(points)
    
    # Compute Voronoi diagram expanded to the bounding envelope
    vor = voronoi_diagram(mp, envelope=boundary_geom.envelope.buffer(0.05))
    
    features = []
    
    for i, w in enumerate(gmc_ward_seeds):
        target_pt = Point(w["seed"])
        # Find corresponding voronoi polygon that contains this seed point
        matched_geom = None
        for g in vor.geoms:
            if g.contains(target_pt) or g.distance(target_pt) < 1e-5:
                matched_geom = g
                break
                
        if matched_geom is None:
            # Fallback to closest polygon
            matched_geom = min(vor.geoms, key=lambda g: g.distance(target_pt))
            
        # Clip against the exact official boundary of Gandhinagar
        ward_polygon = matched_geom.intersection(boundary_geom)
        if ward_polygon.is_empty:
            continue
            
        centroid = ward_polygon.centroid
        
        # Sample real environmental data from Gandhinagar GeoTIFF rasters
        env = sample_environmental_data(centroid.x, centroid.y)
        pred = predict_heat_zone(env)
        
        # Approximate area in km2 (1 deg lat ~ 111 km, 1 deg lon ~ 102 km in Gandhinagar)
        area_km2 = round(ward_polygon.area * (111.0 * 102.0), 2)
        pop_density = int(pred["pop_density"]) if pred["pop_density"] > 0 else int(w["pop_base"] / max(area_km2, 1))
        
        feature = {
            "type": "Feature",
            "id": w["id"],
            "geometry": mapping(ward_polygon),
            "properties": {
                "id": w["id"],
                "name": w["name"],
                "ward_name": w["name"],
                "zone": w["zone"],
                "description": w["description"],
                "area_km2": area_km2,
                "population": int(pop_density * area_km2),
                "density_per_km2": pop_density,
                "lst_avg_celsius": round(float(env["lst"]), 1),
                "ndvi_avg": round(float(env["ndvi"]), 3),
                "ndbi_avg": round(float(env["ndbi"]), 3),
                "ndwi_avg": round(float(env["ndwi"]), 3),
                "dem_m": int(env["dem"]),
                "lulc": int(env["lulc"]),
                "lulc_name": "Built-up (Urban)" if env["lulc"] == 50 else "Greenery / Vegetation" if env["lulc"] in [10,20,30,40] else "Open / Barren Land",
                "risk_score": round(pred["risk_score"], 1),
                "vulnerability": pred["risk_category"],
                "heat_zone": pred["heat_zone"],
                "confidence": round(pred["confidence"] * 100, 1),
                "pop_density": pop_density
            }
        }
        features.append(feature)
        print(f"Generated {w['name']}: {area_km2} km², LST {feature['properties']['lst_avg_celsius']}°C, Risk: {feature['properties']['risk_score']} ({feature['properties']['vulnerability']})")

    geojson_result = {
        "type": "FeatureCollection",
        "name": "gandhinagar_wards",
        "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
        "features": features
    }
    
    out_path = base_dir / 'datasets' / 'gandhinagar_wards.geojson'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(geojson_result, f, indent=2)
        
    print(f"\nSuccessfully saved {len(features)} seamless, contiguous wards covering 100% of Gandhinagar to {out_path}")

if __name__ == '__main__':
    build_gandhinagar_seamless_wards()
