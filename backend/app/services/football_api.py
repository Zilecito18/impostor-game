# backend/app/services/football_api.py
import httpx
import os
from typing import List, Dict, Any, Optional

class FootballAPIService:
    def __init__(self):
        self.base_url = "https://www.thesportsdb.com/api/v1/json"
        self.api_key = os.getenv("SPORTSDB_API_KEY", "1")  # Clave gratuita
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def make_request(self, endpoint: str) -> Dict[str, Any]:
        """Método genérico para hacer requests"""
        url = f"{self.base_url}/{self.api_key}{endpoint}"
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    # 1. Obtener jugadores de un equipo específico
    async def get_team_players(self, team_id: str) -> List[Dict[str, Any]]:
        """Obtener todos los jugadores de un equipo"""
        result = await self.make_request(f"/lookup_all_players.php?id={team_id}")
        return result.get("player", [])
    
    # 2. Buscar equipos por nombre
    async def search_teams(self, team_name: str) -> List[Dict[str, Any]]:
        """Buscar equipos por nombre"""
        result = await self.make_request(f"/searchteams.php?t={team_name}")
        return result.get("teams", [])
    
    # 3. Obtener equipos de una liga
    async def get_teams_by_league(self, league_name: str) -> List[Dict[str, Any]]:
        """Obtener equipos de una liga específica"""
        result = await self.make_request(f"/search_all_teams.php?l={league_name}")
        return result.get("teams", [])
    
    # 4. Buscar jugadores por nombre
    async def search_players(self, player_name: str) -> List[Dict[str, Any]]:
        """Buscar jugadores por nombre"""
        result = await self.make_request(f"/searchplayers.php?p={player_name}")
        return result.get("player", [])
    
    # 5. Obtener jugadores populares para el juego
    async def get_popular_players_for_game(self) -> List[Dict[str, Any]]:
        """Obtener jugadores de equipos populares para el juego"""
        
        # IDs de equipos populares en The Sports DB
        popular_team_ids = [
            "133602",  # Real Madrid
            "133738",  # Barcelona
            "134301",  # Manchester United
            "134300",  # Liverpool
            "134302",  # Bayern Munich
            "133739",  # Paris Saint-Germain
            "134503",  # Juventus
            "133610",  # Chelsea
            "133616",  # Arsenal
            "134301"   # Manchester City
        ]
        
        all_players = []
        
        for team_id in popular_team_ids:
            try:
                players = await self.get_team_players(team_id)
                for player in players:
                    # Filtrar y formatear jugadores para el juego
                    if player.get("strPlayer") and player.get("strPosition"):
                        formatted_player = {
                            "id": player.get("idPlayer"),
                            "name": player.get("strPlayer"),
                            "team": player.get("strTeam", "Desconocido"),
                            "position": player.get("strPosition", "Jugador"),
                            "nationality": player.get("strNationality", "Desconocida"),
                            "thumb": player.get("strThumb"),  # Foto
                            "description": player.get("strDescriptionEN", ""),
                            "birth_date": player.get("dateBorn", ""),
                            "birth_place": player.get("strBirthLocation", "")
                        }
                        all_players.append(formatted_player)
            except Exception as e:
                print(f"Error obteniendo jugadores del equipo {team_id}: {e}")
                continue
        
        # Limitar a 50 jugadores máximo y eliminar duplicados
        unique_players = {player["id"]: player for player in all_players}.values()
        return list(unique_players)[:50]

football_api_service = FootballAPIService()