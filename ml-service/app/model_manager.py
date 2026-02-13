import joblib
import os
import numpy as np
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../saved_models/baseline_rf.joblib")

class ModelManager:
    def __init__(self):
        self.model = None
        self.load_model()

    def load_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                print(f"✅ Loaded model from {MODEL_PATH}")
            except Exception as e:
                print(f"⚠️ Failed to load model: {e}")
                self.model = None
        else:
            print(f"ℹ️ No model found at {MODEL_PATH}. Using heuristic fallback.")
            self.model = None

    def predict(self, features: dict):
        """
        Returns (score, label)
        """
        # If model exists, use it
        if self.model:
            try:
                vector = [
                    features.get('mouse_avg_speed', features.get('mouse_mean_speed', 0.0)),
                    features.get('mouse_std_speed', 0.0),
                    features.get('mouse_idle_frac', features.get('mouse_pause_frac', 1.0)),
                    features.get('blink_count', 0),
                    features.get('avg_ear', 0.3),
                    features.get('gaze_off_frac', 0.0)
                ]
                
                # Feature names must match exactly what the model was trained on
                FEATURE_COLS = [
                    "mouse_mean_speed",
                    "mouse_std_speed",
                    "mouse_pause_frac",
                    "blink_count", 
                    "avg_ear", 
                    "gaze_off_frac"
                ]
                df = pd.DataFrame([vector], columns=FEATURE_COLS)
                
                # Predict
                probs = self.model.predict_proba(df)
                score = float(probs[0][1])                
                # Lower threshold for "High" to make it very sensitive
                label = "High" if score > 0.45 else ("Medium" if score > 0.2 else "Low")
                return score, label
            except Exception as e:
                print(f"⚠️ Model inference failed: {e}. Falling back to heuristic.")
        # === STRESS / COGNITIVE LOAD INDEX ===
        # High Load = High Mental Effort / Stress / Overload
        # Characterized by: High Blink Rate, erratic Head Movement, frantic Mouse Usage.
        #
        # SCALE:
        # 0.0 - 0.3 : Low Load (Calm, Passive)
        # 0.4 - 0.7 : Medium Load (Active Engagement)
        # 0.7 - 1.0 : High Load (Stress, Overload, Frantic)

        # 1. Extract & Normalize Features
        blink_count = features.get('blink_count', 0)
        gaze_off_frac = features.get('gaze_off_frac', 0.0)
        head_std = features.get('head_movement_std', 0.0)
        mouse_speed = features.get('mouse_avg_speed', 0.0)
        
        # Normalize inputs to 0.0 - 1.0 scale
        
        # Blinks: > 10 in 5s is frantic (increased from 6)
        norm_blink = min(1.0, blink_count / 10.0)
        
        # Head: StdDev > 100px is very restless (increased from 20)
        norm_head = min(1.0, head_std / 100.0)
        
        # Mouse: Frantic > 4 px/ms (increased from 3)
        norm_mouse = min(1.0, mouse_speed / 4.0)
        
        # Gaze: Fraction of time looking away
        norm_gaze = min(1.0, gaze_off_frac)

        # 2. Weighted Sum (Add inputs to build load score)
        # We start with a tiny base load
        base_load = 0.05
        
        # Weights (Sum ~ 0.9)
        w_mouse = 0.30
        w_blink = 0.30
        w_head  = 0.20
        w_gaze  = 0.10
        
        raw_score = base_load + (norm_mouse * w_mouse) + (norm_blink * w_blink) + (norm_head * w_head) + (norm_gaze * w_gaze)
        
        # Clamp
        score = max(0.0, min(1.0, raw_score))

        print(f"[ML-HEURISTIC] Score: {score:.2f} (Mouse:{norm_mouse:.2f} Blink:{norm_blink:.2f} Head:{norm_head:.2f})")

        # Categorize
        if score < 0.35:
            return score, "Low"
        elif score < 0.65:
            return score, "Medium"
        else:
            return score, "High"

model_manager = ModelManager()
