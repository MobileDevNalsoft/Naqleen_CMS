# 🚀 Axios Implementation Guide

## What Changed

We replaced the native `fetch` API with **Axios** for better developer experience and production readiness.

---

## Before (fetch)

```typescript
export async function getLayout(): Promise<IcdLayout> {
    const r = await fetch('/naqleen_icd_terminals.json');
    if (!r.ok) throw new Error('Failed to fetch layout');
    return parseLayout(await r.json());
}
```

## After (axios)

```typescript
export async function getLayout(): Promise<IcdLayout> {
    const response = await apiClient.get('/naqleen_icd_terminals.json');
    return parseLayout(response.data);
}
```

---

## Key Benefits

### 1. **Automatic JSON Parsing**

**fetch:**
```typescript
const response = await fetch('/api/data');
const data = await response.json(); // Extra step
```

**axios:**
```typescript
const response = await apiClient.get('/api/data');
const data = response.data; // Already parsed
```

---

### 2. **Better Error Handling**

**fetch:** Only rejects on network errors, not HTTP errors (404, 500, etc.)
```typescript
const r = await fetch('/api/data');
if (!r.ok) throw new Error('Failed'); // Manual check needed
```

**axios:** Automatically throws on HTTP errors
```typescript
try {
  const response = await apiClient.get('/api/data');
} catch (error) {
  // Catches both network errors AND 4xx/5xx status codes
}
```

---

### 3. **Request/Response Interceptors**

Perfect for:
- Adding authentication tokens
- Logging requests/responses
- Global error handling
- Modifying requests/responses

**Example in `apiClient.ts`:**
```typescript
// Add auth token to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

### 4. **Timeout Support**

**fetch:** No built-in timeout
```typescript
// Complex AbortController setup needed
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);
fetch('/api/data', { signal: controller.signal });
```

**axios:** Built-in timeout
```typescript
const apiClient = axios.create({
  timeout: 10000, // 10 seconds
});
```

---

### 5. **Request Cancellation**

**axios:**
```typescript
const controller = new AbortController();

apiClient.get('/api/data', {
  signal: controller.signal,
});

// Cancel the request
controller.abort();
```

---

### 6. **Progress Tracking**

Useful for file uploads/downloads:

```typescript
await apiClient.post('/upload', formData, {
  onUploadProgress: (progressEvent) => {
    const percentCompleted = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    console.log(`Upload: ${percentCompleted}%`);
  },
});
```

---

### 7. **Base URL Configuration**

**fetch:** Repeat URL everywhere
```typescript
fetch('https://api.example.com/users');
fetch('https://api.example.com/posts');
```

**axios:** Set once, use everywhere
```typescript
const apiClient = axios.create({
  baseURL: 'https://api.example.com',
});

apiClient.get('/users'); // https://api.example.com/users
apiClient.get('/posts'); // https://api.example.com/posts
```

---

## Real-World Example: Adding Authentication

When you connect to a real API with authentication:

```typescript
// In apiClient.ts
apiClient.interceptors.request.use((config) => {
  // Get token from localStorage or store
  const token = localStorage.getItem('authToken');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Now all requests automatically include the token
apiClient.get('/containers'); // Includes Authorization header
apiClient.post('/containers', data); // Includes Authorization header
```

---

## Flutter Comparison

If you're familiar with Flutter's HTTP packages:

| Flutter | React (Axios) |
|---------|---------------|
| `http` package | `axios` |
| `Dio` package | Similar to `axios` |
| `FutureBuilder` | `useQuery` hook |
| `dio.interceptors.add()` | `apiClient.interceptors.use()` |
| `dio.options.baseUrl` | `axios.create({ baseURL })` |

---

## Your Project Structure

```
src/
├── api/
│   ├── apiClient.ts    ← Axios instance with interceptors
│   └── index.ts        ← API functions using apiClient
```

### `apiClient.ts` (Central Configuration)
- Axios instance
- Base URL
- Timeout
- Interceptors (logging, auth, error handling)

### `index.ts` (API Functions)
- `getLayout()` - Fetch icd layout
- Future functions for containers, users, etc.

---

## When to Use Axios vs Fetch

**Use Axios when:**
- ✅ Building production applications
- ✅ Need authentication/authorization
- ✅ Want consistent error handling
- ✅ Need request/response transformations
- ✅ Working with complex APIs

**Use fetch when:**
- ✅ Simple one-off requests
- ✅ Want to avoid dependencies
- ✅ Working with modern browser APIs (like Streams)

---

## Next Steps (For Real API Integration)

When you connect to your backend API:

1. **Update Base URL:**
```typescript
const apiClient = axios.create({
  baseURL: 'https://api.yourcompany.com',
  timeout: 10000,
});
```

2. **Add Authentication:**
```typescript
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken(); // From your auth system
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

3. **Add More API Functions:**
```typescript
// Get containers from real API
export async function getContainers() {
  const response = await apiClient.get('/v2/containers');
  return response.data;
}

// Create container
export async function createContainer(data: ContainerData) {
  const response = await apiClient.post('/v2/containers', data);
  return response.data;
}

// Update container
export async function updateContainer(id: string, data: Partial<ContainerData>) {
  const response = await apiClient.patch(`/v2/containers/${id}`, data);
  return response.data;
}
```

---

## Summary

**What you gained:**
- ✅ Cleaner, more concise code
- ✅ Better error handling
- ✅ Production-ready API client
- ✅ Easy to add auth, logging, error handling
- ✅ Centralized configuration

**Your code is now:**
- More maintainable
- More scalable
- Industry standard
- Ready for real API integration

---

🚀 You're now using the same API client approach used by professional React developers worldwide!
