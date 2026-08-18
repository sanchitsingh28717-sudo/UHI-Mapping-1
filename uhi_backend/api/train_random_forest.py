import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

def train_rf_model():
    # api_dir -> uhi_backend -> project_root
    api_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(api_dir)
    project_root = os.path.dirname(backend_dir)
    
    csv_path = os.path.join(project_root, "AI_UH_Python", "data", "raw", "training_dataset.csv")
    
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Training dataset not found at {csv_path}")

    print(f"Loading dataset from {csv_path}...")
    df = pd.read_csv(csv_path)

    # Compute Urban_Severity_Index = NDBI - NDVI
    df['Urban_Severity_Index'] = df['NDBI'] - df['NDVI']

    features = ['NDVI', 'NDBI', 'NDWI', 'DEM', 'LULC', 'Urban_Severity_Index']
    X = df[features]
    y = df['Heat_Class']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Training scikit-learn RandomForestClassifier...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"SUCCESS: Model trained with Accuracy: {acc * 100:.2f}%")

    output_path = os.path.join(project_root, "AI_UH_Python", "models", "random_forest.pkl")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    joblib.dump(model, output_path)
    print(f"Saved native RandomForest model to {output_path}")

if __name__ == "__main__":
    train_rf_model()
