import os
import pandas as pd
import xgboost as xgb

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'training_data', 'live_telemetry_feed.csv')
WIND_MODEL_PATH = os.path.join(BASE_DIR, 'models', 'sankalp_wind_agent.json')
UHI_MODEL_PATH = os.path.join(BASE_DIR, 'models', 'sankalp_v4_max_classifier.json')

def retrain_models():
    if not os.path.exists(DATA_PATH):
        print("No new telemetry data found. Skipping retraining.")
        return

    print("Loading accumulated live telemetry data...")
    df = pd.read_csv(DATA_PATH)
    
    if len(df) < 50:
        print(f"Not enough new data to justify retraining (Current rows: {len(df)}). Need at least 50.")
        return

    # 1. Update Wind Model (Regression)
    print("Updating Wind Prediction Model with real-world sensor data...")
    X_wind = df[['optimal_height', 'dem', 'ambient_wind']] 
    y_wind = df['optimal_wind']

    wind_model = xgb.XGBRegressor()
    wind_model.load_model(WIND_MODEL_PATH)
    wind_model.fit(X_wind, y_wind, xgb_model=wind_model.get_booster())
    wind_model.save_model(WIND_MODEL_PATH)
    print("Wind model successfully updated.")

    # 2. Clear dataset and Archive
    archive_path = os.path.join(BASE_DIR, 'training_data', 'archived_telemetry.csv')
    df.to_csv(archive_path, mode='a', header=not os.path.exists(archive_path), index=False)
    os.remove(DATA_PATH)
    
    print("Retraining cycle complete. System is now more intelligent. Data archived.")

if __name__ == "__main__":
    retrain_models()
