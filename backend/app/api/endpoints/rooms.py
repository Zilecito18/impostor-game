from fastapi import APIRouter, HTTPException
from app.models.room import Room, RoomCreate, RoomJoin
from app.services.room_service import RoomService
import random
import string

router = APIRouter()
room_service = RoomService()

@router.post("/create", response_model=dict)
async def create_room(room_data: RoomCreate):
    """Crear una nueva sala de juego"""
    try:
        # Generar código único de 6 caracteres
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        # Crear sala
        room = await room_service.create_room(code, room_data)
        
        return {
            "success": True,
            "room_code": code,
            "message": f"Sala {code} creada exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/join", response_model=dict)
async def join_room(join_data: RoomJoin):
    """Unirse a una sala existente"""
    room = room_service.get_room(join_data.room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    
    if len(room.players) >= room.max_players:
        raise HTTPException(status_code=400, detail="Sala llena")
    
    # Agregar jugador a la sala
    await room_service.add_player(join_data.room_code, join_data.player_name)
    
    return {
        "success": True,
        "room": room.dict(),
        "message": f"{join_data.player_name} se unió a la sala"
    }

@router.get("/{room_code}")
async def get_room(room_code: str):
    """Obtener información de una sala"""
    room = room_service.get_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    
    return room