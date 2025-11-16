from fastapi import APIRouter

router = APIRouter()

# Endpoints básicos para el juego
@router.post("/start")
async def start_game():
    return {"message": "Juego iniciado - placeholder"}

@router.get("/state/{room_code}")
async def get_game_state(room_code: str):
    return {"room_code": room_code, "state": "waiting", "message": "Estado del juego"}

@router.post("/{room_code}/vote")
async def cast_vote(room_code: str):
    return {"room_code": room_code, "message": "Voto registrado - placeholder"}