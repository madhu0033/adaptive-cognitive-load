# API Specification

## Base URLs
- **Ingest Service**: `http://localhost:3000`
- **ML Service**: `http://localhost:8000`

---

## 1. Ingest Service Endpoints

### POST /api/telemetry/mouse
Receives raw mouse movement events, saves them to MongoDB, aggregates them into a window, and forwards to ML Service.

**URL**: `http://localhost:3000/api/telemetry/mouse`
**Method**: `POST`
**Content-Type**: `application/json`

**Request Body Schema**:
```json
{
  "student_id": "string",
  "session_id": "string",
  "events": [
    {
      "ts": "number (timestamp ms)",
      "x": "number",
      "y": "number",
      "dx": "number",
      "dy": "number",
      "speed": "number"
    }
  ]
}
```

**Response**:
- `200 OK`: `{ "status": "saved" }`
- `400 Bad Request`: `{ "error": "Missing fields" }`

**CURL Example**:
```bash
curl -X POST http://localhost:3000/api/telemetry/mouse \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "test_student",
    "session_id": "test_session",
    "events": [
        {"ts": 1700000000000, "x": 100, "y": 100, "dx": 0, "dy": 0, "speed": 0},
        {"ts": 1700000000100, "x": 110, "y": 110, "dx": 10, "dy": 10, "speed": 1.41}
    ]
  }'
```

---

### POST /api/telemetry/eye
Receives aggregated eye tracking features for a window, saves to MongoDB, and forwards to ML Service.

**URL**: `http://localhost:3000/api/telemetry/eye`
**Method**: `POST`
**Content-Type**: `application/json`

**Request Body Schema**:
```json
{
  "student_id": "string",
  "session_id": "string",
  "window_start": "number (timestamp ms)",
  "window_end": "number (timestamp ms)",
  "features": {
    "blink_count": "number",
    "avg_ear": "number",
    "gaze_off_frac": "number",
    "head_movement_std": "number"
  }
}
```

**Response**:
- `200 OK`: `{ "status": "processed" }`
- `400 Bad Request`: `{ "error": "Missing fields" }`

**CURL Example**:
```bash
curl -X POST http://localhost:3000/api/telemetry/eye \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "test_student",
    "session_id": "test_session",
    "window_start": 1700000000000,
    "window_end": 1700000005000,
    "features": {
        "blink_count": 2,
        "avg_ear": 0.3,
        "gaze_off_frac": 0.1,
        "head_movement_std": 0.05
    }
  }'
```

---

## 2. ML Service Endpoints

### POST /predict
Receives pre-aggregated features and returns a cognitive load prediction.

**URL**: `http://localhost:8000/predict`
**Method**: `POST`
**Content-Type**: `application/json`

**Request Body Schema**:
```json
{
  "student_id": "string",
  "session_id": "string",
  "window_end": "number (optional)",
  "features": {
    "key": "value (numeric or float)"
  }
}
```
*Note: `features` can contain mouse features (e.g., `mouse_mean_speed`) or eye features (e.g., `avg_ear`).*

**Response**:
```json
{
  "student_id": "string",
  "score": "float (0.0 - 1.0)",
  "label": "string ('Low', 'Medium', 'High')"
}
```

**CURL Example**:
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "test_student",
    "session_id": "test_session",
    "window_end": 1700000005000,
    "features": {
        "mouse_mean_speed": 5.2,
        "mouse_pause_frac": 0.1,
        "blink_count": 5
    }
  }'
```
