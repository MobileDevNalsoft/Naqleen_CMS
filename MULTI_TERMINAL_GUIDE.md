# 🏗️ Multi-Icd Scalable Structure

## Overview

The JSON structure has been upgraded from **single-icd** to **multi-icd** architecture, making it easy to add more icds in the future.

---

## 📊 Structure Comparison

### ❌ Old Structure (Single Icd)

```json
{
  "naqleen_icd_terminals": {
    "icd_info": { "name": "Naqleen Container Icd", ... },
    "terminals": { ... }
  }
}
```

**Problems:**
- Hard-coded to one icd
- Adding another icd requires major restructuring
- No way to switch between icds

---

### ✅ New Structure (Multi-Icd)

```json
{
  "version": "2.0",
  "icds": {
    "naqleen-jeddah": {
      "id": "naqleen-jeddah",
      "icd_info": { "name": "Naqleen Container Icd", ... },
      "terminals": { ... }
    },
    "icd-dubai": {
      "id": "icd-dubai",
      "icd_info": { "name": "Dubai Container Icd", ... },
      "terminals": { ... }
    }
  }
}
```

**Benefits:**
- ✅ Multiple icds in one file
- ✅ Easy to add new icds
- ✅ O(1) lookup by icd ID
- ✅ Future-proof and scalable

---

## 🎯 How to Add a New Icd

Simply add another entry to the `icds` object:

```json
{
  "version": "2.0",
  "icds": {
    "naqleen-jeddah": { ... },
    "riyadh-icd": {
      "id": "riyadh-icd",
      "icd_info": {
        "name": "Riyadh Container Icd",
        "location": "Riyadh, Saudi Arabia",
        ...
      },
      "terminals": { ... }
    }
  }
}
```

That's it! No code changes needed.

---

## 🔧 Code Updates

### 1. **New TypeScript Interfaces**

```typescript
// Single icd (unchanged)
export interface IcdLayout {
  id: string;  // ← NEW: Icd ID
  icd_info: any;
  terminal_types: any;
  terminals: { ... };
}

// Multi-icd container (NEW)
export interface IcdsData {
  version: string;
  icds: Record<string, IcdLayout>;
}
```

### 2. **New Helper Functions**

```typescript
// Parse and get a specific icd
export const parseIcds = (
  json: IcdsData, 
  icdId?: string
): IcdLayout => {
  const firstIcdId = icdId || Object.keys(json.icds)[0];
  return json.icds[firstIcdId];
};

// Get list of all available icds
export const getAvailableIcds = (
  json: IcdsData
): Array<{ id: string; name: string; location: string }> => {
  return Object.entries(json.icds).map(([id, icd]) => ({
    id,
    name: icd.icd_info.name,
    location: icd.icd_info.location,
  }));
};
```

### 3. **Updated API Functions**

```typescript
// Fetch all icds
export async function getAllIcds(): Promise<IcdsData> {
  const response = await apiClient.get('/naqleen_icds.json');
  return response.data;
}

// Fetch specific icd (defaults to first)
export async function getLayout(icdId?: string): Promise<IcdLayout> {
  const icdsData = await getAllIcds();
  return parseIcds(icdsData, icdId);
}

// NEW: Get list of icds for dropdown
export const useIcdsQuery = () => {
  return useQuery({
    queryKey: ['icds-list'],
    queryFn: async () => {
      const data = await getAllIcds();
      return getAvailableIcds(data);
    },
  });
};
```

### 4. **Updated useLayoutQuery**

```typescript
// Now accepts optional icdId
export const useLayoutQuery = (icdId?: string) => {
  const setLayout = useStore((state) => state.setLayout);

  const query = useQuery({
    queryKey: ['layout', icdId || 'default'],
    queryFn: () => getLayout(icdId),
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

## 🎨 How to Add Icd Switcher (Future)

When you want to let users switch icds:

```tsx
function App() {
  const [selectedIcdId, setSelectedIcdId] = useState<string>('naqleen-jeddah');
  
  // Get list of icds
  const { data: icds } = useIcdsQuery();
  
  // Load selected icd
  const { data: layout } = useLayoutQuery(selectedIcdId);
  
  return (
    <div>
      {/* Icd Selector Dropdown */}
      <select 
        value={selectedIcdId} 
        onChange={(e) => setSelectedIcdId(e.target.value)}
      >
        {icds?.map(icd => (
          <option key={icd.id} value={icd.id}>
            {icd.name} - {icd.location}
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

**Currently:** Only Naqleen Jeddah icd is in the JSON file.

**Future:** Just add more icds to `naqleen_icds.json`:

```json
{
  "version": "2.0",
  "icds": {
    "naqleen-jeddah": { ... },     // ← Already exists
    "dubai-icd": { ... },      // ← Add this
    "riyadh-icd": { ... },     // ← Add this
    "dammam-icd": { ... }      // ← Add this
  }
}
```

---

## 🔄 Migration Path

**Backward Compatibility:**

The old `parseLayout` function is still available for legacy JSON:

```typescript
// Old JSON (naqleen_icd_terminals.json)
export const parseLayout = (json: any): IcdLayout => {
  return json.naqleen_icd_terminals;
};

// New JSON (naqleen_icds.json)
export const parseIcds = (json: IcdsData, icdId?: string): IcdLayout => {
  const firstIcdId = icdId || Object.keys(json.icds)[0];
  return json.icds[firstIcdId];
};
```

---

## 🎯 Key Benefits

| Feature | Old Structure | New Structure |
|---------|--------------|---------------|
| **Multiple Icds** | ❌ Not possible | ✅ Unlimited icds |
| **Icd Switching** | ❌ Requires code changes | ✅ Just change ID in hook |
| **Scalability** | ❌ Hard-coded | ✅ Fully scalable |
| **Caching** | Single cache entry | Per-icd caching |
| **Lookup Speed** | N/A | O(1) by ID |

---

## 🚀 Integration Example

### Current App (No Changes Needed)

```tsx
// Works exactly as before
function App() {
  const { data: layout } = useLayoutQuery();
  // Uses default icd (first in list)
}
```

### Future App (Multi-Icd)

```tsx
// With icd selection
function App() {
  const [icdId, setIcdId] = useState('naqleen-jeddah');
  const { data: layout } = useLayoutQuery(icdId);
  
  // Switch icds
  <button onClick={() => setIcdId('dubai-icd')}>
    Switch to Dubai
  </button>
}
```

---

## 📂 File Structure

```
public/
├── naqleen_icd_terminals.json  ← OLD (kept for reference)
└── naqleen_icds.json       ← NEW (scalable structure)

src/
├── utils/
│   └── layoutUtils.ts           ← Updated with new interfaces
├── api/
│   └── index.ts                 ← Updated with icd selection
└── store/
    └── store.ts                 ← No changes needed
```

---

## 🎓 Flutter Comparison

If this were Flutter:

```dart
// Old approach
final icd = icdData.naqleenIcdTerminals;

// New approach
final icds = {
  'naqleen-jeddah': Icd(...),
  'dubai-icd': Icd(...),
};

// Get specific icd
final icd = icds['naqleen-jeddah'];

// Or get first
final icd = icds.values.first;
```

Similar to having a `Map<String, Icd>` instead of a single `Icd` object.

---

## ✅ Summary

**What Changed:**
1. JSON structure now supports multiple icds
2. Added `id` field to `IcdLayout`
3. Added helper functions for parsing and listing icds
4. Updated `useLayoutQuery` to accept optional `icdId`

**What Stayed the Same:**
1. Component code (no breaking changes)
2. Store structure
3. Container generation logic
4. 3D rendering

**Future Steps:**
1. Add more icds to `naqleen_icds.json`
2. Add icd selector UI
3. Implement icd-specific features

---

🎉 **You now have a production-ready, scalable multi-icd architecture!**
