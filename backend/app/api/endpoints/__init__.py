from .rooms import router as rooms_router
from .players import router as players_router
from .game import router as game_router

__all__ = ["rooms_router", "players_router", "game_router"]