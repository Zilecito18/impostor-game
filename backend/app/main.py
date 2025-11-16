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

load_dotenv()

app = FastAPI(title="Impostor Game API", docs_url="/api/docs")

# ✅ CORS actualizado para producción
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://impostor-game-frontend.onrender.com",  # Tu frontend en producción
        "http://localhost:3000", 
        "http://localhost:5173",
        "*"  # Temporal para pruebas
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== MODELOS ==========
class Player(BaseModel):
    id: str
    name: str
    is_host: bool = False
    is_alive: bool = True
    is_impostor: bool = False
    assigned_player: Optional[Dict] = None
    is_ready: bool = False

class Room(BaseModel):
    code: str
    players: List[Player] = []
    status: str = "waiting"  # waiting, playing, finished
    max_players: int = 15
    current_round: int = 1
    total_rounds: int = 5
    debate_mode: bool = False
    debate_time: int = 5
    game_started: bool = False

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
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        return {"error": f"HTTP {response.status}"}
        except Exception as e:
            print(f"Error en request a API: {e}")
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
                if players and isinstance(players, list):
                    for player in players:
                        # Filtrar y formatear jugadores para el juego
                        if player.get("strPlayer") and player.get("strPosition"):
                            formatted_player = {
                                "id": player.get("idPlayer", str(random.randint(1000, 9999))),
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
        unique_players = {player["name"]: player for player in all_players}.values()
        return list(unique_players)[:30]  # Máximo 30 jugadores
    
    async def get_players(self):
        """Método principal para obtener jugadores (con fallback)"""
        try:
            players = await self.get_popular_players_for_game()
            if players and len(players) > 5:
                print(f"✅ Obtenidos {len(players)} jugadores reales de la API")
                return players
            else:
                print("⚠️ Usando jugadores de fallback")
                return self._get_fallback_players()
        except Exception as e:
            print(f"❌ Error obteniendo jugadores reales: {e}")
            return self._get_fallback_players()
    
    def _get_fallback_players(self):
        """Jugadores de respaldo si la API falla"""
        return [
            {"id": "1", "name": "Lionel Messi", "team": "Inter Miami", "position": "Delantero", "nationality": "Argentina", "thumb": None},
            {"id": "2", "name": "Cristiano Ronaldo", "team": "Al Nassr", "position": "Delantero", "nationality": "Portugal", "thumb": None},
            {"id": "3", "name": "Kylian Mbappé", "team": "PSG", "position": "Delantero", "nationality": "Francia", "thumb": None},
            {"id": "4", "name": "Kevin De Bruyne", "team": "Manchester City", "position": "Mediocampista", "nationality": "Bélgica", "thumb": None},
            {"id": "5", "name": "Virgil van Dijk", "team": "Liverpool", "position": "Defensa", "nationality": "Holanda", "thumb": None},
            {"id": "6", "name": "Robert Lewandowski", "team": "Barcelona", "position": "Delantero", "nationality": "Polonia", "thumb": None},
            {"id": "7", "name": "Mohamed Salah", "team": "Liverpool", "position": "Delantero", "nationality": "Egipto", "thumb": None},
            {"id": "8", "name": "Erling Haaland", "team": "Manchester City", "position": "Delantero", "nationality": "Noruega", "thumb": None},
            {"id": "9", "name": "Neymar Jr", "team": "Al Hilal", "position": "Delantero", "nationality": "Brasil", "thumb": None},
            {"id": "10", "name": "Luka Modric", "team": "Real Madrid", "position": "Mediocampista", "nationality": "Croacia", "thumb": None},
        ]

football_service = FootballService()

# ========== WEBSOCKETS CORREGIDO ==========
async def broadcast_to_room(room_code: str, message: dict):
    """Enviar mensaje a todos en una sala"""
    print(f"📢 [BROADCAST] Enviando a sala {room_code}. Conexiones activas: {len(active_connections.get(room_code, []))}")
    print(f"📨 [BROADCAST] Mensaje: {message.get('type', 'unknown')}")
    
    if room_code in active_connections:
        disconnected = []
        successful = 0
        
        for i, connection in enumerate(active_connections[room_code]):
            try:
                await connection.send_json(message)
                successful += 1
                print(f"  ✅ [BROADCAST] Mensaje enviado a conexión {i+1}")
            except Exception as e:
                print(f"  ❌ [BROADCAST] Error enviando a conexión {i+1}: {e}")
                disconnected.append(connection)
        
        print(f"📊 [BROADCAST] Resumen: {successful} mensajes enviados, {len(disconnected)} errores")
        
        # Limpiar conexiones desconectadas
        for connection in disconnected:
            active_connections[room_code].remove(connection)
    else:
        print(f"❌ [BROADCAST] No hay conexiones activas en la sala {room_code}")

@app.websocket("/api/ws/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str):
    """WebSocket para comunicación en tiempo real"""
    await websocket.accept()
    
    # Registrar conexión
    if room_code not in active_connections:
        active_connections[room_code] = []
    active_connections[room_code].append(websocket)
    
    room = rooms_db.get(room_code)
    print(f"🔗 [WS] WebSocket conectado a sala {room_code}. Conexiones totales: {len(active_connections[room_code])}")
    
    try:
        # Enviar estado actual al conectar
        if room:
            await websocket.send_json({
                "type": "room_state",
                "room": room.dict(),
                "message": "Conectado a la sala"
            })
        
        while True:
            # Recibir mensajes del cliente
            data = await websocket.receive_text()
            
            try:
                message_data = json.loads(data)
                message_type = message_data.get("type")
                print(f"📨 [WS] Mensaje recibido en {room_code}: {message_type}")
                
                # Manejar diferentes tipos de mensajes
                if message_type == "chat_message":
                    await broadcast_to_room(room_code, {
                        "type": "chat_message",
                        "player_name": message_data.get("player_name"),
                        "player_id": message_data.get("player_id"),
                        "message": message_data.get("message"),
                        "timestamp": datetime.now().isoformat()
                    })
                
                elif message_type == "player_ready":
                    # Actualizar estado del jugador
                    if room:
                        for player in room.players:
                            if player.id == message_data.get("player_id"):
                                player.is_ready = message_data.get("is_ready", True)
                                break
                    
                    await broadcast_to_room(room_code, {
                        "type": "player_ready",
                        "player_id": message_data.get("player_id"),
                        "player_name": message_data.get("player_name"),
                        "is_ready": message_data.get("is_ready", True),
                        "room": room.dict() if room else None
                    })
                
                elif message_type == "start_game":
                    print(f"🎮 [WS] Solicitando inicio de juego en sala {room_code}")
                    # ✅ CORREGIDO: Lógica para iniciar juego
                    if room and not room.game_started:
                        await start_game_internal(room_code)
                    else:
                        # Informar al cliente que no se puede iniciar
                        error_msg = "No se puede iniciar el juego"
                        if not room:
                            error_msg = "Sala no encontrada"
                        elif room.game_started:
                            error_msg = "El juego ya comenzó"
                        
                        await websocket.send_json({
                            "type": "error",
                            "message": error_msg
                        })
                        print(f"❌ [WS] {error_msg} en sala {room_code}")
                
                else:
                    # Echo solo para el remitente
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
        print(f"❌ [WS] WebSocket error en {room_code}: {e}")
    finally:
        # Limpiar al desconectar
        if room_code in active_connections and websocket in active_connections[room_code]:
            active_connections[room_code].remove(websocket)
            print(f"🔌 [WS] WebSocket desconectado de {room_code}. Restantes: {len(active_connections[room_code])}")

# ========== ENDPOINTS HTTP ==========
@app.post("/api/rooms/create")
async def create_room(room_data: RoomCreate):
    """Crear una nueva sala"""
    # Generar código único
    while True:
        code = ''.join(random.choices(string.ascii_uppercase, k=6))
        if code not in rooms_db:
            break
    
    host_player = Player(
        id=f"player_{random.randint(1000, 9999)}",
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
    if code not in active_connections:
        active_connections[code] = []
    
    print(f"✅ [API] Sala creada: {code} por {room_data.player_name}")
    
    return {
        "success": True,
        "room_code": code,
        "message": f"Sala {code} creada exitosamente",
        "room": room.dict(),
        "player_id": host_player.id
    }

@app.post("/api/rooms/join")
async def join_room(join_data: RoomJoin):
    """Unirse a una sala existente"""
    room_code = join_data.room_code.upper()
    room = rooms_db.get(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    
    if room.game_started:
        raise HTTPException(status_code=400, detail="El juego ya comenzó en esta sala")
    
    if len(room.players) >= room.max_players:
        raise HTTPException(status_code=400, detail="Sala llena")
    
    # Verificar si el nombre ya existe
    if any(player.name.lower() == join_data.player_name.lower() for player in room.players):
        raise HTTPException(status_code=400, detail="Nombre ya existe en la sala")
    
    new_player = Player(
        id=f"player_{random.randint(1000, 9999)}",
        name=join_data.player_name,
        is_host=False
    )
    
    room.players.append(new_player)
    
    print(f"✅ [API] {join_data.player_name} se unió a la sala {room_code}")
    
    # Notificar a todos via WebSocket
    await broadcast_to_room(room_code, {
        "type": "player_joined",
        "message": f"{join_data.player_name} se unió a la sala",
        "room": room.dict(),
        "player": new_player.dict()
    })
    
    return {
        "success": True,
        "room": room.dict(),
        "player_id": new_player.id,
        "message": f"Te uniste a la sala {room_code}"
    }

@app.get("/api/rooms/{room_code}")
async def get_room(room_code: str):
    """Obtener información de una sala"""
    room = rooms_db.get(room_code.upper())
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    
    return {
        "success": True,
        "room": room.dict()
    }

async def start_game_internal(room_code: str):
    """Lógica interna para iniciar juego"""
    room = rooms_db.get(room_code)
    if not room:
        print(f"❌ [GAME] Sala {room_code} no encontrada")
        return
    
    if len(room.players) < 2:
        print(f"❌ [GAME] No hay suficientes jugadores en {room_code}: {len(room.players)}")
        raise HTTPException(status_code=400, detail="Se necesitan al menos 2 jugadores")
    
    print(f"🎮 [GAME] Iniciando juego en sala {room_code} con {len(room.players)} jugadores")
    
    # ✅ AGREGAR LOGS DE DIAGNÓSTICO
    active_conn_count = len(active_connections.get(room_code, []))
    print(f"🔊 [GAME] Conexiones activas en {room_code}: {active_conn_count}")
    
    # Obtener jugadores de fútbol
    football_players = await football_service.get_players()
    random.shuffle(football_players)
    
    # Asignar impostor
    impostor = random.choice(room.players)
    impostor.is_impostor = True
    print(f"🎭 [GAME] Impostor asignado: {impostor.name} (ID: {impostor.id})")
    
    # Asignar jugadores de fútbol
    assigned_players = {}
    available_football_players = football_players[:len(room.players)]
    
    for i, player in enumerate(room.players):
        if i < len(available_football_players):
            player_data = available_football_players[i]
            assigned_players[player.id] = player_data
            # Solo los jugadores normales conocen su personaje
            if player.id != impostor.id:
                player.assigned_player = player_data
                print(f"👤 [GAME] {player.name} asignado a: {player_data['name']}")
            else:
                print(f"🕵️ [GAME] {player.name} es el IMPOSTOR")
    
    room.status = "playing"
    room.game_started = True
    
    # ✅ MENSAJE COMPLETO PARA BROADCAST
    game_started_message = {
        "type": "game_started",
        "message": "¡El juego ha comenzado!",
        "room": room.dict(),
        "impostor_id": impostor.id,
        "assigned_players": assigned_players,
        "football_players": available_football_players,
        "timestamp": datetime.now().isoformat()
    }
    
    print(f"📤 [GAME] Enviando mensaje 'game_started' a {active_conn_count} conexiones")
    
    # Notificar inicio del juego via WebSocket
    await broadcast_to_room(room_code, game_started_message)
    
    print(f"✅ [GAME] Juego iniciado en {room_code}. Impostor: {impostor.name}")

@app.post("/api/game/{room_code}/start")
async def start_game(room_code: str):
    """Iniciar el juego en una sala"""
    room_code_upper = room_code.upper()
    print(f"🎯 [API] Solicitando inicio de juego para sala: {room_code_upper}")
    
    await start_game_internal(room_code_upper)
    
    room = rooms_db.get(room_code_upper)
    return {
        "success": True,
        "message": "Juego iniciado",
        "room": room.dict() if room else None
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

@app.get("/api/players/popular")
async def get_popular_players():
    """Obtener jugadores populares para el juego"""
    try:
        players = await football_service.get_players()
        
        if not players:
            return {
                "success": True,
                "count": 0,
                "players": [],
                "message": "Usando jugadores de respaldo"
            }
        
        return {
            "success": True,
            "count": len(players),
            "players": players
        }
        
    except Exception as e:
        print(f"❌ Error en get_popular_players: {e}")
        return {
            "success": True,
            "count": 0,
            "players": football_service._get_fallback_players(),
            "message": "Usando jugadores de respaldo por error"
        }

# ========== ENDPOINTS DE INFORMACIÓN ==========
@app.get("/")
async def root():
    return {
        "message": "🚀 AM⚽NG US API está funcionando!",
        "version": "1.0",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "create_room": "POST /api/rooms/create",
            "join_room": "POST /api/rooms/join", 
            "get_room": "GET /api/rooms/{code}",
            "start_game": "POST /api/game/{code}/start",
            "get_players": "GET /api/players/popular",
            "websocket": "WS /api/ws/{code}",
            "docs": "GET /api/docs"
        }
    }

@app.get("/api/health")
async def health_check():
    """Health check para Render"""
    return {
        "status": "healthy",
        "service": "impostor-game-backend",
        "timestamp": datetime.now().isoformat(),
        "active_rooms": len(rooms_db),
        "active_connections": sum(len(conns) for conns in active_connections.values())
    }

@app.get("/debug/rooms")
async def debug_rooms():
    """Endpoint de debug para ver todas las salas"""
    return {
        "total_rooms": len(rooms_db),
        "rooms": {code: {
            "player_count": len(room.players),
            "players": [p.name for p in room.players],
            "game_started": room.game_started,
            "status": room.status
        } for code, room in rooms_db.items()},
        "active_connections": {code: len(conns) for code, conns in active_connections.items()}
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)