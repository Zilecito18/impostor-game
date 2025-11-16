// frontend/src/services/footballService.ts
const API_BASE_URL = 'https://impostor-game-backend-pl8h.onrender.com/api';

class FootballService {
  async getPopularPlayers() {
    try {
      console.log('🌐 Obteniendo jugadores populares...');
      const response = await fetch(`${API_BASE_URL}/players/popular`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Jugadores obtenidos:', data);
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo jugadores:', error);
      return { success: false, players: this.getMinimalFallbackPlayers() };
    }
  }

  async getGamePlayers(): Promise<any[]> {
    try {
      const response = await this.getPopularPlayers();
      
      if (response.success && response.players && response.players.length > 0) {
        return response.players;
      } else {
        return this.getMinimalFallbackPlayers();
      }
    } catch (error) {
      console.error("Error obteniendo jugadores:", error);
      return this.getMinimalFallbackPlayers();
    }
  }

  private getMinimalFallbackPlayers(): any[] {
    return [
      { id: '1', name: 'Lionel Messi', team: 'Inter Miami', position: 'Forward', nationality: 'Argentina' },
      { id: '2', name: 'Cristiano Ronaldo', team: 'Al Nassr', position: 'Forward', nationality: 'Portugal' }
    ];
  }
}

export const footballService = new FootballService();