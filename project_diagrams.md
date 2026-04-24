# project_diagrams.md
> [!NOTE]
> This artifact contains the requested UML diagrams (Chapter 3) adapted for the **City Pollution Monitoring Dashboard** project. The diagrams have been created using Mermaid.js, which renders as high-quality, resolution-independent vector graphics (suitable for 4K). Furthermore, they inherently have transparent backgrounds when exported or viewed in most standard viewers.

> [!WARNING]
> **Regarding Chapter 4 Screenshots:**
> The titles you provided for Chapter 4 (e.g., "4.4.3 No Electricity Theft", "4.4.5 Electricity Theft Detected") appear to belong to a previous project. Since this project is an **Air Pollution Detection System**, you will need to take new screenshots from the running application dashboard (`http://localhost:3000`) and the command line to represent Chapter 4 figures correctly. Alternatively, you can update those titles to represent features such as "Main Dashboard View", "Air Quality Critical Alert", "Pollution AI Model Evaluation", etc.

Below are the 8 diagrams for your Final Year Major Project documentation.

## 3.2.1 ER Diagram

```mermaid
erDiagram
    USER {
        string _id PK
        string username
        string email
        string password_hash
    }
    SENSOR_DATA {
        string _id PK
        string zone
        float pm25
        float pm10
        float nox
        float co2
        datetime timestamp
    }
    PREDICTION_LOG {
        string _id PK
        string sensor_data_id FK
        float aqi
        string status
        float cnn_score
        float vit_score
        datetime generated_at
    }
    ALERT {
        string _id PK
        string user_id FK
        string prediction_id FK
        string status
        datetime sent_at
    }
    
    USER ||--o{ ALERT : receives
    SENSOR_DATA ||--|| PREDICTION_LOG : generates
    PREDICTION_LOG ||--o{ ALERT : triggers
    USER ||--o{ PREDICTION_LOG : queries
```

## 3.3.1 Activity Diagram

```mermaid
stateDiagram-v2
    [*] --> FetchData: System Start / Poll Interval
    FetchData --> Preprocessing: Retrieve Simulated Sensor Data
    
    state "Hybrid AI Prediction Engine" as AI {
        Preprocessing --> CNN_Processing: Extract Immediate Local Patterns (PM Spike)
        Preprocessing --> ViT_Processing: Analyze Global Trends (Zone Context)
        CNN_Processing --> WeightedFusion: 60% Weight
        ViT_Processing --> WeightedFusion: 40% Weight
        WeightedFusion --> AQI_Calculation
    }
    
    AI --> CheckThreshold: Return Final AQI & Status
    CheckThreshold --> TriggerEmailAlert: If AQI > 150 (Unhealthy)
    CheckThreshold --> UpdateDashboardUI: If AQI <= 150 (Safe)
    TriggerEmailAlert --> UpdateDashboardUI
    UpdateDashboardUI --> FetchData: Wait 5 Seconds
```

## 3.3.2 Use Case Diagram

```mermaid
flowchart LR
    subgraph Actors
        Citizen([Citizen / General User])
        Admin([System Administrator])
    end
    
    subgraph Air Pollution Monitoring System
        UC1(View Real-Time Air Quality)
        UC2(Subscribe to Email Alerts)
        UC3(Login / Registration)
        UC4(View Health Advisories)
        UC5(Monitor Pollution Zones on Map)
        UC6(Generate AQI Predictions via CNN-ViT)
        UC7(Trigger High Pollution Alert)
    end
    
    Citizen --> UC1
    Citizen --> UC2
    Citizen --> UC3
    Citizen --> UC4
    Citizen --> UC5
    
    Admin --> UC3
    Admin --> UC5
    
    AI_Model[(Hybrid AI Model)] -.->|Provides| UC6
    UC6 -.->|Updates| UC1
    UC6 -.->|Invokes| UC7
    UC7 --> EmailService[[SMTP Email Service]]
```

## 3.3.3 Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Citizen (Browser)
    participant UI as Dashboard Frontend
    participant API as Express Router
    participant Sim as Data Simulator
    participant Model as Hybrid AI (CNN+ViT)
    participant Mail as Email Service

    User->>UI: Access Dashboard page
    UI->>API: GET /api/predict (Auto-fetch every 5s)
    API->>Sim: requestSensorReadings()
    Sim-->>API: rawPollutants (PM2.5, PM10, CO2, NOx)
    API->>Model: predictAQI(rawPollutants)
    
    Note over Model: Step 1: CNN Local Extraction<br/>Step 2: ViT Global Context<br/>Step 3: Prediction Fusion (60/40)
    
    Model-->>API: result(AQI, Status Label)
    
    alt is AQI > 150 (Unhealthy)
        API->>Mail: triggerSubscriberAlert(status)
        Mail-->>API: Alert Sent
    end
    
    API-->>UI: JSON Response Payload
    UI-->>User: Render updated charts & Map
```

## 3.3.4 Deployment Diagram

```mermaid
flowchart TD
    subgraph Client [Client Device / Browser]
        Browser[Modern Web Browser HTML5/JS/CSS]
        UI[Dashboard Single Page Application]
        Browser --> UI
    end
    
    subgraph Node_Environment [Server Environment : localhost]
        Express[Node.js Express App Server]
        AI[Hybrid AI Logic module]
        Sim[Virtual Zone Data Simulator]
        Express --> AI
        Express --> Sim
    end
    
    subgraph External_Services [Services & Storage]
        Mongo[(MongoDB Database)]
        SMTP[SMTP Alert Server]
    end
    
    Client -- "HTTP/REST API (Port 3000)" --> Node_Environment
    Node_Environment -- "Mongoose Driver" --> Mongo
    Node_Environment -- "Nodemailer" --> SMTP
```

## 3.3.5 Collaboration Diagram
*(Modeled as a Communication Flow)*

```mermaid
flowchart TD
    UI(1. Client asks for data update) --> Controller
    Controller(2. Request mock readings) --> Sim((Data Simulator))
    Sim -.->|3. Send back sensor array| Controller
    Controller(4. Pass data for evaluation) --> AI((Hybrid AI Model))
    AI -.->|5. Return Predicted Score| Controller
    
    Controller(6a. Send warning email on critical) --> SMTP((Mail Server))
    Controller(6b. Respond to client) -.->|7. Deliver predicted JSON| UI
```

## 3.3.6 Class Diagram

```mermaid
classDiagram
    class Server {
        +int PORT
        +startServer()
        +setupMiddleware()
        +initializeRoutes()
    }
    
    class PredictController {
        +getPrediction(req, res)
        +getHealth(req, res)
    }
    
    class AuthController {
        +registerUser(req, res)
        +loginUser(req, res)
    }
    
    class AIModel {
        -float CNN_WEIGHT
        -float VIT_WEIGHT
        +calculateCNN(pm25, pm10) float
        +calculateViT(nox, co2, temp) float
        +predictAQI(sensorData) object
        +getCategory(aqi) string
    }
    
    class SimulatorEngine {
        +generateZoneData(string targetZone) object
        +applyTimeFluctuations(data) object
    }
    
    class AuthUser {
        +ObjectId _id
        +string email
        +string password
        +save()
        +comparePassword()
    }
    
    Server --> PredictController : routes
    Server --> AuthController : routes
    PredictController --> AIModel : utilizes
    PredictController --> SimulatorEngine : fetches data from
    AuthController --> AuthUser : interacts with
```

## 3.3.7 Component Diagram

```mermaid
flowchart TB
    subgraph Frontend [Presentation Layer - Frontend]
        Index[index.html Main View]
        CSS[CSS Stylesheets]
        JS[Client App Logic / Fetch APIs]
    end
    
    subgraph Backend [Application Layer - Node REST API]
        Router[Express Router/Endpoints]
        CtrlAuth[Authentication Controller]
        CtrlData[Prediction / Data Controller]
        AlertMsg[Email Trigger System]
    end
    
    subgraph AI_Core [Intelligence & Simulation Layer]
        Model[Hybrid CNN-ViT Engine]
        DataGen[Pollutant Logic Generator]
    end
    
    Index --> JS
    JS -- "REST GET / POST" --> Router
    Router --> CtrlAuth
    Router --> CtrlData
    CtrlData --> Model
    CtrlData --> DataGen
    CtrlData --> AlertMsg
```
