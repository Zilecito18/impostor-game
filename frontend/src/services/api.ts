// frontend/src/services/api.ts
const API_BASE_URL = 'https://impostor-game-backend-pl8h.onrender.com/'; // Tu backend FastAPI

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL; // ✅ Usa la constante local, no API_CONFIG
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  async get(endpoint: string) {
    // ✅ URL directa a TU backend (no a The Sports DB)
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log('🌐 Fetching from:', url);
    
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async post(endpoint: string, data: any) {
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log('🌐 POST to:', url, data);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
}

export const apiService = new ApiService();