import { API_CONFIG } from '../config/api';

export interface CreateRoomData {
  player_name: string;
  max_players?: number;
  total_rounds?: number;
  debate_mode?: boolean;
}

export interface JoinRoomData {
  player_name: string;
  room_code: string;
}

class RoomService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    console.log(`🎯 RoomService inicializado con base URL: ${this.baseUrl}`);
  }

  async createRoom(roomData: CreateRoomData) {
    console.log('📝 Creando sala con datos:', roomData);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomData),
      });

      console.log(`📨 Respuesta crear sala - Status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error crear sala:', errorText);
        throw new Error(errorText || `Error HTTP! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Sala creada exitosamente:', result);
      return result;

    } catch (error) {
      console.error('💥 Error crítico crear sala:', error);
      throw error;
    }
  }

  async joinRoom(joinData: JoinRoomData) {
    console.log('🚪 Uniéndose a sala con datos:', joinData);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(joinData),
      });

      console.log(`📨 Respuesta unirse sala - Status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error unirse sala:', errorText);
        
        // Parsear error específico del backend si es posible
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.detail || errorText);
        } catch {
          throw new Error(errorText || `Error HTTP! status: ${response.status}`);
        }
      }

      const result = await response.json();
      console.log('✅ Unido a sala exitosamente:', result);
      return result;

    } catch (error) {
      console.error('💥 Error crítico unirse sala:', error);
      throw error;
    }
  }

  async getRoom(roomCode: string) {
    console.log(`🔍 Obteniendo información de sala: ${roomCode}`);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/${roomCode}`);
      
      console.log(`📨 Respuesta obtener sala - Status: ${response.status}`);

      if (!response.ok) {
        // Si es error 404, la sala no existe
        if (response.status === 404) {
          throw new Error('Sala no encontrada');
        }
        throw new Error(`Error HTTP! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Información de sala obtenida:', result);
      return result;

    } catch (error) {
      console.error('💥 Error obtener sala:', error);
      throw error;
    }
  }

  async startGame(roomCode: string) {
    console.log(`🎮 Iniciando juego en sala: ${roomCode}`);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/game/${roomCode}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`📨 Respuesta iniciar juego - Status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error iniciar juego:', errorText);
        
        // Parsear error específico del backend si es posible
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.detail || errorText);
        } catch {
          throw new Error(errorText || `Error HTTP! status: ${response.status}`);
        }
      }

      const result = await response.json();
      console.log('✅ Juego iniciado exitosamente:', result);
      return result;

    } catch (error) {
      console.error('💥 Error crítico iniciar juego:', error);
      throw error;
    }
  }

  // Método adicional para debug
  async debugRooms() {
    try {
      const response = await fetch(`${this.baseUrl}/debug/rooms`);
      if (!response.ok) {
        throw new Error(`Error HTTP! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error obteniendo debug info:', error);
      return { error: 'No se pudo obtener información de debug' };
    }
  }

  // Método para verificar conexión con el backend
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      if (!response.ok) {
        throw new Error(`Backend no responde correctamente. Status: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, message: 'Backend conectado', data };
    } catch (error) {
      console.error('❌ Health check falló:', error);
      return { 
        success: false, 
        message: 'No se pudo conectar con el backend',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

export const roomService = new RoomService();

// Health check automático al cargar el servicio
roomService.healthCheck().then(result => {
  if (result.success) {
    console.log('🏥 Health check exitoso:', result.message);
  } else {
    console.warn('⚠️ Health check falló:', result.message);
  }
});