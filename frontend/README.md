# Adaptive Cognitive Load Estimator - Frontend

This is the React frontend for the Adaptive Cognitive Load Estimator.
It captures real-time telemetry from mouse movements and webcam features (locally computed) to estimate cognitive load.

## Features
- **Mouse Tracking**: Batches and logs cursor path, speed, and pauses.
- **Eye Tracking**: Uses TensorFlow.js + MediaPipe Face Mesh to extract Blink Rate (EAR) and head pose features entirely in the browser. No video is ever recorded or sent.
- **Privacy First**: Requires explicit user consent via UI before any tracking begins.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

## Configuration
- The telemetry endpoints are hardcoded to `http://localhost:3000/api/telemetry/mouse` and `/eye` by default.
- Adjust `API_URL` in `src/components/MouseLogger.jsx` and `WebcamTracker.jsx` if your ingest server is running elsewhere.
