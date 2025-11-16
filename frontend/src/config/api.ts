// frontend/src/services/api.ts
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',  // Backend FastAPI
};

const API_BASE_URL = `${API_CONFIG.BASE_URL}/api`;

class ApiService {
  async get(endpoint: string) {
    console.log(`🌐 Haciendo request a: ${API_BASE_URL}${endpoint}`);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`📨 Respuesta recibida de ${endpoint}:`, data);
    return data;
  }

  async post(endpoint: string, data: any) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  }
}

export const apiService = new ApiService();
