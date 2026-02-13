from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from .model_manager import model_manager

app = FastAPI(title="Cognitive Load ML Service")

# -- Input Schemas --
class TelemetryPayload(BaseModel):
    student_id: str
    session_id: str
    window_start: Optional[int] = None
    window_end: Optional[int] = None
    # We accept a loose dict for features to allow flexbility between mouse/eye types
    features: Dict[str, Any]

class PredictionResponse(BaseModel):
    score: float
    label: str
    student_id: str

# -- Endpoints --

@app.get("/")
def health_check():
    return {"status": "ok", "service": "ml-service"}

from fastapi.exceptions import RequestValidationError
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"❌ Validation Error: {exc.errors()}") 
    # Note: Awaiting request.body() consumes the stream, might be unsafe if middlewares need it, 
    # but strictly for debugging 422s on this endpoint it helps.
    try:
        body = await request.json()
        print(f"❌ Body: {body}")
    except:
        print("❌ Body: <could not parse json>")
        
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

@app.post("/predict", response_model=PredictionResponse)
def predict_cognitive_load(payload: TelemetryPayload):
    """
    Main inference endpoint.
    Receives windowed features -> returns score.
    """
    try:
        score, label = model_manager.predict(payload.features)
        
        return {
            "student_id": payload.student_id,
            "score": score,
            "label": label
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train")
def trigger_training():
    """
    Admin endpoint to trigger model retraining.
    (Placeholder)
    """
    return {"status": "not_implemented", "message": "Training logic to be implemented."}

if __name__ == "__main__":
    import uvicorn
    # Allow running directly for debug
    uvicorn.run(app, host="0.0.0.0", port=8000)
