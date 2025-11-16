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

# ============================================================
# 🎯 HANDLERS PRINCIPALES - CORREGIDOS PARA MATCH CON FRONTEND
# ============================================================

async def handle_message(room_code: str, message: dict, websocket: WebSocket):
    msg_type = message.get("type")

    handlers = {
        "player_join": handle_player_join,
        "player_leave": handle_player_leave,
        "game_start": handle_start_game,
        "player_answer": handle_submit_answer,
        "player_vote": handle_cast_vote,
        "chat_message": handle_chat_message
    }

    handler = handlers.get(msg_type)

    if handler:
        await handler(room_code, message, websocket)
    else:
        await manager.send_personal(websocket, {
            "type": "error",
            "message": f"Tipo de mensaje desconocido: {msg_type}"
        })

# ============================
# 👥 PLAYER JOIN/LEAVE
# ============================

async def handle_player_join(room_code: str, message: dict, websocket: WebSocket):
    player_id = message.get("playerId")
    player_name = message.get("playerName")
    
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
    player_id = message.get("playerId")
    
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
    player_id = message.get("playerId")
    room = room_service.get_room(room_code)
    
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
    player_id = message.get("playerId")
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
    player_id = message.get("playerId")
    voted_player_id = message.get("votedPlayerId")
    round_id = message.get("roundId")

    await game_service.cast_vote(room_code, player_id, voted_player_id)

    await manager.broadcast_to_room(room_code, {
        "type": "vote_submitted",
        "playerId": player_id,
        "votedPlayerId": voted_player_id,
        "roundId": round_id,
        "currentVotes": game_service.get_current_votes(room_code),
        "allVotesReceived": await game_service.all_votes_received(room_code)
    })

    if await game_service.all_votes_received(room_code):
        result = await game_service.calculate_voting_result(room_code)

        await manager.broadcast_to_room(room_code, {
            "type": "voting_complete",
            "result": result,
            "eliminatedPlayer": result.get("eliminated_player"),
            "nextPhase": "results"
        })

# ============================
# 💬 CHAT
# ============================

async def handle_chat_message(room_code: str, message: dict, websocket: WebSocket):
    await manager.broadcast_to_room(room_code, {
        "type": "chat_message",
        "playerId": message.get("playerId"),
        "message": message.get("message"),
        "timestamp": time.time()
    })