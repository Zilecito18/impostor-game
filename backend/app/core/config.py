import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # API Football
    API_FOOTBALL_KEY: str = os.getenv("API_FOOTBALL_KEY", "")
    API_FOOTBALL_HOST: str = "api-football-v1.p.rapidapi.com"
    
    # Database (por ahora en memoria, luego PostgreSQL)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./test.db")
    
    # Game Settings
    MAX_PLAYERS: int = 15
    MIN_PLAYERS: int = 4
    DEFAULT_ROUNDS: int = 5

settings = Settings()