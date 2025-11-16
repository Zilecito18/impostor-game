from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum

class RoomStatus(str, Enum):
    WAITING = "waiting"
    PLAYING = "playing"
    FINISHED = "finished"

class Player(BaseModel):
    id: str
    name: str
    is_host: bool = False
    is_alive: bool = True
    is_impostor: bool = False
    assigned_player: Optional[Dict[str, Any]] = None  # Jugador de fútbol asignado

class Room(BaseModel):
    code: str
    players: List[Player] = []
    status: RoomStatus = RoomStatus.WAITING
    max_players: int = 15
    current_round: int = 1
    total_rounds: int = 5
    debate_mode: bool = False
    debate_time: int = 3  # minutos
    
    class Config:
        from_attributes = True

class RoomCreate(BaseModel):
    player_name: str
    max_players: int = 15
    total_rounds: int = 5
    debate_mode: bool = False

class RoomJoin(BaseModel):
    player_name: str
    room_code: str