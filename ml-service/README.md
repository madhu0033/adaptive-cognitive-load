# ML Service

Python FastAPI service for Cognitive Load Estimation.

## Setup

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Run Service**:
    ```bash
    uvicorn app.main:app --reload --port 8000
    ```

## Endpoints

*   `POST /predict`: Main inference endpoint.
    *   Input: `{"student_id": "...", "features": {...}}`
    *   Output: `{"score": 0.8, "label": "High"}`

## Models
*   Models are loaded from `saved_models/`.
*   If no model is found, a **Heuristic Fallback** is used (based on blink rate, gaze deviation, and mouse speed).
