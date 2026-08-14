import numpy as np
import os
import csv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / 'datasets' / 'cgwb_boreholes.csv'

def interpolate_borehole_layers(lat: float, lng: float):
    """
    Applies Inverse Distance Weighting (IDW) interpolation to estimate local
    lithology thicknesses from the CGWB Boreholes database.
    """
    if not CSV_PATH.exists():
        # Fallback values in case CSV is missing
        return {"clay": 3.5, "sand": 14.5, "basalt": 22.0}

    stations = []
    try:
        with open(CSV_PATH, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                stations.append({
                    "lat": float(row["latitude"]),
                    "lng": float(row["longitude"]),
                    "clay": float(row["clay_thickness"]),
                    "sand": float(row["sand_thickness"]),
                    "basalt": float(row["basalt_thickness"])
                })
    except Exception:
        return {"clay": 3.5, "sand": 14.5, "basalt": 22.0}

    if not stations:
        return {"clay": 3.5, "sand": 14.5, "basalt": 22.0}

    total_weight = 0.0
    weighted_clay = 0.0
    weighted_sand = 0.0
    weighted_basalt = 0.0

    for s in stations:
        # Distance calculation in degrees
        dist = np.sqrt((s["lat"] - lat)**2 + (s["lng"] - lng)**2)
        if dist < 0.0001:
            return {"clay": s["clay"], "sand": s["sand"], "basalt": s["basalt"]}
        
        weight = 1.0 / (dist ** 2)
        total_weight += weight
        weighted_clay += s["clay"] * weight
        weighted_sand += s["sand"] * weight
        weighted_basalt += s["basalt"] * weight

    return {
        "clay": weighted_clay / total_weight,
        "sand": weighted_sand / total_weight,
        "basalt": weighted_basalt / total_weight
    }

def reconstruct_geological_layers(lat: float, lng: float, grace_anomaly: float, dem: float, ndvi: float, ndwi: float):
    """
    Reconstructs geological subsurface layers dynamically based on CGWB borehole 
    logs IDW interpolation, adjusted for local NDVI/NDWI and GRACE indicators.
    """
    # 1. Run IDW interpolation
    borehole = interpolate_borehole_layers(lat, lng)
    
    # 2. Adjust clay thickness based on local NDVI/NDWI vegetation moisture sealing
    t1 = max(1.0, float(borehole["clay"] * (0.8 + ndvi * 0.4)))
    
    # 3. Adjust sand/gravel thickness based on moisture index (NDWI)
    t2 = max(2.0, float(borehole["sand"] * (0.8 + ndwi * 0.4)))
    
    # 4. Adjust fractured basalt target thickness based on local gravity anomaly deficits
    # Lower gravity anomalies (negative values) increase estimated fractured rock cavities.
    t3 = max(5.0, float(borehole["basalt"] * (1.0 - grace_anomaly / 100.0)))
    
    # 5. Impermeable Bedrock baseline
    t4 = 100.0  # Assumed thickness for visualization
    
    layers = [
        {
            "name": "Topsoil / Clay",
            "thickness": round(t1, 1),
            "depth_from": 0.0,
            "depth_to": round(t1, 1),
            "description": "Loose soil and clay layer. High sealing capacity, restricts vertical infiltration.",
            "color": "#854d0e" # Brown
        },
        {
            "name": "Sand & Gravel (Unconfined)",
            "thickness": round(t2, 1),
            "depth_from": round(t1, 1),
            "depth_to": round(t1 + t2, 1),
            "description": "High porosity sand/gravel deposits. Excellent transmission properties.",
            "color": "#eab308" # Yellowish
        },
        {
            "name": "Fractured Basalt (Target Zone)",
            "thickness": round(t3, 1),
            "depth_from": round(t1 + t2, 1),
            "depth_to": round(t1 + t2 + t3, 1),
            "description": "Porous basalt fracture zone. Primary drilling target for deep recharge shafts.",
            "color": "#10b981" # Emerald/Green (Target)
        },
        {
            "name": "Impermeable Bedrock",
            "thickness": round(t4, 1),
            "depth_from": round(t1 + t2 + t3, 1),
            "depth_to": round(t1 + t2 + t3 + t4, 1),
            "description": "Dense un-fractured bedrock. Prevents further downward seepage.",
            "color": "#64748b" # Grey
        }
    ]
    
    return layers


def calculate_recharge_suitability(ndvi: float, ndwi: float, dem: float, grace_anomaly: float, slope_pct: float = 2.5):
    """
    Calculates the recharge suitability score and estimated percolation metrics
    based on Darcy's Law and geophysics.
    """
    # 1. Slope Factor (weight 0.20): Flat terrain is better to prevent surface runoff.
    slope_factor = max(0.0, min(100.0, 100.0 * (1.0 - (slope_pct / 20.0))))
    
    # 2. Soil Permeability Factor (weight 0.35): High moisture index and low concrete sealing
    # are favorable.
    permeability_factor = max(0.0, min(100.0, 100.0 * (ndwi * 0.7 + (1.0 - ndvi) * 0.3)))
    
    # 3. Gravity Deficit Factor (weight 0.45): High gravity deficit (negative GRACE anomaly)
    # indicates empty/depleted underground aquifer voids requiring artificial recharge.
    # grace_anomaly ranges from -50.0 to +50.0
    gravity_deficit_factor = max(0.0, min(100.0, 100.0 * ((-grace_anomaly + 50.0) / 100.0)))
    
    # Final Weighted Suitability Score
    suitability_score = (
        slope_factor * 0.20 + 
        permeability_factor * 0.35 + 
        gravity_deficit_factor * 0.45
    )
    
    # Localized fracture density index
    fracture_density = min(1.0, max(0.0, -0.015 * grace_anomaly + 0.35 + ndwi * 0.2))
    
    # Darcy's Law: Q = -K * i * A
    # Estimate Hydraulic Conductivity K (m/day) from permeability factors
    k = max(0.1, float(ndwi * 15.0 + (1.0 - ndvi) * 5.0))
    # Estimate hydraulic gradient i from slope
    i = max(0.05, float(slope_pct / 100.0))
    # Estimated Recharge Rate per unit area (m3/day for a 20m diameter recharge well, Area ~ 314 m2)
    area = 314.16
    estimated_recharge_rate = max(10.0, float(k * i * area * (suitability_score / 100.0)))
    
    return {
        "suitability_score": round(suitability_score, 1),
        "estimated_recharge_rate_m3_day": round(estimated_recharge_rate, 1),
        "fracture_density_index": round(fracture_density, 2),
        "parameters": {
            "slope_factor": round(slope_factor, 1),
            "permeability_factor": round(permeability_factor, 1),
            "gravity_deficit_factor": round(gravity_deficit_factor, 1),
            "hydraulic_conductivity_k_m_day": round(k, 2),
            "hydraulic_gradient": round(i, 3)
        }
    }

def generate_optimal_recharge_sites(district: str, latitude: float, longitude: float, grace_anomaly: float, ndvi: float, ndwi: float, dem: float):
    """
    Generates a 6x6 spatial grid around the target coordinate, computes suitability
    for each cell, and returns the top 5 highest-scoring optimal recharge sites.
    """
    sites = []
    
    # Grid offset offsets (6x6)
    for idx_lat in range(-3, 3):
        for idx_lng in range(-3, 3):
            # Calculate coordinate offsets (~330m spacing)
            offset_lat = idx_lat * 0.003
            offset_lng = idx_lng * 0.003
            cell_lat = latitude + offset_lat
            cell_lng = longitude + offset_lng
            
            # Deterministic variation based on coordinates
            seed = int((cell_lat * 10000 + cell_lng * 10000) % 1000)
            np.random.seed(seed)
            
            # Simulate local elevation (DEM) changes (slopes)
            cell_dem = dem + (idx_lat * -2.4) + (idx_lng * 1.6) + np.random.uniform(-4, 4)
            # Calculated slope percentage relative to input DEM
            elevation_diff = abs(cell_dem - dem)
            slope_pct = min(15.0, (elevation_diff / 50.0) * 100.0)
            
            # Simulate local NDVI/NDWI shifts
            cell_ndvi = max(0.0, min(1.0, ndvi + np.random.uniform(-0.08, 0.08)))
            cell_ndwi = max(0.0, min(1.0, ndwi + np.random.uniform(-0.06, 0.06)))
            
            # Run suitability calculation
            metrics = calculate_recharge_suitability(cell_ndvi, cell_ndwi, cell_dem, grace_anomaly, slope_pct)
            
            # Reconstruct geological layers for target shaft depth
            layers = reconstruct_geological_layers(cell_lat, cell_lng, grace_anomaly, cell_dem, cell_ndvi, cell_ndwi)
            # Target shaft depth is depth to top of Fractured Basalt (end of Clay + Sand layers)
            shaft_depth = layers[1]["depth_to"]  # End of Sand / Gravel layer
            
            sites.append({
                "latitude": round(cell_lat, 5),
                "longitude": round(cell_lng, 5),
                "suitability_score": metrics["suitability_score"],
                "optimal_shaft_depth_m": round(shaft_depth, 1),
                "estimated_recharge_rate_m3_day": metrics["estimated_recharge_rate_m3_day"],
                "fracture_density": metrics["fracture_density_index"],
                "elevation_m": round(cell_dem, 1)
            })
            
    # Sort sites by suitability score descending
    sites.sort(key=lambda x: x["suitability_score"], reverse=True)
    
    # Return top 5 sites
    return sites[:5]
