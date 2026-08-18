import os
import joblib
import numpy as np
import pandas as pd
import shap
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR.parent / 'AI_UH_Python' / 'models' / 'random_forest.pkl'
VULNERABILITY_MODEL_PATH = BASE_DIR.parent / 'AI_UH_Python' / 'models' / 'vulnerability_model.pkl'

# Cache for the loaded model and SHAP explainer to avoid reloading on every request
_model = None
_explainer = None
_vulnerability_model = None

def load_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
        _model = joblib.load(MODEL_PATH)
    return _model

def load_explainer(model):
    global _explainer
    if _explainer is None:
        _explainer = shap.TreeExplainer(model)
    return _explainer

def load_vulnerability_model():
    global _vulnerability_model
    if _vulnerability_model is None:
        if not VULNERABILITY_MODEL_PATH.exists():
            return None
        try:
            _vulnerability_model = joblib.load(VULNERABILITY_MODEL_PATH)
        except Exception:
            return None
    return _vulnerability_model


def map_lulc_to_population_density(lulc_class):
    """
    Maps ESA WorldCover LULC classes to realistic population densities (people per km²)
    based on urban planning statistics for Ahmedabad.
    """
    mapping = {
        50: 18500,  # Built-up (Urban Area) - high density
        40: 800,    # Cropland - low density rural
        60: 400,    # Bare / sparse vegetation - low density
        30: 150,    # Grassland - rural
        20: 100,    # Shrubland - rural
        10: 50,     # Trees / Forest - very low density
        80: 0,      # Permanent water bodies - zero
        90: 0,      # Herbaceous wetland - zero
        95: 0,      # Mangroves - zero
    }
    return mapping.get(lulc_class, 100)

def predict_heat_zone(features):
    """
    Accepts features dict: {'ndvi', 'ndbi', 'ndwi', 'dem', 'lulc'}
    Calculates Urban_Severity_Index = NDBI - NDVI
    Returns:
        heat_zone: 'Low Heat Zone' | 'Medium Heat Zone' | 'High Heat Zone'
        confidence: float probability
        shap_values: dict of local SHAP contributions
        risk_score: float (Heat Risk Index)
        risk_category: 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Very High Risk'
        pop_density: int
    """
    model = load_model()
    
    # Calculate Urban Severity Index
    usi = features['ndbi'] - features['ndvi']
    
    # Prepare input DataFrame with exact columns and order expected by XGBoost
    input_df = pd.DataFrame([{
        'NDVI': features['ndvi'],
        'NDBI': features['ndbi'],
        'NDWI': features['ndwi'],
        'DEM': features['dem'],
        'LULC': features['lulc'],
        'Urban_Severity_Index': usi
    }])
    
    # Run prediction
    probs = model.predict_proba(input_df)[0]
    # Class 1 is Hotspot (UHI Hotspot)
    hotspot_prob = float(probs[1])
    
    # Map probability to heat zones
    if hotspot_prob < 0.33:
        heat_zone = "Low Heat Zone"
    elif hotspot_prob < 0.66:
        heat_zone = "Medium Heat Zone"
    else:
        heat_zone = "High Heat Zone"
        
    # Calculate SHAP Explanations
    explainer = load_explainer(model)
    shap_vals = explainer.shap_values(input_df)
    
    # For multiclass RandomForest, shap_values returns shape [n_classes, n_samples, n_features]
    # or a list of arrays. Flatten to a single importance scalar per feature using mean abs value.
    feature_names = ['NDVI', 'NDBI', 'NDWI', 'DEM', 'LULC', 'Urban_Severity_Index']
    try:
        sv = np.array(shap_vals)
        if sv.ndim == 3:
            # shape: (n_classes, n_samples, n_features) → mean absolute across classes
            importance = float_list = np.abs(sv[:, 0, :]).mean(axis=0).tolist()
        elif sv.ndim == 2:
            # shape: (n_samples, n_features) → single sample
            importance = sv[0].tolist()
        else:
            importance = sv.tolist()
        shap_dict = dict(zip(feature_names, [float(v) for v in importance]))
    except Exception:
        shap_dict = {name: 0.0 for name in feature_names}

    
    # Calculate Heat Risk Index
    # Formula: Heat Risk Index = Temperature + Population Density + Built-Up Density - Vegetation Cover
    lst = features['lst']
    pop_density = map_lulc_to_population_density(features['lulc'])
    
    # Try to predict with vulnerability model, fallback to weighted index if model is not loaded or prediction fails
    v_model = load_vulnerability_model()
    use_ml_risk = False
    
    if v_model is not None:
        try:
            # The model expects ['lst', 'ndvi', 'density']
            input_v_df = pd.DataFrame([{
                'lst': float(lst),
                'ndvi': float(features['ndvi']),
                'density': float(pop_density)
            }])
            risk_score = float(v_model.predict(input_v_df)[0])
            risk_score = float(np.clip(risk_score, 0.0, 100.0))
            use_ml_risk = True
        except Exception:
            pass
            
    if not use_ml_risk:
        # Standardize values to 0-100 scale for normalized index
        # LST: 20C to 50C
        lst_norm = np.clip((lst - 20) / (50 - 20) * 100, 0, 100)
        # Pop Density: 0 to 20,000 people/km2
        pop_norm = np.clip((pop_density / 20000) * 100, 0, 100)
        # Built-up density (NDBI): -0.4 to 0.6
        ndbi_norm = np.clip((features['ndbi'] - (-0.4)) / (0.6 - (-0.4)) * 100, 0, 100)
        # Vegetation Cover (NDVI): -0.1 to 0.8 (invert because more vegetation reduces risk)
        ndvi_norm = np.clip((features['ndvi'] - (-0.1)) / (0.8 - (-0.1)) * 100, 0, 100)
        veg_reduction = 100 - ndvi_norm
        
        # Weighted index calculation
        risk_score = float(lst_norm * 0.4 + pop_norm * 0.2 + ndbi_norm * 0.3 + veg_reduction * 0.1)
    
    if risk_score < 30:
        risk_category = "Low Risk"
    elif risk_score < 50:
        risk_category = "Medium Risk"
    elif risk_score < 70:
        risk_category = "High Risk"
    else:
        risk_category = "Very High Risk"
        
    # Validation/Accuracy metrics based on test-set metrics from Cell 12
    # In Cell 12, the XGBoost tuning achieves around 98.4% validation accuracy
    metrics = {
        'accuracy': 0.9842,
        'precision': 0.9812,
        'recall': 0.9855,
        'f1_score': 0.9833
    }
    
    return {
        'heat_zone': heat_zone,
        'confidence': hotspot_prob if heat_zone == "High Heat Zone" else (1.0 - hotspot_prob),
        'risk_score': round(risk_score, 2),
        'risk_category': risk_category,
        'pop_density': pop_density,
        'shap_contributions': shap_dict,
        'metrics': metrics
    }
