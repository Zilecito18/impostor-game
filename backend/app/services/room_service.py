from app.models.room import Room, Player, RoomCreate
from app.services.football_api import football_service
import random

class RoomService:
    def __init__(self):
        self.rooms: dict[str, Room] = {}
    
    async def create_room(self, code: str, room_data: RoomCreate) -> Room:
        """Crear una nueva sala"""
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
        
        self.rooms[code] = room
        return room
    
    def get_room(self, code: str) -> Room:
        """Obtener sala por código"""
        return self.rooms.get(code)
    
    async def add_player(self, room_code: str, player_name: str):
        """Agregar jugador a sala"""
        room = self.get_room(room_code)
        if not room:
            raise ValueError("Sala no encontrada")
        
        new_player = Player(
            id=f"player-{random.randint(1000, 9999)}",
            name=player_name,
            is_host=False
        )
        
        room.players.append(new_player)
        return new_player