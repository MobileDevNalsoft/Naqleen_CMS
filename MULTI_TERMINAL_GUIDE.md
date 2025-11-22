# 🏗️ Multi-Terminal Scalable Structure

## Overview

The JSON structure has been upgraded from **single-terminal** to **multi-terminal** architecture, making it easy to add more terminals in the future.

---

## 📊 Structure Comparison

### ❌ Old Structure (Single Terminal)

```json
{
  "naqleen_terminal_zones": {
    "terminal_info": { "name": "Naqleen Container Terminal", ... },
    "zones": { ... }
  }
}
```

**Problems:**
- Hard-coded to one terminal
- Adding another terminal requires major restructuring
- No way to switch between terminals

---

### ✅ New Structure (Multi-Terminal)

```json
{
  "version": "2.0",
  "terminals": {
    "naqleen-jeddah": {
      "id": "naqleen-jeddah",
      "terminal_info": { "name": "Naqleen Container Terminal", ... },
      "zones": { ... }
    },
    "terminal-dubai": {
      "id": "terminal-dubai",
      "terminal_info": { "name": "Dubai Container Terminal", ... },
      "zones": { ... }
    }
  }
}
```

**Benefits:**
- ✅ Multiple terminals in one file
- ✅ Easy to add new terminals
- ✅ O(1) lookup by terminal ID
- ✅ Future-proof and scalable

---

## 🎯 How to Add a New Terminal

Simply add another entry to the `terminals` object:

```json
{
  "version": "2.0",
  "terminals": {
    "naqleen-jeddah": { ... },
    "riyadh-terminal": {
      "id": "riyadh-terminal",
      "terminal_info": {
        "name": "Riyadh Container Terminal",
        "location": "Riyadh, Saudi Arabia",
        ...
      },
      "zones": { ... }
    }
  }
}
```

That's it! No code changes needed.

---

## 🔧 Code Updates

### 1. **New TypeScript Interfaces**

```typescript
// Single terminal (unchanged)
export interface TerminalLayout {
  id: string;  // ← NEW: Terminal ID
  terminal_info: any;
  zone_types: any;
  zones: { ... };
}

// Multi-terminal container (NEW)
export interface TerminalsData {
  version: string;
  terminals: Record<string, TerminalLayout>;
}
```

### 2. **New Helper Functions**

```typescript
// Parse and get a specific terminal
export const parseTerminals = (
  json: TerminalsData, 
  terminalId?: string
): TerminalLayout => {
  const firstTerminalId = terminalId || Object.keys(json.terminals)[0];
  return json.terminals[firstTerminalId];
};

// Get list of all available terminals
export const getAvailableTerminals = (
  json: TerminalsData
): Array<{ id: string; name: string; location: string }> => {
  return Object.entries(json.terminals).map(([id, terminal]) => ({
    id,
    name: terminal.terminal_info.name,
    location: terminal.terminal_info.location,
  }));
};
```

### 3. **Updated API Functions**

```typescript
// Fetch all terminals
export async function getAllTerminals(): Promise<TerminalsData> {
  const response = await apiClient.get('/naqleen_terminals.json');
  return response.data;
}

// Fetch specific terminal (defaults to first)
export async function getLayout(terminalId?: string): Promise<TerminalLayout> {
  const terminalsData = await getAllTerminals();
  return parseTerminals(terminalsData, terminalId);
}

// NEW: Get list of terminals for dropdown
export const useTerminalsQuery = () => {
  return useQuery({
    queryKey: ['terminals-list'],
    queryFn: async () => {
      const data = await getAllTerminals();
      return getAvailableTerminals(data);
    },
  });
};
```

### 4. **Updated useLayoutQuery**

```typescript
// Now accepts optional terminalId
export const useLayoutQuery = (terminalId?: string) => {
  const setLayout = useStore((state) => state.setLayout);

  const query = useQuery({
    queryKey: ['layout', terminalId || 'default'],
    queryFn: () => getLayout(terminalId),
  });

  useEffect(() => {
    if (query.data) {
      setLayout(query.data);
    }
  }, [query.data, setLayout]);

  return query;
};
```

---

## 🎨 How to Add Terminal Switcher (Future)

When you want to let users switch terminals:

```tsx
function App() {
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>('naqleen-jeddah');
  
  // Get list of terminals
  const { data: terminals } = useTerminalsQuery();
  
  // Load selected terminal
  const { data: layout } = useLayoutQuery(selectedTerminalId);
  
  return (
    <div>
      {/* Terminal Selector Dropdown */}
      <select 
        value={selectedTerminalId} 
        onChange={(e) => setSelectedTerminalId(e.target.value)}
      >
        {terminals?.map(terminal => (
          <option key={terminal.id} value={terminal.id}>
            {terminal.name} - {terminal.location}
          </option>
        ))}
      </select>
      
      {/* 3D Visualization */}
      <Canvas>
        <InstancedContainers count={2000} />
      </Canvas>
    </div>
  );
}
```

---

## 📝 Current State

**Currently:** Only Naqleen Jeddah terminal is in the JSON file.

**Future:** Just add more terminals to `naqleen_terminals.json`:

```json
{
  "version": "2.0",
  "terminals": {
    "naqleen-jeddah": { ... },     // ← Already exists
    "dubai-terminal": { ... },      // ← Add this
    "riyadh-terminal": { ... },     // ← Add this
    "dammam-terminal": { ... }      // ← Add this
  }
}
```

---

## 🔄 Migration Path

**Backward Compatibility:**

The old `parseLayout` function is still available for legacy JSON:

```typescript
// Old JSON (naqleen_terminal_zones.json)
export const parseLayout = (json: any): TerminalLayout => {
  return json.naqleen_terminal_zones;
};

// New JSON (naqleen_terminals.json)
export const parseTerminals = (json: TerminalsData, terminalId?: string): TerminalLayout => {
  const firstTerminalId = terminalId || Object.keys(json.terminals)[0];
  return json.terminals[firstTerminalId];
};
```

---

## 🎯 Key Benefits

| Feature | Old Structure | New Structure |
|---------|--------------|---------------|
| **Multiple Terminals** | ❌ Not possible | ✅ Unlimited terminals |
| **Terminal Switching** | ❌ Requires code changes | ✅ Just change ID in hook |
| **Scalability** | ❌ Hard-coded | ✅ Fully scalable |
| **Caching** | Single cache entry | Per-terminal caching |
| **Lookup Speed** | N/A | O(1) by ID |

---

## 🚀 Integration Example

### Current App (No Changes Needed)

```tsx
// Works exactly as before
function App() {
  const { data: layout } = useLayoutQuery();
  // Uses default terminal (first in list)
}
```

### Future App (Multi-Terminal)

```tsx
// With terminal selection
function App() {
  const [terminalId, setTerminalId] = useState('naqleen-jeddah');
  const { data: layout } = useLayoutQuery(terminalId);
  
  // Switch terminals
  <button onClick={() => setTerminalId('dubai-terminal')}>
    Switch to Dubai
  </button>
}
```

---

## 📂 File Structure

```
public/
├── naqleen_terminal_zones.json  ← OLD (kept for reference)
└── naqleen_terminals.json       ← NEW (scalable structure)

src/
├── utils/
│   └── layoutUtils.ts           ← Updated with new interfaces
├── api/
│   └── index.ts                 ← Updated with terminal selection
└── store/
    └── store.ts                 ← No changes needed
```

---

## 🎓 Flutter Comparison

If this were Flutter:

```dart
// Old approach
final terminal = terminalData.naqleenTerminalZones;

// New approach
final terminals = {
  'naqleen-jeddah': Terminal(...),
  'dubai-terminal': Terminal(...),
};

// Get specific terminal
final terminal = terminals['naqleen-jeddah'];

// Or get first
final terminal = terminals.values.first;
```

Similar to having a `Map<String, Terminal>` instead of a single `Terminal` object.

---

## ✅ Summary

**What Changed:**
1. JSON structure now supports multiple terminals
2. Added `id` field to `TerminalLayout`
3. Added helper functions for parsing and listing terminals
4. Updated `useLayoutQuery` to accept optional `terminalId`

**What Stayed the Same:**
1. Component code (no breaking changes)
2. Store structure
3. Container generation logic
4. 3D rendering

**Future Steps:**
1. Add more terminals to `naqleen_terminals.json`
2. Add terminal selector UI
3. Implement terminal-specific features

---

🎉 **You now have a production-ready, scalable multi-terminal architecture!**
