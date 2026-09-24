import os
import pandas as pd
import xgboost as xgb

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'training_data', 'live_telemetry_feed.csv')
WIND_MODEL_PATH = os.path.join(BASE_DIR, 'models', 'sankalp_wind_agent.json')
UHI_MODEL_PATH = os.path.join(BASE_DIR, 'models', 'sankalp_v4_max_classifier.json')

def retrain_models():
    if not os.path.exists(DATA_PATH):
        print("[MLOPS] No new telemetry data found in live feed. Retraining skipped.")
        return

    print("[MLOPS] Loading accumulated real-time inference telemetry...")
    df = pd.read_csv(DATA_PATH)
    
    if len(df) < 50:
        print(f"[MLOPS-STATUS] Current batch size: {len(df)} rows. Minimum threshold is 50. Waiting for more data.")
        return

    print(f"[MLOPS] Retraining trigger fired ({len(df)} samples). Updating XGBoost booster weights...")
    
    if os.path.exists(WIND_MODEL_PATH) and 'optimal_wind' in df.columns:
        try:
            X_wind = df[['optimal_height', 'dem', 'ambient_wind']] 
            y_wind = df['optimal_wind']

            wind_model = xgb.XGBRegressor()
            wind_model.load_model(WIND_MODEL_PATH)
            wind_model.fit(X_wind, y_wind, xgb_model=wind_model.get_booster())
            wind_model.save_model(WIND_MODEL_PATH)
            print("[MLOPS] Wind Model weights successfully updated.")
        except Exception as e:
            print(f"[MLOPS-ERR] Wind model retraining error: {str(e)}")

    # Archive processed telemetry
    archive_path = os.path.join(BASE_DIR, 'training_data', 'archived_telemetry.csv')
    df.to_csv(archive_path, mode='a', header=not os.path.exists(archive_path), index=False)
    os.remove(DATA_PATH)
    
    print("[MLOPS] Retraining cycle complete. Telemetry archived. Active models refreshed.")

if __name__ == "__main__":
    retrain_models()
