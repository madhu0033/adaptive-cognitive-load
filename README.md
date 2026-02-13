# Adaptive Cognitive Load Estimator - Getting Started

This project consists of three main components:
1.  **Frontend**: React (Vite) student interface and teacher dashboard.
2.  **Ingest Service**: Node.js backend for telemetry aggregation and smoothing.
3.  **ML Service**: Python FastAPI for real-time load classification.

---

## 🚀 Quick Start (Docker - Recommended)

The easiest way to run the entire stack is using **Docker Compose**.

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 2. Launching the system
Open your terminal in the project root and run:
```powershell
cd infra
docker-compose up --build
```

### 3. Accessing the Apps
- **Student View / Teacher Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Ingest API**: [http://localhost:3000](http://localhost:3000)
- **ML Service**: [http://localhost:8000](http://localhost:8000)

---

## 🛠 Manual Setup (Local Development)

If you prefer to run services individually for debugging:

### 1. MongoDB
- **Local Option**: Run MongoDB on `localhost:27017`.
- **Cloud Option (Recommended for older PCs)**: Use [MongoDB Atlas](https://www.mongodb.com/atlas).
  - Create a free cluster & get the connection string.
  - Open `ingest-service/.env` and update `MONGO_URI`.

### 2. ML Service
```powershell
cd ml-service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
```
*(Optional: Run `python -m train.train_baseline` first to generate a model file.)*

### 3. Ingest Service
```powershell
cd ingest-service
npm install
npm start
```

### 4. Frontend
```powershell
cd frontend
npm install
npm run dev
```

---

## 🧠 Training the Model
If you want to re-train the model with synthetic or real data:
1. Navigate to `ml-service`.
2. Run `python -m train.train_baseline`.
3. The new model will be saved to `ml-service/saved_models/baseline_rf.joblib`.

---

## 👨‍🏫 Usage Instructions
1.  **Student**: Open the frontend, click **"Accept Consent"**, and click **"▶ Start Session"**.
2.  **Tracking**: Move your mouse or enable the webcam.
3.  **Teacher**: Open another tab at the same URL and click **"👨‍🏫 Teacher Dashboard"** at the top.
4.  **Finish**: Click **"⏹ Stop"** on the student view to provide a self-report label.
