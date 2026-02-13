import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# --- Config ---
CSV_PATH = os.path.join(os.path.dirname(__file__), "training_data.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "../saved_models")
MODEL_PATH = os.path.join(MODEL_DIR, "baseline_rf.joblib")
os.makedirs(MODEL_DIR, exist_ok=True)

# Features to use for training
FEATURE_COLS = [
    "mouse_mean_speed",
    "mouse_std_speed",
    "mouse_pause_frac",
    "blink_count", 
    "avg_ear", 
    "gaze_off_frac"
]

def generate_synthetic_data(n_samples=1000):
    """Generates balanced synthetic data with noise."""
    print("No CSV found. Generating BALANCED synthetic data...")
    
    data = []
    for i in range(n_samples):
        is_high = i % 2 == 0 # Force 50/50 balance
        
        if is_high:
            # High Load: More blinks, less EAR, more gaze off, or high mouse jerkiness
            mouse_speed = np.random.uniform(2.0, 5.5)
            mouse_std = np.random.uniform(1.0, 3.0)
            pause = np.random.uniform(0.0, 0.4)
            blink = np.random.randint(3, 10)
            ear = np.random.uniform(0.15, 0.28)
            gaze = np.random.uniform(0.3, 0.9)
            label = 1
        else:
            # Low Load: Calm eyes, direct mouse
            mouse_speed = np.random.uniform(0.2, 2.5)
            mouse_std = np.random.uniform(0.1, 1.2)
            pause = np.random.uniform(0.4, 0.9)
            blink = np.random.randint(0, 3)
            ear = np.random.uniform(0.25, 0.35)
            gaze = np.random.uniform(0, 0.25)
            label = 0
            
        # Add random noise to 10% of samples (Simulate outliers)
        if np.random.random() < 0.1:
             mouse_speed += np.random.normal(0, 1)
             blink = max(0, blink + np.random.randint(-2, 2))
    
        data.append([max(0, mouse_speed), max(0, mouse_std), pause, blink, ear, gaze, label])
    
    df = pd.DataFrame(data, columns=FEATURE_COLS + ["label_int"])
    return df.sample(frac=1).reset_index(drop=True) # Shuffle

def main():
    print(f"Starting Training Pipeline...")
    
    # 1. Load Data
    if os.path.exists(CSV_PATH):
        print(f"Loading data from {CSV_PATH}")
        df = pd.read_csv(CSV_PATH)
    else:
        df = generate_synthetic_data()

    # 2. Preprocess
    X = df[FEATURE_COLS]
    y = df["label_int"]
    
    # 3. Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 4. Train
    print("Training RandomForest...")
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    
    # 5. Evaluate
    y_pred = clf.predict(X_test)
    
    print("\n" + "="*40)
    print("       MODEL EVALUATION RESULTS")
    print("="*40)
    
    # Standard Metrics
    print("\n--- Classification Report ---")
    print(classification_report(y_test, y_pred, target_names=["Low Load", "High Load"]))
    
    acc = accuracy_score(y_test, y_pred)
    print(f"Overall Accuracy: {acc:.4f}")
    
    # 6. Confusion Matrix
    from sklearn.metrics import confusion_matrix
    cm = confusion_matrix(y_test, y_pred)
    print("\n--- Confusion Matrix ---")
    print(f"            Predict Low | Predict High")
    print(f"Actual Low  |    {cm[0][0]:<6} |    {cm[0][1]:<6}")
    print(f"Actual High |    {cm[1][0]:<6} |    {cm[1][1]:<6}")
    
    # 7. Feature Importance
    print("\n--- Feature Importances ---")
    importances = sorted(zip(FEATURE_COLS, clf.feature_importances_), key=lambda x: x[1], reverse=True)
    for name, imp in importances:
        print(f"{name:<20}: {imp:.4f}")
        
    # 7. Save
    joblib.dump(clf, MODEL_PATH)
    print(f"\nModel saved to: {MODEL_PATH}")

if __name__ == "__main__":
    main()
