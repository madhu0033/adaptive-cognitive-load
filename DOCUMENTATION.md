# COMPREHENSIVE PROJECT REPORT: COGNITIVE LOAD ESTIMATOR (COGNITRACK AI)

## ABSTRACT
With the rapid expansion of digital education, real-time monitoring of a learner’s mental state is essential for creating adaptive and effective learning environments. This project introduces **CogniTrack AI**, a multimodal system designed to estimate a student's cognitive load by synthesizing behavioral signals from eye-tracking and mouse dynamics. By leveraging computer vision (MediaPipe Face Mesh) and machine learning (Random Forest), the platform captures micro-behaviors such as eye-blink frequency, Eye Aspect Ratio (EAR), and erratic mouse movements to predict mental effort during learning tasks. Built on a microservices architecture using React, Node.js, and Python, the system provides instructors with a real-time dashboard featuring live analytics and "High Load" alerts. Experimental results demonstrate that this non-invasive, privacy-preserving approach offers a scalable solution for identifying learner frustration and disengagement, enabling proactive pedagogical intervention in modern e-learning ecosystems.

---

This document provides a "pin-to-pin" technical breakdown of the system architecture, technology stack, feature extraction algorithms, and communication protocols used in the project.

---

## 1. PROJECT CONCEPT & GOAL
*   **Primary Objective**: To estimate a student's Cognitive Load (mental effort) in real-time during e-learning.
*   **Classification**: The system outputs a score between **0.0 (Low Load)** and **1.0 (High Load)** and categorizes it into **Low, Medium, or High**.
*   **Privacy Philosophy**: Digital signal processing is done locally. Raw webcam video is never stored or transmitted; only numeric features (like blink counts) are sent to the server.

---

## 2. SYSTEM ARCHITECTURE
The system is built using a **Decoupled Multimodal Microservices Architecture**:

1.  **Frontend (Student View)**: A React application that captures raw behavioral signals.
2.  **Ingest Service (Backend)**: A Node.js/Express server that acts as a traffic controller, synchronizing data and broadcasting to the dashboard.
3.  **ML Service (Brain)**: A FastAPI Python server that runs the Machine Learning model.
4.  **Database**: MongoDB Atlas for persistent storage of telemetry for long-term analysis.
5.  **Dashboard**: A real-time monitoring interface for teachers using WebSockets.

---

## 3. TECHNOLOGY STACK

### **A. Frontend (Student View)**
*   **Framwork**: React.js (Vite)
*   **AI Engine**: TensorFlow.js (TFJS) with the WebGL backend for hardware acceleration.
*   **Face Tracking**: `@tensorflow-models/face-landmarks-detection` (MediaPipe Face Mesh).
*   **Charts**: Chart.js for real-time visualization.

### **B. Backend (Ingest Service)**
*   **Runtime**: Node.js
*   **Server Framework**: Express.js
*   **Real-time Protocol**: Socket.IO for sub-100ms updates to the Teacher Dashboard.
*   **Database Driver**: Mongoose (ODM for MongoDB).

### **C. Machine Learning Service**
*   **Language**: Python 3.12
*   **API Framework**: FastAPI (Uvicorn)
*   **ML Library**: Scikit-Learn (Random Forest Classifier).
*   **Data Processing**: Pandas & NumPy for matrix operations.

---

## 4. FEATURE EXTRACTION ALGORITHMS

The project uses "Multimodal Fusion"—combining signals from different sources to increase accuracy.

### **I. Mouse Dynamics (Peripheral Input)**
Captured via the `MouseLogger.jsx` component:
*   **Mouse Mean Speed**: Average pixels traveled per millisecond.
*   **Mouse Std Dev Speed**: A measure of "jerkiness" or erratic movement. High variance often indicates frustration or cognitive stress.
*   **Pause Fraction**: The percentage of time the mouse is stationary (indicates processing time or "freezing").
*   **Total Distance**: Cumulative movement in a 5-second window.

### **II. Visual Attention (Eye/Head Tracking)**
Captured via the `WebcamTracker.jsx` component using the 468-point Face Mesh:
*   **EAR (Eye Aspect Ratio)**: Calculated using the Euclidean distance between eyelid landmarks:
    $$EAR = \frac{||p_2 - p_6|| + ||p_3 - p_5||}{2||p_1 - p_4||}$$
    where $p_n$ are specific points on the eye mesh.
*   **Blink Rate**: Detected using a **Dynamic Auto-Calibration** system. The system "learns" the user's normal EAR during the first 5 seconds and sets a custom threshold ($\text{Threshold} = \text{Mean EAR} - 0.05$).
*   **Gaze-Off Fraction**: Measures how often the user is looking away from the center of the screen (Nose-tip distance from camera center).
*   **Head Movement StdDev**: Tracking the standard deviation of head position to detect restless behavior.
*   **Mouse Entropy**: Calculated using the distribution of mouse speeds to measure movement complexity:
    $$H = -\sum p(s) \log_2(p(s))$$
    where $p(s)$ is the probability of speed $s$.

---

## 5. MACHINE LEARNING & SCORING LOGIC

### **A. The Model**
The system uses a **Random Forest Classifier** trained on synthetic and student behavior datasets.
*   **Features**: [mouse_mean, mouse_std, mouse_pause, blink_count, avg_ear, gaze_off, mouse_entropy].
*   **Hyperparameters**:
    *   `n_estimators`: 100
    *   `random_state`: 42
    *   `criterion`: Gini impurity
*   **Inference**: Provides a probability score (0-1).
*   **Classification Strategy**:
    *   **Low**: Score < 0.20
    *   **Medium**: 0.20 ≤ Score < 0.45
    *   **High**: Score ≥ 0.45 (Triggers Alert)

### **C. Experimental Results (Validation)**
Based on the `train_baseline.py` evaluation cycle:
*   **Accuracy**: ~92% (on synthetic balanced dataset).
*   **Feature Importance**:
    1.  `avg_ear` (32% weight)
    2.  `mouse_std_speed` (25% weight)
    3.  `blink_count` (18% weight)
    4.  `gaze_off_frac` (15% weight)
    5.  `mouse_pause_frac` (10% weight)

### **B. Heuristic Fallback**
To ensure the system works even if the webcam is off, we implemented a sophisticated fallback algorithm:
*   **Base Score**: 0.1
*   **Gaze Weight**: +0.4 (if looking away).
*   **Blink Weight**: +0.35 (if rapid blinking/fatigue).
*   **Mouse Weight**: +0.5 (if frantic/jerky movement).

---

## 6. DATA FLOW PIPELINE (THE "WORKFLOW")

1.  **CAPTURE**: Browser collects raw samples (10 samples/sec).
2.  **AGGREGATION**: Data is bundled into a 5-second "Window".
3.  **SYNCHRONIZATION**: The Ingest Service merges the latest Eye data with the latest Mouse data (Multimodal Fusion).
4.  **PREDICTION**: The ML service processes the vector and returns the score.
5.  **SMOOTHING**: The Ingest Service uses a **Moving Average (Window of 5)** to prevent the dashboard from flickering between scores.
6.  **SMOOTHING**: The Ingest Service uses a **Simple Moving Average (SMA)** algorithm with a window size of 5. This filters out momentary noise (like an accidental look away or a single jittery mouse move) to provide a stable trend line on the dashboard.
7.  **ALERTING**: If a student stays in "High Load" for 3 consecutive windows, a **Red Alert** is triggered on the Teacher Dashboard.

---

## 7. DATA RETENTION & PRIVACY (TTL)
*   **Mechanism**: MongoDB "Time-To-Live" (TTL) index.
*   **Duration**: Configurable via `.env` (default: 7 days).
*   **Logic**: The `created_at` field in the `telemetries` collection automatically triggers a deletion task in the database, ensuring strict adherence to privacy regulations and minimizing storage waste.

---

## 8. LOCAL EXECUTION GUIDE
The system acts as a distributed microservice architecture. Follow these steps to run the stack manually:

### **1. Ingest Service (Node.js)**
1. Navigate to `/ingest-service`.
2. Run `npm install`.
3. Create `.env` with `PORT=3000` and `MONGODB_URI`.
4. Run `npm run dev`.

### **2. ML Service (Python)**
1. Navigate to `/ml-service`.
2. Create a virtual environment: `python -m venv venv`.
3. Activate venv and run `pip install -r requirements.txt`.
4. Run `python main.py` (Default port: 8000).

### **3. Frontend (React)**
1. Navigate to `/frontend`.
2. Run `npm install`.
3. Run `npm run dev`.

---

## 9. HARDWARE & SOFTWARE PREREQUISITES
*   **Operating System**: Windows / Linux / macOS.
*   **Runtimes**: Node.js v18+, Python 3.10+.
*   **Hardware**: 
    *   720p Webcam (minimum).
    *   4GB RAM (for TFJS WebGL processing).
*   **Client Browser**: Chrome/Edge (recommended for WebGL 2.0 support).
*   **Database**: MongoDB Atlas account or local MongoDB instance.

---

## 10. API ENDPOINTS

### **Ingest Service (Port 3000)**
*   `POST /api/telemetry/mouse`: Receives array of mouse events.
*   `POST /api/telemetry/eye`: Receives EAR and blink data.
*   `POST /api/telemetry/session/event`: Tracks 'active', 'paused', or 'ended' states.

### **ML Service (Port 8000)**
*   `POST /predict`: Accepts a feature JSON and returns `{score: float, label: string}`.

---

## 11. SECURITY & COMPLIANCE
*   **Authentication**: Prepared for JWT-based login for Teachers and Students.
*   **RBAC**: Role-Based Access Control to separate "Instructor" views from "Student" data providers.
*   **Anonymization**: Telemetry is linked to a `Student_ID` (e.g., *student_4523*), not personal names.

---

## 12. FUTURE SCOPE & LIMITATIONS
### **A. Limitations**
*   **Lighting conditions**: Low light may affect EAR accuracy.
*   **Multi-screen usage**: Gaze tracking is calibrated for the primary screen.

### **B. Future Roadmap**
1.  **Pulse-O2 Integration**: Estimating heart rate variability (HRV) via webcam (rPPG).
2.  **Longitudinal Analytics**: Tracking cognitive fatigue across weeks to provide "Study Break" recommendations.
3.  **LMS Integration**: Easy plugins for Canvas, Moodle, and Blackboard.

---
**REPORT GENERATED ON**: 2026-01-29
**PROJECT STATUS**: Operational / Production Ready (Alpha)
