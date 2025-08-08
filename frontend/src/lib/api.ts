// Use the Vite dev server proxy for API requests
export const API_BASE: string = import.meta.env.VITE_API_BASE_URL || "/api";
console.log("API Base URL:", API_BASE); // Debug log to check the actual URL being used

export async function postJson<T = any>(path: string, body: any, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const url = `${API_BASE}${path}`;
  console.log(`Posting to: ${url}`, { headers: { ...headers, Authorization: token ? '(Bearer token present)' : 'none' } });
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      mode: 'cors', // Explicitly request CORS
      credentials: 'include' // Include credentials for cookies
    });
    
    if (!res.ok) {
      // Try to parse error response
      let errorMessage = `HTTP ${res.status}`;
      try {
        const errorData = await res.json();
        errorMessage = errorData.detail || errorMessage;
        console.error(`API Error (${res.status}):`, errorData);
      } catch (e) {
        console.error(`Could not parse error response: ${e}`);
      }
      throw new Error(errorMessage);
    }
    
    return res.json();
  } catch (error) {
    console.error(`Failed to post to ${url}:`, error);
    throw error;
  }
}

export async function getJson<T = any>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    // Add explicit content-type and accept headers
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const url = `${API_BASE}${path}`;
  console.log(`Fetching from: ${url}`);
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
      mode: 'cors', // Explicitly request CORS
      credentials: 'include' // Include credentials for cookies
    });
    
    if (!res.ok) {
      // Try to parse error response
      let errorMessage = `HTTP ${res.status}`;
      try {
        const errorData = await res.json();
        errorMessage = errorData.detail || errorMessage;
        console.error(`API Error (${res.status}):`, errorData);
      } catch (e) {
        console.error(`Could not parse error response: ${e}`);
      }
      throw new Error(errorMessage);
    }
    
    return res.json();
  } catch (error) {
    console.error(`Failed to fetch from ${url}:`, error);
    throw error;
  }
}

export async function pingHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// Authentication API functions
export async function loginUser(email: string, password: string): Promise<{ access_token: string; token_type: string }> {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);
  
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: formData,
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Login failed');
  }
  
  return res.json();
}

export async function registerUser(email: string, password: string, role: 'teacher' | 'student'): Promise<{ access_token: string; token_type: string }> {
  return postJson('/auth/register', { email, password, role });
}

export async function getUserProfile(token: string): Promise<any> {
  return getJson('/auth/me', token);
}

// Activities API
export async function fetchActivities(token: string): Promise<any[]> {
  return getJson('/activities', token);
}

export async function createActivity(activityData: any, token: string): Promise<any> {
  return postJson('/activities', activityData, token);
}

export async function deleteActivity(activityId: string, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/activities/${activityId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP ${res.status}`);
  }
  
  return res.json();
}

export async function getActivityById(activityId: string, token: string): Promise<any> {
  return getJson(`/activities/${activityId}`, token);
}

export async function submitAttempt(activityId: string, attemptData: any, token: string): Promise<any> {
  return postJson(`/activities/${activityId}/attempts`, attemptData, token);
}

