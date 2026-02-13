# COGNITRACK AI: SYSTEM WORKFLOW

This document encapsulates the structural, behavioral, and data logic of the project through visual diagrams and detailed explanations.

## 1. Simplified Workflow Diagram
This diagram shows the general movement of data through the microservices.

```mermaid
graph LR
    A[Student View] -->|Sensor Data| B[Ingest Server]
    B -->|Feature Vector| C[ML Brain]
    C -->|Prediction Score| B
    B -->|Live Update| D[Teacher Dashboard]
    B -->|Store Data| E[(Database)]
```

---

## 2. Technical Sequence Diagram
This diagram shows the **time-ordered interaction** between different system components during a single estimation cycle.

```mermaid
sequenceDiagram
    participant S as Student (Browser)
    participant I as Ingest Service (Node.js)
    participant ML as ML Service (Python)
    participant D as Teacher Dashboard
    participant DB as MongoDB

    Note over S: Captures Mouse & Eye Data
    S->>I: POST /api/telemetry (5s Window)
    activate I
    I->>I: Fuse & Cache Features
    
    I->>ML: POST /predict (Feature Vector)
    activate ML
    ML->>ML: Random Forest Inference
    ML-->>I: Return {Score, Label}
    deactivate ML

    I->>D: Socket.IO Emit (Real-time Update)
    I->>DB: Save Telemetry Event
    deactivate I
    
    Note over D: Chart Updates & Alert Triggered
```

---

## 3. Entity-Relationship (ER) Diagram
This diagram illustrates the data structure of the **Adaptive Cognitive Load Estimator**, styled for maximum clarity.

```mermaid
graph TD
    %% Styling
    classDef blue fill:#dae8fc,stroke:#6c8ebf,stroke-width:1px,text-align:left;
    classDef green fill:#d5e8d4,stroke:#82b366,stroke-width:1px,text-align:left;
    classDef diamond fill:#fff,stroke:#333,stroke-width:1px;

    %% Entities
    Student["<b>Student</b><br/>student_id (PK)<br/>name<br/>email"]:::blue
    Session["<b>Session</b><br/>session_id (PK)<br/>student_id (FK)<br/>status<br/>start_time"]:::blue
    Telemetry["<b>Telemetry</b><br/>tel_id (PK)<br/>session_id (FK)<br/>type<br/>data"]:::blue
    Alert["<b>Alert</b><br/>alert_id (PK)<br/>session_id (FK)<br/>teacher_id (FK)<br/>status"]:::green
    Teacher["<b>Teacher</b><br/>teacher_id (PK)<br/>name<br/>email"]:::blue

    %% Relationships
    Student -- 1 --- R1{Starts} --- |0..*| Session
    Session -- 1 --- R2{Records} --- |0..*| Telemetry
    Session -- 1 --- R3{Generates} --- |0..*| Alert
    Teacher -- 1 --- R4{Monitors} --- |0..*| Alert

    %% Notes
    R1:::diamond
    R2:::diamond
    R3:::diamond
    R4:::diamond
```

---

## 4. Use Case Diagram
This diagram follows formal UML standards to show the relationships between the Actors (Student, Teacher, AI System) and the core functional requirements of the platform.

```mermaid
graph LR
    subgraph Actors
        S[Student]
        T[Teacher]
    end

    subgraph "CogniTrack System"
        UC1((Start/Stop Session))
        UC2((Provide Bio-Signals))
        UC3((Self-Report Stress))
        UC4((Monitor Analytics))
        UC5((Receive Load Alerts))
        UC6((Predict Mental Effort))
    end

    S --- UC1
    S --- UC2
    S --- UC3

    UC2 -.-> UC6
    UC6 -.-> UC4
    UC6 -.-> UC5

    T --- UC4
    T --- UC5

``` 

---

## 5. Activity Diagram
This diagram shows the dynamic flow of activities within the system, from the initial sensor capture to the final teacher alert.

```mermaid
flowchart TD
    Start([Start Session]) --> Init[Initialize Multi-sensor Capture]
    Init --> Capture{Capture Window}
    
    subgraph Parallel Capture
        direction LR
        Mouse[Mouse Tracking]
        Eye[Webcam AI Tracking]
    end
    
    Capture --> Parallel Capture
    Parallel Capture --> Aggregate[5s Feature Aggregation]
    
    Aggregate --> Send[Transmit to Ingest Service]
    Send --> Predict[Random Forest Inference]
    
    Predict --> Logic{Score > 0.5?}
    Logic -->|Yes| Alert[Trigger Teacher Alert]
    Logic -->|No| Dashboard[Update Live Charts]
    
    Alert --> Dashboard
     Dashboard --> End{Session Ended?}
    
    End -->|No| Capture
    End -->|Yes| Final([Stop Tracking])
```

---

## 6. Step-by-Step Logic
1.  **Capture**: Student's mouse and eye data are collected in the browser via `MouseLogger.jsx` and `WebcamTracker.jsx`.
2.  **Processing**: Data is sent to the Ingest Server for cleaning, synchronization, and feature fusion.
3.  **Analysis**: The "ML Brain" (Random Forest) calculates the load score based on the multimodal vector.
4.  **Feedback**: The score is broadcast to the Teacher Dashboard in real-time via WebSockets (Socket.IO).
5.  **History**: All data is saved in MongoDB for long-term reporting and analysis.
