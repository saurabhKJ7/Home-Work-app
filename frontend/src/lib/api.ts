export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000";

export async function postJson<T = any>(path: string, body: any, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP ${res.status}`);
  }
  
  return res.json();
}

export async function getJson<T = any>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP ${res.status}`);
  }
  
  return res.json();
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

