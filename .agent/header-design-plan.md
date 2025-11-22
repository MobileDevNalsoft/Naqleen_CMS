# Header Design Plan - Naqleen Container Management System

## Header Layout Structure
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo] [Terminal ▼] │ [Search] [Filter] │ [Views] [Actions] │ [User] [⚙️] │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Section 1: Branding & Navigation (Left Side)

### Logo & App Name
- **Naqleen CMS Logo** (clickable - returns to home/default view)
- App version indicator (small text below logo)

### Terminal Selector Dropdown
- **Current Terminal**: Displays selected terminal name
- **Dropdown Options**:
  - List of all available terminals
  - "Manage Terminals" option
  - Recently accessed terminals (quick access)
  - Terminal status indicator (Active/Inactive)

---

## Section 2: Search & Filter (Left-Center)

### Global Search Bar
- **Search Input**: Autocomplete search across:
  - Container numbers
  - Block names (TRS, TRM zones)
  - Bay/Row locations (e.g., "A-03", "B-12")
  - Vessel names
  - Booking numbers
  - Customer names
- **Advanced Search Icon**: Opens detailed search modal with:
  - Multiple field filters
  - Date range selection
  - Container status filters
  - Container type filters (20ft/40ft, Empty/Full)
  - Weight range
  - Hazardous cargo flag

### Filter Button
- **Quick Filters Panel** (slide-out):
  - Container Status: Empty, Full, Damaged, Under Repair
  - Container Type: 20ft, 40ft, 45ft, Reefer, Open Top, Flat Rack
  - Block/Zone: TRS Block A, TRS Block B, TRM Block C, etc.
  - Ownership: Client-owned, Leased, Terminal-owned
  - Days in Terminal: 0-7, 8-14, 15-30, 30+
  - Customs Status: Cleared, Pending, Hold
  - Hazmat: Yes/No
  - Condition: Good, Fair, Poor
  - Last Movement: Today, Last 7 days, Last 30 days

---

## Section 3: View Controls (Center)

### View Mode Switcher
- **3D View** (current default) - icon: 🎮
- **Top View** - icon: 🔝
- **List View** - icon: 📋 (grid/table of containers)
- **Heatmap View** - icon: 🌡️ (occupancy/utilization)
- **Timeline View** - icon: 📊 (movement history)

### Visualization Settings
- **Layer Toggle**:
  - Show/Hide Container Labels
  - Show/Hide Block Names
  - Show/Hide Bay/Row Numbers
  - Show/Hide Fences
  - Show/Hide Environment (trees, warehouses)
  - Show/Hide Shadows
  - Show/Hide Lot Borders
  - Show/Hide Only Selected Block

### Camera Controls
- **Reset Camera** - icon: 🎯
- **Auto-Rotate** - icon: 🔄 (toggle)
- **Screenshot** - icon: 📸 (capture current view)
- **Fullscreen** - icon: ⛶

---

## Section 4: Actions & Operations (Right-Center)

### Container Operations Dropdown
- **Schedule Movement**:
  - Pick Up
  - Drop Off
  - Reposition
  - Load to Vessel
  - Unload from Vessel
  - Yard Transfer
  
- **Create Entry**:
  - Gate In
  - Gate Out
  - Inspection Record
  - Damage Report
  - Repair Order

- **Booking Management**:
  - New Booking
  - Edit Booking
  - Cancel Booking
  - Booking List

### Quick Actions
- **Import Data**: 
  - Import Container List (CSV/Excel)
  - Import Vessel Planning
  - Import Booking Data
  - Bulk Update
  
- **Export Data**:
  - Export Current View (PDF/Image)
  - Export Container Report (Excel/PDF)
  - Export Inventory Summary
  - Export Movement Log
  - Export Billing Report

### Reports Dropdown
- **Operational Reports**:
  - Daily Terminal Report
  - Container Inventory Report
  - Movement Summary
  - Dwell Time Analysis
  - Utilization Report (by block/zone)
  - Gate Activity Report
  
- **Financial Reports**:
  - Storage Charges Summary
  - Revenue Report
  - Customer Billing
  
- **Compliance Reports**:
  - Customs Report
  - Hazmat Inventory
  - Empty Container Report

### Notifications Bell 🔔
- **Badge**: Shows unread count
- **Dropdown Panel**:
  - Container ready for pickup
  - Overstay alerts (free time exceeded)
  - Low occupancy alerts
  - System maintenance notices
  - New bookings
  - Gate activity
  - Vessel arrival/departure
  - Mark all as read option

---

## Section 5: Settings & User (Right Side)

### Settings ⚙️ Dropdown
- **Display Preferences**:
  - Theme: Light/Dark/Auto
  - Language: English, Arabic, etc.
  - Measurement: Metric/Imperial
  - Date Format: DD/MM/YYYY, MM/DD/YYYY
  - Time Format: 12h/24h
  - Currency

- **Performance Settings**:
  - Graphics Quality: Low/Medium/High/Ultra
  - Max Containers to Render
  - Enable/Disable Animation
  - Enable/Disable Shadows
  - Fog Distance

- **Application Settings**:
  - Auto-Save Filters
  - Default View on Startup
  - Enable Sound Effects
  - Keyboard Shortcuts
  - Notification Preferences

- **Terminal Configuration**:
  - Edit Layout
  - Manage Blocks
  - Configure Bay/Row Numbering
  - Set Business Rules
  - Working Hours

- **User Management** (Admin only):
  - User Roles & Permissions
  - Activity Log
  - API Keys

### User Profile Dropdown
- **User Info**:
  - [Avatar] Username
  - Role: Admin/Operator/Viewer
  - Terminal: Current terminal name
  
- **Menu Options**:
  - My Profile
  - Change Password
  - My Activity
  - Preferences
  - Help & Documentation
  - Keyboard Shortcuts
  - About Naqleen CMS
  - **Logout**

---

## Section 6: Context Bar (Optional Second Row)

### Breadcrumb Navigation
- Home > Terminal Name > Selected Block/Container

### Status Indicators (Right of breadcrumb)
- **Terminal Occupancy**: 
  - "1,234 / 2,000 TEU (61.7%)"
  - Color-coded: Green (<70%), Yellow (70-90%), Red (>90%)

- **Time Display**:
  - Current Date & Time
  - Last Data Refresh: "Updated 2 min ago"
  - Auto-refresh toggle

### Selection Info (When container selected)
- **Container**: ABCU1234567
- **Type**: 40ft High Cube
- **Location**: Block TRS-A, Bay 03, Row B, Tier 2
- **Status**: Full/Export
- **Days in Terminal**: 5 days
- **Actions**: [📍 Locate] [📝 Details] [🚚 Move] [❌ Deselect]

---

## Responsive Behavior

### Desktop (>1200px)
- Full header with all elements visible
- Two-row layout (main header + context bar)

### Tablet (768px - 1200px)
- Collapsible sections with icons
- Combined dropdowns for space efficiency
- Single-row header with hamburger menu for secondary items

### Mobile (<768px)
- Minimal header: Logo + Hamburger Menu
- Full-screen slide-out navigation panel
- Bottom navigation bar for primary actions
- Floating action button for quick operations

---

## Visual Design Specifications

### Color Scheme
- **Primary**: #2563EB (Blue) - for primary actions
- **Secondary**: #10B981 (Green) - for success/confirmation
- **Warning**: #F59E0B (Orange) - for alerts
- **Danger**: #EF4444 (Red) - for critical/delete actions
- **Background**: #1F2937 (Dark) or #F9FAFB (Light)
- **Text**: #111827 (Dark) or #F9FAFB (Light)

### Typography
- **Font Family**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI"
- **Logo**: 24px, Bold
- **Navigation**: 14px, Medium
- **Dropdowns**: 14px, Regular

### Spacing & Heights
- **Header Height**: 64px (main) + 48px (context bar)
- **Padding**: 16px horizontal, 12px vertical
- **Gap between elements**: 12px
- **Border Radius**: 8px for buttons/dropdowns

### Icons
- Use **Lucide Icons** or **Heroicons** for consistency
- Size: 20px for navigation, 16px for inline

---

## Keyboard Shortcuts (to show in Help)

- `Ctrl + K`: Open search
- `Ctrl + F`: Focus filter
- `Ctrl + R`: Reset camera
- `Ctrl + Shift + S`: Take screenshot
- `T`: Toggle top view
- `L`: Toggle list view
- `Esc`: Clear selection / Close modals
- `F11`: Fullscreen
- `Ctrl + ,`: Open settings
- `/`: Focus search bar

---

## Implementation Priority

### Phase 1 (MVP - Immediate)
1. Logo & Terminal Selector
2. Global Search
3. View Mode Switcher (3D, Top, List)
4. User Profile & Logout
5. Basic Settings (Theme, Language)

### Phase 2 (Enhanced Features)
1. Filter Panel with all options
2. Container Operations Menu
3. Reports Dropdown
4. Notifications System
5. Context Bar with Selection Info

### Phase 3 (Advanced)
1. Import/Export functionality
2. Advanced Search Modal
3. Heatmap & Timeline Views
4. Performance Settings
5. User Management (Admin)
6. Keyboard Shortcuts

---

## State Management Considerations

### Global State (Zustand Store)
```typescript
interface HeaderState {
  selectedTerminal: string;
  searchQuery: string;
  activeFilters: FilterConfig;
  viewMode: '3d' | 'top' | 'list' | 'heatmap' | 'timeline';
  visibleLayers: LayerConfig;
  notifications: Notification[];
  userPreferences: UserPreferences;
  selectedContainer: string | null;
}
```

### Local Component State
- Dropdown open/close states
- Search suggestions
- Form inputs in modals
- Temporary UI states

---

## Accessibility Features

- ARIA labels for all buttons/links
- Keyboard navigation support
- Focus indicators
- Screen reader announcements
- High contrast mode
- Reduced motion mode
- Minimum touch target size: 44x44px

---

## Integration Points

### API Endpoints Required
- `GET /api/terminals` - List of terminals
- `GET /api/search?q={query}` - Global search
- `GET /api/containers?filters={...}` - Filtered containers
- `GET /api/reports/{type}` - Generate reports
- `GET /api/notifications` - User notifications
- `POST /api/export` - Export data
- `POST /api/import` - Import data
- `GET /api/users/me` - Current user info

### Event System
- `onTerminalChange`
- `onSearchSubmit`
- `onFilterChange`
- `onViewModeChange`
- `onContainerSelect`
- `onActionExecute`

---

## Notes
- Header should be sticky (fixed position at top)
- Backdrop blur effect for glass-morphism aesthetic
- Smooth transitions (300ms) for all interactions
- Loading states for async operations
- Error handling with toast notifications
- Persist user preferences in localStorage
