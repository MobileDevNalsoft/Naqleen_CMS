# Technical Documentation: Naqleen CMS

## Overview
Naqleen CMS is a modern web application designed for comprehensive Container Management, Yard Operations, and Transport tracking. It provides specialized dashboards, 3D visualizations, maps, and real-time operations tracking (Gate In, Gate Out, Task Assignment, Position tracking).

---

## Tech Stack

### Core Technologies
- **Framework**: React 19
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4 (with Vanilla CSS via `index.css`)

### State Management & Data Fetching
- **Client State**: Zustand
- **Server State & Caching**: TanStack React Query (`@tanstack/react-query`)

### Graphics, Maps & Visualizations
- **3D Graphics Engine**: Three.js
- **React 3D Integration**: React Three Fiber (`@react-three/fiber`) & React Three Drei (`@react-three/drei`)
- **Mapping**: Maplibre GL (`maplibre-gl`), React Map GL (`react-map-gl`), React Three Map
- **Animations**: Framer Motion, GSAP
- **Charting**: Recharts

### Networking & API
- **HTTP Client**: Axios
- **Real-time WebSockets**: Socket.io-client (`socket.io-client`)

### Utilities
- **Validation**: Zod
- **Large List Virtualization**: React Virtuoso, React Virtualized Auto Sizer
- **Excel Export/Import**: ExcelJS
- **Icons**: Lucide React, React Icons

---

## Folder Structure

The application follows a modular, feature-based architecture pattern:

```text
src/
├── App.css
├── App.tsx
├── index.css
├── main.tsx
├── api/
│   ├── apiClient.ts
│   ├── apiConfig.ts
│   ├── apiTypes.ts
│   └── index.ts
├── components/
│   ├── layout/
│   │   ├── HoverInfoPanel.tsx
│   │   ├── ModernHeader.tsx
│   │   └── header/
│   │       ├── HeaderIcdSelector.tsx
│   │       ├── HeaderLogo.tsx
│   │       ├── HeaderNavigation.tsx
│   │       ├── HeaderNotifications.tsx
│   │       ├── HeaderProfile.tsx
│   │       └── HeaderSearch.tsx
│   ├── scene/
│   │   ├── core/
│   │   │   ├── CameraBounds.tsx
│   │   │   ├── CameraTransition.tsx
│   │   │   ├── Environment.tsx
│   │   │   ├── KeyboardNavigation.tsx
│   │   │   └── Lighting.tsx
│   │   ├── effects/
│   │   │   ├── EffectsWrapper.tsx
│   │   │   └── RestackConnectionLine.tsx
│   │   ├── infrastructure/
│   │   │   ├── CabinOffice.tsx
│   │   │   ├── CFSArea.tsx
│   │   │   ├── Fence.tsx
│   │   │   ├── Fencing.tsx
│   │   │   ├── Gates.tsx
│   │   │   ├── IcdMarkings.tsx
│   │   │   ├── RestingRoom.tsx
│   │   │   ├── TerminalOffice.tsx
│   │   │   ├── Warehouse.tsx
│   │   │   ├── apis/
│   │   │   │   └── layoutApi.ts
│   │   │   ├── dynamic/
│   │   │   │   ├── DynamicLayoutEngine.tsx
│   │   │   │   ├── Registry.ts
│   │   │   │   └── components/
│   │   │   │       ├── GenericZone.tsx
│   │   │   │       └── InfrastructureWrappers.tsx
│   │   │   ├── types/
│   │   │   │   ├── IcdSchema.ts
│   │   │   │   └── IcdSchema.zod.ts
│   │   │   └── utils/
│   │   │       ├── icdValidator.ts
│   │   │       └── layoutUtils.ts
│   │   ├── interactions/
│   │   │   └── EventHandler.tsx
│   │   ├── objects/
│   │   │   ├── Containers.tsx
│   │   │   ├── GhostContainer.tsx
│   │   │   └── Truck.tsx
│   │   └── surroundings/
│   │       ├── CityModel.tsx
│   │       ├── CityTraffic.tsx
│   │       └── DammamCityModel.tsx
│   └── ui/
│       ├── feedback/
│       │   └── PremiumStateView.tsx
│       ├── cfs/
│       │   └── CFSTaskLoader.tsx
│       ├── common/
│       │   ├── NoDataFound.tsx
│       │   └── Toast.tsx
│       ├── containers/
│       │   ├── ContainerEmptyState.tsx
│       │   ├── ContainerErrorState.tsx
│       │   └── ContainerLoader.tsx
│       ├── dashboard/
│       │   ├── drilldowns/
│       │   │   ├── DrilldownEmpty.tsx
│       │   │   ├── DrilldownError.tsx
│       │   │   └── DrilldownLoader.tsx
│       │   ├── metrics/
│       │   │   ├── MetricEmptyState.tsx
│       │   │   ├── MetricErrorState.tsx
│       │   │   └── MetricLoader.tsx
│       │   └── trends/
│       │       ├── TrendEmptyState.tsx
│       │       ├── TrendErrorState.tsx
│       │       └── TrendLoader.tsx
│       ├── generic/
│       │   ├── GenericEmptyState.tsx
│       │   └── GenericErrorState.tsx
│       ├── plug/
│       │   ├── PlugEmptyState.tsx
│       │   ├── PlugErrorState.tsx
│       │   └── PlugLoader.tsx
│       ├── scene/
│       │   └── SceneLoader.tsx
│       └── trucks/
│           └── TruckLoader.tsx
├── features/
│   ├── auth/
│   │   ├── apis/
│   │   ├── components/
│   │   ├── store/
│   │   └── types/
│   ├── dashboard/
│   │   ├── apis/
│   │   ├── components/
│   │   └── types/
│   ├── inventory/
│   │   └── components/
│   ├── operations/
│   │   ├── apis/
│   │   ├── components/
│   │   ├── icons/
│   │   └── types/
│   ├── settings/
│   │   ├── apis/
│   │   ├── components/
│   │   ├── store/
│   │   ├── types/
│   │   └── utils/
│   ├── shared/
│   │   └── components/
│   └── yard-planning/
│       ├── apis/
│       ├── components/
│       └── types/
├── hooks/
│   ├── useAuthSync.ts
│   ├── useDebounce.ts
│   └── useScreenAccess.ts
├── services/
│   ├── excelImportService.ts
│   └── realtime.ts
├── store/
│   ├── store.ts
│   └── uiStore.ts
├── themes/
│   └── theme.ts
└── utils/
    └── statusColors.ts
```

---

## API Architecture

The application communicates primarily with an Oracle REST Data Services (ORDS) backend, mapping to base endpoints configured via environment variables:
- **Web API Base**: `[VITE_API_BASE_URL]/ords/xxotm/otm-web`
- **Mobile API Base**: `[VITE_API_BASE_URL]/ords/xxotm/otm-mobile`

### Endpoints Mapping

#### 1. Auth & Admin
- **`AUTH_LOGIN`** (`/auth`)
- **`ADMIN_USERS`** (`/users` - GET)
- **`USERS_CREATE`** (`/users` - POST)
- **`ADMIN_ASSIGN_ROLE`** (`/users/assignRole`)
- **`ADMIN_ROLES`** (`/roles`)
- **`ADMIN_SCREENS`** (`/screens`)
- **`ADMIN_ROLE_PERMISSIONS`** (`/roles/permissions`)
- **`USERS_UPDATE`** (`/user/update`)
- **`USERS_DELETE`** (`/user/delete`)

#### 2. Inventory & Customers
- **`GET_CONTAINERS`** (`/getContainers`)
- **`GET_CUSTOMERS`** (`/getCustomers`)
- **`GET_RECOMMENDED_CONTAINERS`** (`/getRecommendedContainers`)
- **`GET_INVENTORY`** (`/getInventory`)
- **`GET_CONTAINER_DETAILS`** (`/getContainerDetails`)
- **`CREATE_INVENTORY`** (`/customerInventory`)
- **`GET_ICDS`** (`/dynamic_icds.json` - Static config)
- **`GET_SHIPMENT_INVENTORY`** (`/getShipmentInventory`)

#### 3. Gate Operations
- **Gate In**:
  - **`GATE_IN_TRUCKS`** (`/gateInTrucks`)
  - **`GATE_IN_TRUCK_DETAILS`** (`/gateInTruckDetails`)
  - **`CUSTOMER_SHIPMENTS`** (`/customerShipments`)
  - **`SUBMIT_GATE_IN`** (`/submitGateIn`)
- **Gate Out**:
  - **`GATE_OUT_TRUCKS`** (`/gateOutTrucks`)
  - **`GATE_OUT_TRUCK_DETAILS`** (`/gateOutTruckDetails`)
  - **`SUBMIT_GATE_OUT`** (`/submitGateOut`)

#### 4. Bookings, Shipments & Reservations
- **`CUSTOMER_BOOKINGS`** (`/getCustomerBookings`)
- **`GET_BOOKINGS`** (`/getBookings`)
- **`GET_AVAILABLE_RESERVED`** (`/getAvailableReservedContainers`)
- **`BOOKING_SHIPMENTS`** (`/getBookingShipments`)
- **`SHIPMENT_DETAILS`** (`/shipmentDetails`)
- **`POST_RESERVATION_CONTAINERS`** (`/postReservationContainers`)
- **`DELETE_RESERVATION_CONTAINERS`** (`/deleteReservationContainers`)

#### 5. Release Containers
- **`RELEASE_CONTAINER_TRUCKS`** (`/getReleaseContainerTrucks`)
- **`RELEASE_CONTAINER_TRUCK_DETAILS`** (`/releaseContainerTruckDetails`)
- **`SUBMIT_RELEASE_CONTAINER`** (`/submitReleaseContainer`)

#### 6. Task Assignment & Positioning
- **Task Management**:
  - **`NEW_TASK_ASSIGNMENT_SHIPMENTS`** (`/getTaskAssignmentShipments`)
  - **`ASSIGNED_TASK_ASSIGNMENT_SHIPMENTS`** (`/getAssignedTasks`)
  - **`GET_TASK_ASSIGNMENT_SHIPMENT_DETAILS`** (`/getTaskAssignmentShipmentDetails`)
  - **`GET_TASK_ASSIGNMENT_OPERATORS`** (`/getTaskAssignmentOperators`)
  - **`ASSIGN_TASK_TO_OPERATOR`** (`/assignTaskToOperator`)
- **Positioning**:
  - **`POSITION_TRUCKS`** (`/positionTrucks`)
  - **`POSITION_TRUCK_DETAILS`** (`/positionTruckDetails`)
  - **`GET_AVAILABLE_POSITION_LOV`** (`/getAvailablePositionLov`)
  - **`SUBMIT_CONTAINER_POSITION`** (`/submitContainerPosition`)
  - **`RESTACK_CONTAINER`** (`/restackContainer`)

#### 7. Dashboard & Metrics
- **`GET_DASHBOARD_METRICS`** (`/getDashboardMetrics`)
- **`GET_OPERATIONAL_METRICS`** (`/getDashboards`)
- **`GET_DASHBOARD_DRILLDOWN`** (`/getDashboardDrilldown`)

#### 8. Specialty Tasks & Validation
- **`PLUG_IN_OUT_CONTAINER`** (`/plugInOutContainer`)
- **`PLUG_IN_OUT_CONTAINER_DETAILS`** (`/plugInOutContainerDetails`)
- **`VALIDATE_CFS_CONTAINER`** (`/validateCfsContainer`)
- **`GET_INVALID_CONTAINERS`** (`/getInvalidContainers`)
- **`VALIDATE_SUBSCRIPTION`** (`/unisub/validateSubscription`)

---

## Backend Implementation (ORDS)

The backend APIs are deployed via **Oracle REST Data Services (ORDS)**. The endpoints defined in the React frontend map directly to ORDS REST handlers, which in turn invoke underlying PL/SQL procedures on the database.

### ORDS Mapping Structure
ORDS uses modules, templates, and handlers to route HTTP requests directly to the database layer. For example, for the `otm_mobile` module (where the base path is `/otm-mobile/`):

- **Module**: Grouping mechanism (e.g., `otm_mobile`).
- **Template**: The resource path (e.g., `submitGateIn`).
- **Handler**: The HTTP method (e.g., `POST`, `GET`) mapping to a `plsql/block`.
- **Source**: The underlying Oracle Database procedure that processes the request logic and returns JSON.

### Database Architecture Paradigm
A typical REST API call from the React client translates seamlessly into database execution. 

**Example Mapping (Authentication):**
1. React Web hits `POST /ords/xxotm/otm-mobile/auth` with JSON payload.
2. ORDS captures the payload and maps JSON keys to bind variables.
3. ORDS executes:
```sql
BEGIN
    XXOTM_AUTHENTICATE_USER_P(
        P_EMAIL => :email,
        P_PASSWORD => :password,
        P_PLATFORM => :platform
    );
END;
```

**Example Mapping (Gate In):**
1. React hits `POST /submitGateIn` with standard request body.
2. ORDS executes:
```sql
BEGIN 
    XX_OTM_SUBMIT_GATE_IN(p_blob_content => :body); 
END;
```

This architecture ensures secure, highly scalable execution of business logic directly within the Oracle Database, abstracting the complex SQL schema constraints, joins, and transactions away from the React frontend. The deployment is managed through automated ORDS definition scripts (e.g., `ORDS_REST_XXOTM_ALL*.sql`) that rebuild these service bindings.

> [!NOTE]
> **Complete Database API Definitions**
> The full database export containing all ORDS modules, templates, and handlers is stored on Google Drive. 
> 🔗 [View `Naqleen Ords Rest API.sql` on Google Drive] https://drive.google.com/file/d/1IpBgt-Bfl-BHWm7ESwCBAfnTpBQoyCHD/view?usp=drive_link

---

## Database Entities & Tables

The core operations are backed by a custom set of Oracle Database tables designed specifically for the OTM (Oracle Transportation Management) / CMS extension module. All application tables follow the `XXOTM_` naming convention.

### 1. Inventory & Containers
- **`XXOTM_CONTAINER_INVENTORY_T`**: Tracks container locations, booking references, order types, and release times. *(Key fields: `CONTAINER_NBR`, `CUST_NBR`, `POSITION`, `LOAD_STATUS`)*
- **`XXOTM_CUSTOMER_INVENTORY_T`**: Detailed customer stock inside containers, including quantity, weight, and volume metrics. *(Key fields: `QTY`, `GROSS_WEIGHT`, `UN_CLASS`, `STUFFED_BY`)*
- **`XXOTM_CUSTOMER_STOCK_T`**: Master aggregate for available customer items and stock quantities.
- **`XXOTM_CFS_CONTAINERS_T`**: Container Freight Station operations and release timestamps.

### 2. Yard Positioning
- **`XXOTM_POSITION_MASTER_T`**: Master map of all yard slots, terminals, blocks, and lots, including real-time occupancy. *(Key fields: `POSITION_ID`, `BLOCK`, `LEVEL_NO`, `IS_OCCUPIED`, `CONTAINER_NBR`)*
- **`XXOTM_RESTACK_LOLO_T`**: Logs for Lift-On/Lift-Off (LOLO) operations when containers are restacked to new positions.

### 3. Transport & Fleet
- **`XXOTM_VEHICLE_MASTER_T`**: Tracks the live state of trucks interacting with the terminal (Gate In/Gate Out times). *(Key fields: `TRUCK_NBR`, `DRIVER_NAME`, `ENTRY_TIME`, `EXIT_TIME`)*
- **`XXOTM_VEHICLE_HISTORY_T`** & **`XXOTM_DRIVER_HISTORY_T`**: Audit logs for vehicle and driver shifts, leases, and daily statuses.
- **`XXOTM_SHIPMENTS_T`**: Core shipment tracking including distances, start/end times, and load statuses. *(Key fields: `SHIPMENT_XID`, `SOURCE_LOCATION`, `DEST_LOCATION`, `LOADED_DISTANCE_VALUE`)*
- **`XXOTM_ORDER_MOVEMENTS_T`** & **`XXOTM_ORDER_RELEASES_T`**: Integration tables matching OTM logistical movements.

### 4. Operations & Tasks
- **`XXOTM_TASK_ASSIGNMENT_T`**: Links shipments/jobs directly to yard operators. *(Key fields: `OPERATOR`, `STATUS`, `ASSIGNED_DATE`)*
- **`XXOTM_CONTAINER_INSPECTION_T`**: Records inspection details for specific shipment containers.
- **`XXOTM_PLUGINOUT_T`**: Tracks Reefer (refrigerated) container plug-in/plug-out events and temperature set points. *(Key fields: `SET_POINT_TEMP`, `CURRENT_TEMP`, `TYPE`)*
- **`XXOTM_TRACKING_EVENTS_T`**: Generic audit log for macro tracking events on containers.

### 5. Chat & Communication
- **`XXOTM_CHAT_USERS_T`**: Directory of system users capable of internal chat.
- **`XXOTM_CHAT_MESSAGES_T`**: Real-time message logs with sender/receiver mapping.
