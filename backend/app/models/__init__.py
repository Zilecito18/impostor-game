# Importar solo lo que existe
from .room import Room, RoomCreate, RoomJoin, Player

# Importar GameState solo si existe en game.py
try:
    from .game import GameState, GamePhase
    __all__ = ["Room", "RoomCreate", "RoomJoin", "Player", "GameState", "GamePhase"]
except ImportError:
    # Si GameState no existe, no lo incluyas
    __all__ = ["Room", "RoomCreate", "RoomJoin", "Player"]