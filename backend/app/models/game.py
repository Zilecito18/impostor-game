from pydantic import BaseModel
from typing import Optional, Dict, Any
from enum import Enum

class GamePhase(str, Enum):
    WAITING = "waiting"
    ROLE_ASSIGNMENT = "role_assignment"
    QUESTION = "question"
    DEBATE = "debate"
    VOTING = "voting"
    RESULTS = "results"
    FINISHED = "finished"

class GameState(BaseModel):
    room_code: str
    current_phase: GamePhase = GamePhase.WAITING
    current_round: int = 1
    total_rounds: int = 5
    impostor_id: Optional[str] = None
    alive_players: list = []
    voted_players: dict = {}
    
    class Config:
        from_attributes = True

# Si no tienes esta clase, créala con este contenido básico