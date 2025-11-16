// frontend/src/services/footballService.ts
import { apiService } from './api';

class FootballService {
  // Obtener jugadores populares del backend - ENDPOINT CORREGIDO
  async getPopularPlayers() {
    return await apiService.get('/players/popular');
  }

  // Obtener jugadores aleatorios - NUEVO MÉTODO
  async getRandomPlayers(count: number = 10) {
    return await apiService.get(`/football/players/random?count=${count}`);
  }

  // Obtener todos los jugadores de fútbol - NUEVO MÉTODO
  async getAllFootballPlayers() {
    return await apiService.get('/football/players');
  }

  // Obtener jugadores para el juego (método principal) - CORREGIDO
  async getGamePlayers(): Promise<any[]> {
    try {
      console.log("🔄 Obteniendo jugadores del backend...");
      
      // Usar el endpoint CORRECTO que existe en tu backend
      const response = await this.getPopularPlayers();
      console.log("Respuesta del backend:", response);
      
      if (response.success && response.players && response.players.length > 0) {
        console.log(`✅ ${response.players.length} jugadores cargados de la API`);
        return response.players;
      } else {
        console.log("❌ No se pudieron cargar jugadores, usando fallback...");
        return await this.getFallbackPlayers();
      }
    } catch (error) {
      console.error("🚨 Error obteniendo jugadores:", error);
      return await this.getFallbackPlayers();
    }
  }

  // Fallback simplificado - ya no necesita buscar por equipos
  private async getFallbackPlayers(): Promise<any[]> {
    try {
      console.log("🔄 Intentando obtener jugadores aleatorios como fallback...");
      const response = await this.getRandomPlayers(15);
      
      if (response.success && response.players && response.players.length > 0) {
        console.log(`✅ ${response.players.length} jugadores cargados del fallback`);
        return response.players;
      } else {
        return this.getMinimalFallbackPlayers();
      }
    } catch (error) {
      console.error("Error en fallback:", error);
      return this.getMinimalFallbackPlayers();
    }
  }

  // Datos mínimos de fallback (actualizados con thumb)
  private getMinimalFallbackPlayers(): any[] {
    console.log("⚠️ Usando datos mínimos de fallback");
    return [
      {
        id: '1',
        name: 'Lionel Messi',
        team: 'Inter Miami',
        position: 'Forward',
        nationality: 'Argentina',
        thumb: null
      },
      {
        id: '2', 
        name: 'Cristiano Ronaldo',
        team: 'Al Nassr',
        position: 'Forward',
        nationality: 'Portugal',
        thumb: null
      },
      {
        id: '3',
        name: 'Kylian Mbappé',
        team: 'PSG',
        position: 'Forward',
        nationality: 'France',
        thumb: null
      },
      {
        id: '4',
        name: 'Kevin De Bruyne',
        team: 'Manchester City',
        position: 'Midfielder',
        nationality: 'Belgium',
        thumb: null
      },
      {
        id: '5',
        name: 'Virgil van Dijk',
        team: 'Liverpool',
        position: 'Defender',
        nationality: 'Netherlands',
        thumb: null
      }
    ];
  }
}

export const footballService = new FootballService();