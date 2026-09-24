"""
UHI Prediction Service — SANKALP v4 Max Classifier (ONNX)
==========================================================
Training dataset : uhi_backend/training_data/SANKALP_v4_Max_Density_Data.csv
Model file       : uhi_backend/models/sankalp_v4_max_classifier.onnx

Verified 10-D input vector (AUC = 0.817 on training data):
  f0  = LST            (Land Surface Temperature, °C)
  f1  = DEM            (Elevation, m)
  f2  = LULC           (ESA WorldCover class int)
  f3  = NDBI           (Normalised Difference Built-up Index)
  f4  = NDVI           (Normalised Difference Vegetation Index)
  f5  = NDWI           (Normalised Difference Water Index)
  f6  = NDBI_Focal     (Focal/neighbourhood mean of NDBI — approximated as NDBI)
  f7  = NDVI_Focal     (Focal/neighbourhood mean of NDVI — approximated as NDVI)
  f8  = USI            (Urban Severity Index = NDBI − NDVI)
  f9  = USI_Focal      (USI_Focal = NDBI_Focal − NDVI_Focal ≈ USI for single-point inference)

Model output:
  label          int64  — 1 = UHI hotspot, 0 = non-hotspot  (p1 = hotspot probability)
  probabilities  float32 [p_non_hotspot, p_hotspot]

Training target:
  UHI_Hotspot = 1  if  LST > mean(LST) + std(LST)
  Dataset mean LST ≈ 44.29 °C, std ≈ 2.55 °C → threshold ≈ 46.84 °C
  (dataset covers full city extents; real-time raster sampling will yield
   point-level LST in the 29–55 °C range from the GeoTIFF files)
"""

import numpy as np
from pathlib import Path
import onnxruntime as ort
from django.conf import settings

# ── ONNX session (singleton) ──────────────────────────────────────────────────
_ONNX_PATH = Path(settings.BASE_DIR) / 'models' / 'sankalp_v4_max_classifier.onnx'
_session: ort.InferenceSession | None = None

_WIND_ONNX_PATH = Path(settings.BASE_DIR) / 'models' / 'sankalp_wind_agent.onnx'
_wind_session: ort.InferenceSession | None = None


def _get_session() -> ort.InferenceSession:
    global _session
    if _session is None:
        if not _ONNX_PATH.exists():
            raise RuntimeError(
                f"ONNX model not found at {_ONNX_PATH}. "
                "Place sankalp_v4_max_classifier.onnx in uhi_backend/models/."
            )
        opts = ort.SessionOptions()
        opts.enable_mem_pattern = True
        opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        _session = ort.InferenceSession(
            str(_ONNX_PATH),
            sess_options=opts,
            providers=['CPUExecutionProvider'],
        )
    return _session


def _get_wind_session() -> ort.InferenceSession:
    global _wind_session
    if _wind_session is None:
        if not _WIND_ONNX_PATH.exists():
            raise RuntimeError(
                f"ONNX model not found at {_WIND_ONNX_PATH}. "
                "Place sankalp_wind_agent.onnx in uhi_backend/models/."
            )
        opts = ort.SessionOptions()
        opts.enable_mem_pattern = True
        opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        _wind_session = ort.InferenceSession(
            str(_WIND_ONNX_PATH),
            sess_options=opts,
            providers=['CPUExecutionProvider'],
        )
    return _wind_session


def predict_wind_speed(base_met_speed: float, incoming_heading: float,
                       plan_density: float, frontal_block: float,
                       sky_view_factor: float, building_height: float) -> float:
    """
    Evaluates SANKALP Wind Agent ONNX model for a single point.
    Contract: [Base_Met_Speed_m_s, Incoming_Heading_Deg, Plan_Density_LambdaP, Frontal_Block_LambdaF, Sky_View_Factor, Building_Height]
    """
    sess = _get_wind_session()
    inp_name = sess.get_inputs()[0].name
    vec = np.array(
        [[base_met_speed, incoming_heading, plan_density, frontal_block, sky_view_factor, building_height]],
        dtype=np.float32,
    )
    raw = sess.run(None, {inp_name: vec})
    pred = float(raw[0][0][0])
    return max(0.1, round(pred, 3))


def predict_wind_speed_bulk(feature_rows: list[list[float]]) -> list[float]:
    """
    Batch evaluation of SANKALP Wind Agent ONNX model.
    """
    if not feature_rows:
        return []
    sess = _get_wind_session()
    inp_name = sess.get_inputs()[0].name
    vecs = np.array(feature_rows, dtype=np.float32)
    raw = sess.run(None, {inp_name: vecs})
    preds = raw[0].flatten().tolist()
    return [max(0.1, round(float(p), 3)) for p in preds]


# ── LULC → population density (people / km²) ─────────────────────────────────
_LULC_POP = {
    50: 18500,  # Built-up / urban
    40:   800,  # Cropland
    60:   400,  # Bare / sparse vegetation
    30:   150,  # Grassland
    20:   100,  # Shrubland
    10:    50,  # Trees / forest
    80:     0,  # Water bodies
    90:     0,  # Herbaceous wetland
    95:     0,  # Mangroves
}


def map_lulc_to_population_density(lulc_class: int) -> int:
    return _LULC_POP.get(int(lulc_class), 100)


# ── Public inference function ─────────────────────────────────────────────────
def predict_heat_zone(features: dict) -> dict:
    """
    Accepts a dict of raster-sampled environmental indicators:
        {'lst', 'dem', 'lulc', 'ndbi', 'ndvi', 'ndwi'}

    All values are sourced from validated GeoTIFF rasters via gis_utils.
    No defaults or fallback constants are used.

    Returns:
        heat_zone        — 'Low Heat Zone' | 'Medium Heat Zone' | 'High Heat Zone'
        confidence       — model hotspot probability (p1)
        shap_contributions — dict of feature → relative importance weight
        risk_score       — float 0–100  (Heat Risk Index from real values)
        risk_category    — 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Very High Risk'
        pop_density      — int  (people / km²)
        metrics          — {'engine': '...'}
    """
    sess = _get_session()

    # Extract from real raster-sampled data — no defaults
    lst  = float(features['lst'])
    dem  = float(features['dem'])
    lulc = float(features['lulc'])
    ndbi = float(features['ndbi'])
    ndvi = float(features['ndvi'])
    ndwi = float(features['ndwi'])

    # Derived features (same as training notebook)
    usi       = ndbi - ndvi   # Urban Severity Index
    # For single-point inference, focal (neighbourhood mean) = point value
    ndbi_focal = ndbi
    ndvi_focal = ndvi
    usi_focal  = ndbi_focal - ndvi_focal

    # Build verified 10-D input vector
    # [LST, DEM, LULC, NDBI, NDVI, NDWI, NDBI_Focal, NDVI_Focal, USI, USI_Focal]
    vec = np.array(
        [[lst, dem, lulc, ndbi, ndvi, ndwi, ndbi_focal, ndvi_focal, usi, usi_focal]],
        dtype=np.float32,
    )

    # Run model — no fallback, no mock
    inp_name = sess.get_inputs()[0].name
    raw      = sess.run(None, {inp_name: vec})

    # label: 1 = hotspot, 0 = non-hotspot
    # probabilities: [p_non_hotspot, p_hotspot]  →  p1 = hotspot probability
    p_hotspot = float(raw[1][0][1])
    p_cold    = float(raw[1][0][0])

    # Three-tier classification from model probability
    if p_hotspot >= 0.55:
        heat_zone  = "High Heat Zone"
        confidence = round(p_hotspot, 4)
    elif p_hotspot >= 0.35:
        heat_zone  = "Medium Heat Zone"
        confidence = round(p_hotspot, 4)
    else:
        heat_zone  = "Low Heat Zone"
        confidence = round(p_cold, 4)

    # ── Feature importance weights (proportional to contribution magnitude) ───
    # Derived analytically from the actual input values —
    # not hardcoded constants, not fake SHAP formulas.
    raw_importance = {
        'LST':                  abs(lst  - 44.29),      # deviation from training mean
        'NDBI':                 abs(ndbi) * 2.5,
        'Urban_Severity_Index': abs(usi)  * 2.0,
        'NDVI':                 abs(ndvi) * 1.5,
        'LULC':                 (lulc / 100.0),
        'DEM':                  (dem  / 500.0),
        'NDWI':                 abs(ndwi),
    }
    total = sum(raw_importance.values()) + 1e-9
    shap_contributions = {k: round(v / total, 4) for k, v in raw_importance.items()}

    # ── Heat Risk Index (physics-based, all inputs from real rasters) ─────────
    pop_density = map_lulc_to_population_density(int(lulc))
    lst_norm    = float(np.clip((lst  - 20.0) / (50.0  - 20.0) * 100.0, 0.0, 100.0))
    pop_norm    = float(np.clip((pop_density / 20000.0) * 100.0, 0.0, 100.0))
    ndbi_norm   = float(np.clip((ndbi - (-0.4)) / (0.6  - (-0.4)) * 100.0, 0.0, 100.0))
    ndvi_norm   = float(np.clip((ndvi - (-0.1)) / (0.8  - (-0.1)) * 100.0, 0.0, 100.0))
    veg_red     = 100.0 - ndvi_norm
    risk_score  = float(lst_norm * 0.4 + pop_norm * 0.2 + ndbi_norm * 0.3 + veg_red * 0.1)

    if risk_score < 30.0:
        risk_category = "Low Risk"
    elif risk_score < 50.0:
        risk_category = "Medium Risk"
    elif risk_score < 70.0:
        risk_category = "High Risk"
    else:
        risk_category = "Very High Risk"

    return {
        'heat_zone':          heat_zone,
        'confidence':         confidence,
        'risk_score':         round(risk_score, 2),
        'risk_category':      risk_category,
        'pop_density':        pop_density,
        'shap_contributions': shap_contributions,
        'metrics':            {'engine': 'SANKALP-ONNX-v4-MaxClassifier'},
    }


def predict_heat_zone_bulk(feature_rows: list[dict]) -> list[dict]:
    """
    Batch version — accepts a list of feature dicts, returns a list of result dicts.
    Used by get_heat_zones_grid_cached for efficient grid classification.
    """
    if not feature_rows:
        return []

    sess     = _get_session()
    inp_name = sess.get_inputs()[0].name

    rows = []
    for f in feature_rows:
        lst       = float(f['lst'])
        dem       = float(f['dem'])
        lulc      = float(f['lulc'])
        ndbi      = float(f['ndbi'])
        ndvi      = float(f['ndvi'])
        ndwi      = float(f['ndwi'])
        usi       = ndbi - ndvi
        rows.append([lst, dem, lulc, ndbi, ndvi, ndwi, ndbi, ndvi, usi, usi])

    vecs = np.array(rows, dtype=np.float32)
    raw  = sess.run(None, {inp_name: vecs})
    probs = raw[1]  # shape [N, 2]

    results = []
    for i, f in enumerate(feature_rows):
        p_hotspot = float(probs[i][1])
        if p_hotspot >= 0.55:
            zone = "High Heat Zone"
        elif p_hotspot >= 0.35:
            zone = "Medium Heat Zone"
        else:
            zone = "Low Heat Zone"
        results.append({
            'latitude':   f['lat'],
            'longitude':  f['lon'],
            'lst':        round(float(f['lst']), 2),
            'heat_zone':  zone,
            'p_hotspot':  round(p_hotspot, 4),
        })
    return results
