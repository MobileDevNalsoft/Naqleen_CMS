# Naqleen CMS Architecture Diagram

To ensure clarity, the architecture is broken down into three focused views: **System Context**, **Client Application Structure**, and **Data Flow**.

## 1. High-Level System Context

A simplified view of how the Client Application interacts with external systems.

```mermaid
graph LR
    User((User))
    
    subgraph "Client Workstation"
        ClientApp["Naqleen CMS Client<br/>(React + Three.js)"]
    end
    
    subgraph "Backend Infrastructure"
        APIServer["API Server"]
        SocketServer["Socket.io Server"]
    end
    
    User -->|Interacts via Browser| ClientApp
    ClientApp <-->|HTTP Requests| APIServer
    ClientApp <-->|Real-time Events| SocketServer
```

---

## 2. Core Client Application Structure

Focuses on the internal organization of the React application, specifically the bridge between the UI (DOM) and the 3D Scene (Canvas).

```mermaid
graph TD
    subgraph "React Application Root (App.tsx)"
        
        subgraph "UI Layer (DOM)"
            Header["Modern Header"]
            Panels["Action & Details Panels"]
            Dashboard["Dashboard Overlay"]
            NavUI["Navigation Controls UI"]
        end

        subgraph "State Layer (Zustand)"
            Store["Global Store<br/>(State/Actions)"]
        end

        subgraph "3D Layer (React Three Fiber)"
            Canvas["Canvas"]
            
            subgraph "Scene Graph"
                Controls["Camera Controls"]
                Lights["Environment & Lighting"]
                
                subgraph "Dynamic Content"
                    Yard["Yard Layout<br/>(Blocks/Rows)"]
                    Units["Container Units"]
                    Infra["Infrastructure<br/>(Gates/Fences)"]
                end
            end
        end
    end

    %% Bridges
    Header --> Store
    Panels <--> Store
    
    Store --> Canvas
    Store --> Panels
    
    %% Scene dependencies
    Yard --> Canvas
    Units --> Yard
```

---

## 3. Data Flow & State Management

Illustrates how data is fetched, cached, and propagated to the 3D scene.

```mermaid
sequenceDiagram
    participant UI as UI Component
    participant Hook as React Query Hook
    participant API as API Client
    participant Store as State Store
    participant Scene as 3D Component

    Note over UI, Scene: Initialization
    UI->>Hook: Request Data (e.g., useLayoutQuery)
    Hook->>API: GET /api/layout
    API-->>Hook: Return JSON Data
    Hook-->>UI: Data Cached & Returned
    
    Note over UI, Scene: Scene Update
    UI->>Store: Set Layout Data
    Store-->>Scene: Subscribe to Updates
    Scene->>Scene: Generate 3D Meshes from Data
    
    Note over UI, Scene: User Interaction
    Scene->>Store: Hover/Click Object
    Store-->>UI: Update Selection State
    UI->>UI: Show Tooltip/Panel
```
