import pandas as pd
import numpy as np

def extract_mouse_windows(events: list, window_ms: int = 5000) -> pd.DataFrame:
    """
    Windows raw mouse events and returns a DataFrame with aggregated features.
    
    Args:
        events: List of dicts {ts, x, y, speed, dx, dy, ...}
        window_ms: Size of the window in milliseconds.
        
    Returns:
        pd.DataFrame with columns: 
        [window_start, window_end, mouse_mean_speed, mouse_std_speed, mouse_pause_frac, mouse_entropy]
    """
    if not events:
        return pd.DataFrame()

    df = pd.DataFrame(events)
    # Ensure sorted by timestamp
    df = df.sort_values('ts')
    
    start_time = df['ts'].iloc[0]
    end_time = df['ts'].iloc[-1]
    
    windows = []
    
    current_start = start_time
    while current_start < end_time:
        current_end = current_start + window_ms
        
        # Filter events in this window
        mask = (df['ts'] >= current_start) & (df['ts'] < current_end)
        window_events = df[mask]
        
        if len(window_events) > 0:
            speeds = window_events['speed'].values
            
            # --- Features ---
            mean_speed = np.mean(speeds)
            std_speed = np.std(speeds)
            
            # Pause Fraction (< 0.1 px/ms)
            pause_frac = np.sum(speeds < 0.1) / len(speeds)
            
            # Entropy
            try:
                hist, _ = np.histogram(speeds, bins=10, density=True)
                hist = hist[hist > 0]
                entropy = -np.sum(hist * np.log2(hist))
            except:
                entropy = 0.0

            windows.append({
                'window_start': current_start,
                'window_end': current_end,
                'mouse_mean_speed': mean_speed,
                'mouse_std_speed': std_speed,
                'mouse_pause_frac': pause_frac,
                'mouse_entropy': entropy
            })
        
        # Slide window
        current_start += window_ms # Non-overlapping for now
        
    return pd.DataFrame(windows)

def merge_with_eye_features(mouse_df: pd.DataFrame, eye_df: pd.DataFrame) -> pd.DataFrame:
    """
    Merges mouse and eye features on window_start.
    Assumes eye_df has 'window_start' column.
    
    Returns single DataFrame ready for training.
    """
    if mouse_df.empty or eye_df.empty:
        return pd.DataFrame()

    # Ensure windows align roughly. 
    # For simplicity, we assume exact match or use merge_asof if timestamps drift.
    # Here we use standard merge assuming windows are generated identically.
    
    # Using 'window_start' as key
    merged = pd.merge(mouse_df, eye_df, on='window_start', how='inner', suffixes=('_mouse', '_eye'))
    
    # Cleanup duplicate columns if any (like window_end)
    if 'window_end_eye' in merged.columns:
        merged = merged.drop(columns=['window_end_eye'])
    if 'window_end_mouse' in merged.columns:
         merged = merged.rename(columns={'window_end_mouse': 'window_end'})
         
    return merged

def fuse_features(input_features: dict) -> dict:
    """
    Fuses mouse and eye features into a single consistent dictionary.
    Handles missing eye features by using default values.
    
    Args:
        input_features: Dictionary containing potentially mixed features.
        
    Returns:
        Dictionary with all keys present, suitable for model inference.
    """
    # 1. Default Eye Features (Imputation)
    # used if webcam was off or face not detected
    defaults = {
        "blink_count": 0,
        "avg_ear": 0.35,      # Normal open eye
        "gaze_off_frac": 0.0, # Focused
        "head_movement_std": 0.0,
        "mouse_mean_speed": 0.0,
        "mouse_std_speed": 0.0,
        "mouse_pause_frac": 1.0, # All pause if no mouse
        "mouse_entropy": 0.0
    }
    
    # 2. Merge with input (input overrides defaults)
    # We create a new dict to avoid modifying the input
    fused = defaults.copy()
    
    for k, v in input_features.items():
        if k in fused or k in ["mouse_mean_speed", "mouse_std_speed", "mouse_pause_frac", "mouse_entropy"]:
             # Only update known keys or mouse keys
             fused[k] = v
            
    # 3. Add explicit flag for eye data presence
    # Check if any eye key was actually provided and different/present
    has_eye = "avg_ear" in input_features
    fused["has_eye_data"] = 1 if has_eye else 0
    
    return fused
