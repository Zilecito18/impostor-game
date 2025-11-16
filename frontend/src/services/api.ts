// frontend/src/services/api.ts
const API_BASE_URL = 'https://impostor-game-backend-pl8h.onrender.com/api';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  private buildUrl(endpoint: string) {
    // CORREGIDO: Maneja correctamente las barras
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.baseUrl}/${cleanEndpoint}`;
  }

  async get(endpoint: string) {
    const url = this.buildUrl(endpoint);

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
    const url = this.buildUrl(endpoint);

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