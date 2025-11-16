# backend/app/api/endpoints/players.py
from fastapi import APIRouter, HTTPException
from app.services.football_api import football_api_service

router = APIRouter()

@router.get("/players/popular")
async def get_popular_players():
    """Obtener jugadores populares para el juego"""
    try:
        players = await football_api_service.get_popular_players_for_game()
        
        if not players:
            raise HTTPException(
                status_code=404, 
                detail="No se pudieron cargar jugadores"
            )
        
        return {
            "success": True,
            "count": len(players),
            "players": players
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error obteniendo jugadores: {str(e)}"
        )

@router.get("/players/search/{team_name}")
async def search_players_by_team(team_name: str):
    """Buscar jugadores por nombre de equipo"""
    try:
        teams = await football_api_service.search_teams(team_name)
        
        if not teams:
            return {
                "success": False,
                "message": "No se encontró el equipo",
                "players": []
            }
        
        # Obtener jugadores del primer equipo encontrado
        team_id = teams[0]["idTeam"]
        players = await football_api_service.get_team_players(team_id)
        
        formatted_players = []
        for player in players:
            if player.get("strPlayer"):
                formatted_players.append({
                    "id": player.get("idPlayer"),
                    "name": player.get("strPlayer"),
                    "team": player.get("strTeam"),
                    "position": player.get("strPosition", "Jugador"),
                    "nationality": player.get("strNationality", "Desconocida"),
                    "thumb": player.get("strThumb")
                })
        
        return {
            "success": True,
            "team": teams[0]["strTeam"],
            "count": len(formatted_players),
            "players": formatted_players
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error buscando jugadores: {str(e)}"
        )