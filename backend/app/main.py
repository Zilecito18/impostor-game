from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import random
import string
from datetime import datetime
import asyncio
import aiohttp
import os
import json
from dotenv import load_dotenv

# ELIMINA ESTAS LÍNEAS:
# from app.api.endpoints import game, rooms, players  # ← Eliminar estas líneas

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ELIMINA ESTAS LÍNEAS:
# app.include_router(players.router, prefix="/api", tags=["players"])  # ← Eliminar
# app.include_router(rooms.router, prefix="/api", tags=["rooms"])
# app.include_router(game.router, prefix="/api", tags=["game"])

load_dotenv()

# ========== MODELOS ==========
class Player(BaseModel):
    id: str
    name: str
    is_host: bool = False
    is_alive: bool = True
    is_impostor: bool = False
    assigned_player: Optional[Dict] = None

class Room(BaseModel):
    code: str
    players: List[Player] = []
    status: str = "waiting"  # waiting, playing, finished
    max_players: int = 15
    current_round: int = 1
    total_rounds: int = 5
    debate_mode: bool = False
    debate_time: int = 5

class RoomCreate(BaseModel):
    player_name: str
    max_players: int = 15
    total_rounds: int = 5
    debate_mode: bool = False

class RoomJoin(BaseModel):
    player_name: str
    room_code: str

# ========== ALMACENAMIENTO ==========
rooms_db: Dict[str, Room] = {}
active_connections: Dict[str, List[WebSocket]] = {}

# ========== SERVICIO DE FÚTBOL ACTUALIZADO ==========
class FootballService:
    def __init__(self):
        self.base_url = "https://www.thesportsdb.com/api/v1/json"
        self.api_key = "1"  # Clave gratuita de The Sports DB
    
    async def make_request(self, endpoint: str):
        """Método genérico para hacer requests a The Sports DB"""
        url = f"{self.base_url}/{self.api_key}{endpoint}"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        return {"error": f"HTTP {response.status}"}
        except Exception as e:
            return {"error": str(e)}
    
    async def get_team_players(self, team_id: str):
        """Obtener todos los jugadores de un equipo"""
        result = await self.make_request(f"/lookup_all_players.php?id={team_id}")
        return result.get("player", [])
    
    async def search_teams(self, team_name: str):
        """Buscar equipos por nombre"""
        result = await self.make_request(f"/searchteams.php?t={team_name}")
        return result.get("teams", [])
    
    async def get_popular_players_for_game(self):
        """Obtener jugadores de equipos populares para el juego"""
        
        # IDs de equipos populares en The Sports DB
        popular_team_ids = [
            "133602",  # Real Madrid
            "133738",  # Barcelona
            "134301",  # Manchester United
            "134300",  # Liverpool
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
                            "thumb": player.get("strThumb"),
                        }
                        all_players.append(formatted_player)
            except Exception as e:
                print(f"Error obteniendo jugadores del equipo {team_id}: {e}")
                continue
        
        # Limitar y eliminar duplicados
        unique_players = {player["id"]: player for player in all_players}.values()
        return list(unique_players)[:30]  # Máximo 30 jugadores
    
    async def get_players(self):
        """Método principal para obtener jugadores (con fallback)"""
        try:
            players = await self.get_popular_players_for_game()
            if players:
                return players
            else:
                return self._get_fallback_players()
        except Exception as e:
            print(f"Error obteniendo jugadores reales: {e}")
            return self._get_fallback_players()
    
    def _get_fallback_players(self):
        return [
            {"id": "1", "name": "Lionel Messi", "team": "Inter Miami", "position": "Forward", "nationality": "Argentina", "thumb": None},
            {"id": "2", "name": "Cristiano Ronaldo", "team": "Al Nassr", "position": "Forward", "nationality": "Portugal", "thumb": None},
            {"id": "3", "name": "Kylian Mbappé", "team": "PSG", "position": "Forward", "nationality": "France", "thumb": None},
            {"id": "4", "name": "Kevin De Bruyne", "team": "Manchester City", "position": "Midfielder", "nationality": "Belgium", "thumb": None},
            {"id": "5", "name": "Virgil van Dijk", "team": "Liverpool", "position": "Defender", "nationality": "Netherlands", "thumb": None},
            {"id": "6", "name": "Robert Lewandowski", "team": "Barcelona", "position": "Forward", "nationality": "Poland", "thumb": None},
            {"id": "7", "name": "Mohamed Salah", "team": "Liverpool", "position": "Forward", "nationality": "Egypt", "thumb": None},
            {"id": "8", "name": "Erling Haaland", "team": "Manchester City", "position": "Forward", "nationality": "Norway", "thumb": None},
        ]

football_service = FootballService()

# ========== WEBSOCKETS ==========
async def broadcast_to_room(room_code: str, message: dict):
    """Enviar mensaje a todos en una sala"""
    if room_code in active_connections:
        disconnected = []
        for connection in active_connections[room_code]:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error enviando mensaje WebSocket: {e}")
                disconnected.append(connection)
        
        # Limpiar conexiones desconectadas
        for connection in disconnected:
            active_connections[room_code].remove(connection)

@app.websocket("/ws/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str):
    """WebSocket para comunicación en tiempo real"""
    await websocket.accept()
    
    # Registrar conexión
    if room_code not in active_connections:
        active_connections[room_code] = []
    active_connections[room_code].append(websocket)
    
    print(f"🔗 WebSocket conectado a sala {room_code}. Total: {len(active_connections[room_code])}")
    
    try:
        while True:
            # Recibir mensajes del cliente
            data = await websocket.receive_text()
            
            try:
                message_data = json.loads(data)
                print(f"📨 Mensaje recibido: {message_data}")
                
                # Manejar diferentes tipos de mensajes
                message_type = message_data.get("type")
                
                if message_type == "chat_message":
                    await broadcast_to_room(room_code, {
                        "type": "chat_message",
                        "player_name": message_data.get("player_name"),
                        "message": message_data.get("message"),
                        "timestamp": datetime.now().isoformat()
                    })
                elif message_type == "player_ready":
                    await broadcast_to_room(room_code, {
                        "type": "player_ready",
                        "player_id": message_data.get("player_id"),
                        "player_name": message_data.get("player_name"),
                        "is_ready": message_data.get("is_ready", True)
                    })
                else:
                    # Echo para otros mensajes
                    await websocket.send_json({
                        "type": "echo",
                        "received": message_data,
                        "timestamp": datetime.now().isoformat()
                    })
                    
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Mensaje JSON inválido"
                })
            
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Limpiar al desconectar
        if room_code in active_connections and websocket in active_connections[room_code]:
            active_connections[room_code].remove(websocket)
        print(f"🔌 WebSocket desconectado de sala {room_code}")

# ========== ENDPOINTS HTTP ==========
@app.post("/api/rooms/create")
async def create_room(room_data: RoomCreate):
    """Crear una nueva sala"""
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    host_player = Player(
        id=f"player-{random.randint(1000, 9999)}",
        name=room_data.player_name,
        is_host=True
    )
    
    room = Room(
        code=code,
        players=[host_player],
        max_players=room_data.max_players,
        total_rounds=room_data.total_rounds,
        debate_mode=room_data.debate_mode
    )
    
    rooms_db[code] = room
    active_connections[code] = []
    
    return {
        "success": True,
        "room_code": code,
        "message": f"Sala {code} creada exitosamente",
        "room": room.dict()
    }

@app.post("/api/rooms/join")
async def join_room(join_data: RoomJoin):
    """Unirse a una sala existente"""
    room = rooms_db.get(join_data.room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    
    if len(room.players) >= room.max_players:
        raise HTTPException(status_code=400, detail="Sala llena")
    
    # Verificar si el nombre ya existe
    if any(player.name == join_data.player_name for player in room.players):
        raise HTTPException(status_code=400, detail="Nombre ya existe en la sala")
    
    new_player = Player(
        id=f"player-{random.randint(1000, 9999)}",
        name=join_data.player_name,
        is_host=False
    )
    
    room.players.append(new_player)
    
    # Notificar a todos via WebSocket
    await broadcast_to_room(join_data.room_code, {
        "type": "player_joined",
        "message": f"{join_data.player_name} se unió a la sala",
        "room": room.dict(),
        "player": new_player.dict()
    })
    
    return {
        "success": True,
        "room": room.dict(),
        "message": f"{join_data.player_name} se unió a la sala"
    }

@app.get("/api/rooms/{room_code}")
async def get_room(room_code: str):
    """Obtener información de una sala"""
    room = rooms_db.get(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    
    return room

@app.post("/api/game/{room_code}/start")
async def start_game(room_code: str):
    """Iniciar el juego en una sala"""
    room = rooms_db.get(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    
    if len(room.players) < 1:
        raise HTTPException(status_code=400, detail="Se necesitan más jugadores")
    
    # Obtener jugadores de fútbol REALES de The Sports DB
    football_players = await football_service.get_players()
    random.shuffle(football_players)
    
    # Asignar roles
    impostor = random.choice(room.players)
    impostor.is_impostor = True
    
    # Asignar jugadores de fútbol (el impostor no sabe)
    assigned_players = {}
    for i, player in enumerate(room.players):
        if i < len(football_players):
            player_data = football_players[i]
            assigned_players[player.id] = player_data
            # Solo los jugadores normales conocen su personaje
            if player.id != impostor.id:
                player.assigned_player = player_data
    
    room.status = "playing"
    
    # Notificar inicio del juego via WebSocket
    await broadcast_to_room(room_code, {
        "type": "game_started",
        "message": "¡El juego ha comenzado!",
        "room": room.dict(),
        "impostor_id": impostor.id,
        "assigned_players": assigned_players
    })
    
    return {
        "success": True,
        "message": "Juego iniciado",
        "impostor_id": impostor.id,
        "room": room.dict(),
        "assigned_players": assigned_players
    }

# ========== ENDPOINTS FÚTBOL ==========
@app.get("/api/football/players")
async def get_football_players():
    """Obtener jugadores de fútbol REALES de The Sports DB"""
    players = await football_service.get_players()
    return {
        "success": True,
        "count": len(players),
        "players": players
    }

@app.get("/api/football/players/random")
async def get_random_players(count: int = 10):
    """Obtener jugadores aleatorios"""
    all_players = await football_service.get_players()
    random.shuffle(all_players)
    selected_players = all_players[:min(count, len(all_players))]
    
    return {
        "success": True,
        "count": len(selected_players),
        "players": selected_players
    }

# ========== NUEVO ENDPOINT PARA EL FRONTEND ==========
@app.get("/api/players/popular")
async def get_popular_players():
    """Obtener jugadores populares para el juego (para el frontend)"""
    try:
        players = await football_service.get_players()
        
        if not players:
            raise HTTPException(status_code=404, detail="No se pudieron cargar jugadores")
        
        return {
            "success": True,
            "count": len(players),
            "players": players
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo jugadores: {str(e)}")

# ========== ENDPOINTS DE INFORMACIÓN ==========
@app.get("/")
async def root():
    return {
        "message": "🚀 AM⚽NG US API está funcionando!",
        "endpoints": {
            "create_room": "POST /api/rooms/create",
            "join_room": "POST /api/rooms/join", 
            "get_room": "GET /api/rooms/{code}",
            "start_game": "POST /api/game/{code}/start",
            "get_players": "GET /api/football/players",
            "get_popular_players": "GET /api/players/popular",  # ← Nuevo endpoint
            "websocket": "WS /ws/{code}"
        }
    }

@app.get("/debug/rooms")
async def debug_rooms():
    """Endpoint de debug para ver todas las salas"""
    return {
        "total_rooms": len(rooms_db),
        "rooms": {code: room.dict() for code, room in rooms_db.items()},
        "active_connections": {code: len(conns) for code, conns in active_connections.items()}
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)