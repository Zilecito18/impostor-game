from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import asyncio
import time

from app.services.room_service import room_service
from app.services.game_service import game_service

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_code: str):
        await websocket.accept()

        if room_code not in self.active_connections:
            self.active_connections[room_code] = []

        self.active_connections[room_code].append(websocket)
        print(f"🔗 Cliente conectado en sala {room_code} ({len(self.active_connections[room_code])} jugadores).")

        # Enviar estado actual de la sala al conectar
        room = room_service.get_room(room_code)
        await self.broadcast_to_room(room_code, {
            "type": "player_joined",
            "message": "Nuevo jugador conectado",
            "room": room.dict() if room else None
        })

    def disconnect(self, websocket: WebSocket, room_code: str):
        if room_code in self.active_connections:
            try:
                self.active_connections[room_code].remove(websocket)
            except:
                pass

            if len(self.active_connections[room_code]) == 0:
                del self.active_connections[room_code]

        print(f"🔌 Cliente desconectado en sala {room_code}")

    async def send_personal(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_json(message)
        except:
            pass

    async def broadcast_to_room(self, room_code: str, message: dict):
        if room_code not in self.active_connections:
            return

        disconnected = []
        for ws in self.active_connections[room_code]:
            try:
                await ws.send_json(message)
            except:
                disconnected.append(ws)

        # Limpiar desconectados
        for ws in disconnected:
            self.disconnect(ws, room_code)

manager = ConnectionManager()

@router.websocket("/ws/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str):
    await manager.connect(websocket, room_code)

    try:
        while True:
            raw_data = await websocket.receive_text()
            message = json.loads(raw_data)
            await handle_message(room_code, message, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_code)
        room = room_service.get_room(room_code)
        await manager.broadcast_to_room(room_code, {
            "type": "player_left",
            "message": "Un jugador ha salido de la sala",
            "room": room.dict() if room else None
        })

# ============================
# 👥 PLAYER JOIN/LEAVE
# ============================

async def handle_player_join(room_code: str, message: dict, websocket: WebSocket):
    player_id = message.get("playerId") or message.get("player_id")
    player_name = message.get("playerName") or message.get("player_name")
    
    print(f"👤 Player join: {player_id}, {player_name}")
    
    # Aquí deberías agregar el jugador a la sala
    room = room_service.get_room(room_code)
    if room:
        await manager.broadcast_to_room(room_code, {
            "type": "player_joined",
            "playerId": player_id,
            "playerName": player_name,
            "room": room.dict()
        })

async def handle_player_leave(room_code: str, message: dict, websocket: WebSocket):
    player_id = message.get("playerId") or message.get("player_id")
    
    print(f"👤 Player leave: {player_id}")
    
    # Aquí deberías remover el jugador de la sala
    room = room_service.get_room(room_code)
    if room:
        await manager.broadcast_to_room(room_code, {
            "type": "player_left",
            "playerId": player_id,
            "room": room.dict()
        })

# ============================
# 🎮 START GAME
# ============================

async def handle_start_game(room_code: str, message: dict, websocket: WebSocket):
    player_id = message.get("playerId") or message.get("player_id")
    room = room_service.get_room(room_code)
    
    print(f"🎮 Start game by: {player_id}")
    
    if not room:
        await manager.send_personal(websocket, {"type": "error", "message": "Sala no existe"})
        return

    game_data = await game_service.start_game(room_code)

    await manager.broadcast_to_room(room_code, {
        "type": "game_started",
        "message": "El juego ha comenzado",
        "gameState": game_data,
        "currentPhase": "role_assignment"
    })

# ============================
# 📝 ANSWER SUBMIT
# ============================

async def handle_submit_answer(room_code: str, message: dict, websocket: WebSocket):
    player_id = message.get("playerId") or message.get("player_id")
    answer = message.get("answer")
    round_id = message.get("roundId")

    await game_service.save_player_answer(room_code, player_id, round_id, answer)

    await manager.broadcast_to_room(room_code, {
        "type": "player_answer",
        "playerId": player_id,
        "answer": answer,
        "roundId": round_id,
        "allAnswersReceived": await game_service.all_answers_received(room_code)
    })

# ============================
# 🗳️ VOTES
# ============================

async def handle_cast_vote(room_code: str, message: dict, websocket: WebSocket):
    player_id = message.get("playerId") or message.get("player_id")
    voted_player_id = message.get("votedPlayerId") or message.get("voted_player_id")
    round_id = message.get("roundId")

    success = await game_service.cast_vote(room_code, player_id, voted_player_id)
    
    if not success:
        await manager.send_personal(websocket, {
            "type": "error", 
            "message": "Error procesando voto"
        })
        return

    current_votes = game_service.get_current_votes(room_code)
    all_votes_received = await game_service.all_votes_received(room_code)

    await manager.broadcast_to_room(room_code, {
        "type": "vote_submitted",
        "playerId": player_id,
        "votedPlayerId": voted_player_id,
        "roundId": round_id,
        "currentVotes": current_votes,
        "allVotesReceived": all_votes_received
    })

    # ✅ SOLO avanzar si TODOS han votado
    if all_votes_received:
        print("🗳️ Todos han votado, calculando resultados...")
        result = await game_service.calculate_voting_result(room_code)
        
        # ✅ ELIMINAR AL JUGADO VOTADO
        if result.get("eliminated_player"):
            eliminated_id = result["eliminated_player"]["id"]
            await game_service.eliminate_player(room_code, eliminated_id)

        await manager.broadcast_to_room(room_code, {
            "type": "voting_complete",
            "votingResults": result.get("results", []),
            "eliminatedPlayer": result.get("eliminated_player"),
            "wasImpostor": result.get("was_impostor", False),
            "nextPhase": "results",
            "room": room_service.get_room(room_code).dict()  # ✅ Enviar room actualizado
        })

# ============================
# 💬 CHAT
# ============================

async def handle_chat_message(room_code: str, message: dict, websocket: WebSocket):
    player_id = message.get("playerId") or message.get("player_id")
    chat_message = message.get("message")
    
    print(f"💬 Chat message from {player_id}: {chat_message}")
    
    await manager.broadcast_to_room(room_code, {
        "type": "chat_message",
        "playerId": player_id,
        "message": chat_message,
        "timestamp": time.time()
    })

# ============================
# ✅ PLAYER READY - HANDLER CRÍTICO
# ============================

async def handle_player_ready(room_code: str, message: dict, websocket: WebSocket):
    # ✅ CORREGIR: Usar snake_case consistentemente
    player_id = message.get("playerId") or message.get("player_id")
    is_ready = message.get("is_ready", True)
    phase = message.get("phase")
    
    print(f"🎯 Player {player_id} ready for phase {phase}. Data: {message}")

    if not player_id or not phase:
        await manager.send_personal(websocket, {
            "type": "error", 
            "message": "Faltan datos: playerId o phase"
        })
        return

    # Marcar jugador como listo en esta fase
    success = await game_service.mark_player_ready(room_code, player_id, phase, is_ready)
    
    if not success:
        await manager.send_personal(websocket, {
            "type": "error", 
            "message": "Error marcando jugador como listo"
        })
        return

    # Obtener estado actualizado
    room = room_service.get_room(room_code)
    if not room:
        return

    # ✅ ACTUALIZAR EL PLAYER EN EL ROOM
    for player in room.players:
        if player.id == player_id:
            player.is_ready = is_ready
            break

    # Notificar a todos que un jugador está listo
    await manager.broadcast_to_room(room_code, {
        "type": "player_ready_update",
        "playerId": player_id,
        "phase": phase,
        "isReady": is_ready,
        "readyPlayers": await game_service.get_ready_players(room_code, phase),
        "totalPlayers": len(room.players),
        "room": room.dict()
    })

    # ✅ VERIFICAR SI TODOS ESTÁN LISTOS PARA AVANZAR FASE
    all_ready = await game_service.all_players_ready(room_code, phase)
    
    if all_ready:
        print(f"🚀 Todos listos en fase {phase}, avanzando...")
        
        # Avanzar a la siguiente fase
        next_phase_data = await game_service.advance_game_phase(room_code)
        
        if next_phase_data:
            # ✅ ACTUALIZAR EL ROOM con la nueva fase
            room.current_phase = next_phase_data.get("current_phase")
            room.current_round = next_phase_data.get("current_round", room.current_round)
            
            await manager.broadcast_to_room(room_code, {
                "type": "phase_advanced",
                "previousPhase": phase,
                "currentPhase": next_phase_data.get("current_phase"),
                "currentRound": next_phase_data.get("current_round"),
                "message": f"Avanzando a {next_phase_data.get('current_phase')}",
                "room": room.dict(),  # ✅ Room ACTUALIZADO
                "gameState": next_phase_data
            })

# ============================
# 🔄 SYNC HANDLERS
# ============================

async def handle_sync_game_state(room_code: str, message: dict, websocket: WebSocket):
    """Sincronizar estado del juego para jugadores que se reconectan"""
    player_id = message.get("playerId") or message.get("player_id")
    room = room_service.get_room(room_code)
    
    print(f"🔄 Sync game state for: {player_id}")
    
    if room:
        await manager.send_personal(websocket, {
            "type": "game_state_sync",
            "room": room.dict(),
            "gameState": await game_service.get_game_state(room_code),
            "timestamp": time.time()
        })

async def handle_get_game_state(room_code: str, message: dict, websocket: WebSocket):
    """Obtener estado actual del juego"""
    room = room_service.get_room(room_code)
    game_state = await game_service.get_game_state(room_code)
    
    print(f"📊 Get game state for room: {room_code}")
    
    await manager.send_personal(websocket, {
        "type": "game_state",
        "room": room.dict() if room else None,
        "gameState": game_state
    })

# ============================================================
# 🎯 HANDLER PRINCIPAL - DEBE IR AL FINAL
# ============================================================

async def handle_message(room_code: str, message: dict, websocket: WebSocket):
    msg_type = message.get("type")
    
    # ✅ DEBUG MEJORADO
    print(f"📨 Mensaje recibido - Tipo: {msg_type}, Room: {room_code}")
    print(f"📨 Datos completos: {message}")

    handlers = {
        # 👥 Jugadores
        "player_join": handle_player_join,
        "player_leave": handle_player_leave,
        "player_ready": handle_player_ready,
        
        # 🎮 Juego
        "game_start": handle_start_game,
        "player_answer": handle_submit_answer,
        "player_vote": handle_cast_vote,
        
        # 💬 Chat
        "chat_message": handle_chat_message,
        
        # 🔄 Sincronización
        "sync_game_state": handle_sync_game_state,
        "get_game_state": handle_get_game_state
    }

    handler = handlers.get(msg_type)

    if handler:
        await handler(room_code, message, websocket)
    else:
        print(f"❌ Tipo de mensaje no manejado: {msg_type}")
        await manager.send_personal(websocket, {
            "type": "error",
            "message": f"Tipo de mensaje desconocido: {msg_type}"
        })