from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import asyncio

from app.services.room_service import room_service
from app.services.game_service import game_service

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # room_code -> list of websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_code: str):
        await websocket.accept()

        if room_code not in self.active_connections:
            self.active_connections[room_code] = []

        self.active_connections[room_code].append(websocket)
        print(f"🔗 Cliente conectado en sala {room_code} ({len(self.active_connections[room_code])} jugadores).")

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
        await websocket.send_json(message)

    async def broadcast_to_room(self, room_code: str, message: dict):
        if room_code not in self.active_connections:
            return

        disconnected = []

        for ws in self.active_connections[room_code]:
            try:
                await ws.send_json(message)
            except:
                disconnected.append(ws)

        # limpiar desconectados
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
# ✔ HANDLERS PRINCIPALES
# ============================================================

async def handle_message(room_code: str, message: dict, websocket: WebSocket):
    msg_type = message.get("type")

    handlers = {
        "start_game": handle_start_game,
        "player_ready": handle_player_ready,
        "submit_answer": handle_submit_answer,
        "cast_vote": handle_cast_vote,
        "next_phase": handle_next_phase,
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
# ✔ START GAME
# ============================

async def handle_start_game(room_code: str, message: dict, websocket: WebSocket):
    room = room_service.get_room(room_code)
    if not room:
        await manager.send_personal(websocket, {"type": "error", "message": "Sala no existe"})
        return

    game_data = await game_service.start_game(room_code)

    await manager.broadcast_to_room(room_code, {
        "type": "game_started",
        "message": "El juego ha comenzado",
        "game_data": game_data,
        "current_phase": "role_assignment"
    })


# ============================
# ✔ PLAYER READY
# ============================

async def handle_player_ready(room_code: str, message: dict, websocket: WebSocket):
    player_id = message.get("player_id")
    phase = message.get("phase")

    await game_service.mark_player_ready(room_code, player_id, phase)

    room = room_service.get_room(room_code)

    await manager.broadcast_to_room(room_code, {
        "type": "player_ready_update",
        "player_id": player_id,
        "phase": phase,
        "ready_players": game_service.get_ready_players(room_code, phase),
        "total_players": len(room.players)
    })

    if await game_service.all_players_ready(room_code, phase):
        await manager.broadcast_to_room(room_code, {
            "type": "all_players_ready",
            "phase": phase,
            "message": "Todos están listos"
        })


# ============================
# ✔ ANSWER SUBMIT
# ============================

async def handle_submit_answer(room_code: str, message: dict, websocket: WebSocket):
    player_id = message.get("player_id")
    answer = message.get("answer")
    question_id = message.get("question_id")

    await game_service.save_player_answer(room_code, player_id, question_id, answer)

    await manager.broadcast_to_room(room_code, {
        "type": "answer_submitted",
        "player_id": player_id,
        "question_id": question_id,
        "all_answers_received": await game_service.all_answers_received(room_code)
    })


# ============================
# ✔ VOTES
# ============================

async def handle_cast_vote(room_code: str, message: dict, websocket: WebSocket):
    voter = message.get("voter_id")
    target = message.get("voted_player_id")

    await game_service.cast_vote(room_code, voter, target)

    await manager.broadcast_to_room(room_code, {
        "type": "vote_cast",
        "voter_id": voter,
        "voted_player_id": target,
        "current_votes": game_service.get_current_votes(room_code),
        "all_votes_received": await game_service.all_votes_received(room_code)
    })

    if await game_service.all_votes_received(room_code):
        result = await game_service.calculate_voting_result(room_code)

        await manager.broadcast_to_room(room_code, {
            "type": "voting_complete",
            "result": result,
            "eliminated_player": result.get("eliminated_player"),
            "next_phase": "results"
        })


# ============================
# ✔ NEXT PHASE
# ============================

async def handle_next_phase(room_code: str, message: dict, websocket: WebSocket):
    current = message.get("current_phase")
    next_phase = message.get("next_phase")

    data = await game_service.move_to_next_phase(room_code, current, next_phase)

    room = room_service.get_room(room_code)

    await manager.broadcast_to_room(room_code, {
        "type": "phase_changed",
        "previous_phase": current,
        "new_phase": next_phase,
        "phase_data": data,
        "round": room.current_round
    })


# ============================
# ✔ CHAT
# ============================

async def handle_chat_message(room_code: str, message: dict, websocket: WebSocket):
    await manager.broadcast_to_room(room_code, {
        "type": "chat_message",
        "player_name": message.get("player_name"),
        "message": message.get("message"),
        "phase": message.get("phase", "debate"),
        "timestamp": asyncio.get_event_loop().time()
    })
