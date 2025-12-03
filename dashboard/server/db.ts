// Frappe API configuration
export const FRAPPE_BASE_URL = process.env.FRAPPE_BACKEND_URL || "http://localhost:8000";

// Simple API client for Frappe backend
export const frappeApi = {
  baseURL: FRAPPE_BASE_URL,
  
  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Important for session cookies
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response.json();
  },
  
  get(endpoint: string) {
    return this.request(endpoint);
  },
  
  post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  delete(endpoint: string) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  },
};
