from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, List
import json
import asyncio
from app.services.room_service import room_service
from app.services.game_service import game_service

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # room_code: list_of_connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, room_code: str):
        await websocket.accept()
        
        if room_code not in self.active_connections:
            self.active_connections[room_code] = []
        
        self.active_connections[room_code].append(websocket)
        print(f"🔗 Jugador conectado a sala {room_code}. Total: {len(self.active_connections[room_code])}")
        
        # Notificar a todos los jugadores de la sala
        await self.broadcast_to_room(room_code, {
            "type": "player_joined",
            "message": "Nuevo jugador se unió",
            "room": room_service.get_room(room_code).dict() if room_service.get_room(room_code) else None
        })
    
    def disconnect(self, websocket: WebSocket, room_code: str):
        if room_code in self.active_connections:
            self.active_connections[room_code].remove(websocket)
            if len(self.active_connections[room_code]) == 0:
                del self.active_connections[room_code]
        
        print(f"🔌 Jugador desconectado de sala {room_code}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)
    
    async def broadcast_to_room(self, room_code: str, message: dict):
        if room_code in self.active_connections:
            disconnected = []
            for connection in self.active_connections[room_code]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error enviando mensaje: {e}")
                    disconnected.append(connection)
            
            # Limpiar conexiones desconectadas
            for connection in disconnected:
                self.disconnect(connection, room_code)

# Instancia global del manager
manager = ConnectionManager()

@router.websocket("/ws/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str):
    await manager.connect(websocket, room_code)
    
    try:
        while True:
            # Recibir mensajes del cliente
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Procesar diferentes tipos de mensajes
            await handle_websocket_message(room_code, message, websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_code)
        await manager.broadcast_to_room(room_code, {
            "type": "player_left",
            "message": "Un jugador abandonó la sala",
            "room": room_service.get_room(room_code).dict() if room_service.get_room(room_code) else None
        })

async def handle_websocket_message(room_code: str, message: dict, websocket: WebSocket):
    """Manejar diferentes tipos de mensajes WebSocket"""
    message_type = message.get("type")
    
    if message_type == "start_game":
        await handle_start_game(room_code, websocket)
    
    elif message_type == "player_ready":
        await handle_player_ready(room_code, message, websocket)
    
    elif message_type == "submit_answer":
        await handle_submit_answer(room_code, message, websocket)
    
    elif message_type == "cast_vote":
        await handle_cast_vote(room_code, message, websocket)
    
    elif message_type == "next_phase":
        await handle_next_phase(room_code, message, websocket)
    
    elif message_type == "chat_message":
        await handle_chat_message(room_code, message, websocket)

async def handle_start_game(room_code: str, websocket: WebSocket):
    """Manejar inicio del juego"""
    room = room_service.get_room(room_code)
    if not room:
        await manager.send_personal_message({
            "type": "error",
            "message": "Sala no encontrada"
        }, websocket)
        return
    
    # Iniciar lógica del juego
    game_data = await game_service.start_game(room_code)
    
    # Notificar a todos los jugadores
    await manager.broadcast_to_room(room_code, {
        "type": "game_started",
        "message": "¡El juego ha comenzado!",
        "game_data": game_data,
        "current_phase": "role_assignment"
    })

async def handle_player_ready(room_code: str, message: dict, websocket: WebSocket):
    """Manejar jugador listo para siguiente fase"""
    player_id = message.get("player_id")
    phase = message.get("phase")
    
    # Registrar jugador listo
    ready = await game_service.mark_player_ready(room_code, player_id, phase)
    
    if ready:
        # Notificar a la sala
        await manager.broadcast_to_room(room_code, {
            "type": "player_ready_update",
            "player_id": player_id,
            "phase": phase,
            "ready_players": game_service.get_ready_players(room_code, phase),
            "total_players": len(room_service.get_room(room_code).players)
        })
        
        # Verificar si todos están listos
        if await game_service.all_players_ready(room_code, phase):
            await manager.broadcast_to_room(room_code, {
                "type": "all_players_ready",
                "phase": phase,
                "message": "Todos los jugadores están listos"
            })

async def handle_submit_answer(room_code: str, message: dict, websocket: WebSocket):
    """Manejar envío de respuestas en fase de preguntas"""
    player_id = message.get("player_id")
    answer = message.get("answer")
    question_id = message.get("question_id")
    
    # Guardar respuesta
    await game_service.save_player_answer(room_code, player_id, question_id, answer)
    
    # Notificar respuesta recibida (solo al host o a todos según necesites)
    await manager.broadcast_to_room(room_code, {
        "type": "answer_submitted",
        "player_id": player_id,
        "question_id": question_id,
        "all_answers_received": await game_service.all_answers_received(room_code)
    })

async def handle_cast_vote(room_code: str, message: dict, websocket: WebSocket):
    """Manejar votación de jugadores"""
    voter_id = message.get("voter_id")
    voted_player_id = message.get("voted_player_id")
    
    # Registrar voto
    vote_result = await game_service.cast_vote(room_code, voter_id, voted_player_id)
    
    await manager.broadcast_to_room(room_code, {
        "type": "vote_cast",
        "voter_id": voter_id,
        "voted_player_id": voted_player_id,
        "all_votes_received": await game_service.all_votes_received(room_code),
        "current_votes": game_service.get_current_votes(room_code)
    })
    
    # Si todos votaron, calcular resultados
    if await game_service.all_votes_received(room_code):
        voting_result = await game_service.calculate_voting_result(room_code)
        
        await manager.broadcast_to_room(room_code, {
            "type": "voting_complete",
            "result": voting_result,
            "eliminated_player": voting_result.get("eliminated_player"),
            "next_phase": "results"
        })

async def handle_next_phase(room_code: str, message: dict, websocket: WebSocket):
    """Manejar cambio a siguiente fase"""
    current_phase = message.get("current_phase")
    next_phase = message.get("next_phase")
    
    phase_data = await game_service.move_to_next_phase(room_code, current_phase, next_phase)
    
    await manager.broadcast_to_room(room_code, {
        "type": "phase_changed",
        "previous_phase": current_phase,
        "new_phase": next_phase,
        "phase_data": phase_data,
        "round": room_service.get_room(room_code).current_round
    })

async def handle_chat_message(room_code: str, message: dict, websocket: WebSocket):
    """Manejar mensajes de chat en tiempo real"""
    player_name = message.get("player_name")
    chat_message = message.get("message")
    phase = message.get("phase", "debate")
    
    # Enviar mensaje a todos en la sala
    await manager.broadcast_to_room(room_code, {
        "type": "chat_message",
        "player_name": player_name,
        "message": chat_message,
        "phase": phase,
        "timestamp": asyncio.get_event_loop().time()
    })