// frontend/src/services/roomService.ts
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
    this.baseUrl = 'https://impostor-game-backend-pl8h.onrender.com';
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
        throw new Error(errorText || `Error HTTP! status: ${response.status}`);
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
        throw new Error(errorText || `Error HTTP! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Juego iniciado exitosamente:', result);
      return result;

    } catch (error) {
      console.error('💥 Error crítico iniciar juego:', error);
      throw error;
    }
  }
}

export const roomService = new RoomService();