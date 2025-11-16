from typing import Dict, List, Optional
import random
from app.services.room_service import room_service
from app.services.football_api import football_service

class GameService:
    def __init__(self):
        self.game_states: Dict[str, Dict] = {}  # room_code -> game_state
        self.player_answers: Dict[str, Dict] = {}  # room_code -> {player_id: answers}
        self.player_votes: Dict[str, Dict] = {}  # room_code -> {voter_id: voted_id}
        self.ready_players: Dict[str, Dict] = {}  # room_code -> {phase: [player_ids]}
    
    async def start_game(self, room_code: str) -> Dict:
        """Iniciar un nuevo juego en la sala"""
        room = room_service.get_room(room_code)
        if not room:
            raise ValueError("Sala no encontrada")
        
        # Obtener jugadores de fútbol reales
        football_players = await football_service.get_players()
        
        # Asignar roles y jugadores de fútbol
        game_data = await self._assign_roles_and_players(room, football_players)
        
        # Inicializar estado del juego
        self.game_states[room_code] = {
            "status": "playing",
            "current_phase": "role_assignment",
            "current_round": 1,
            "impostor_id": game_data["impostor_id"],
            "football_players": game_data["assigned_players"],
            "alive_players": [p.id for p in room.players]
        }
        
        # Inicializar estructuras de datos
        self.player_answers[room_code] = {}
        self.player_votes[room_code] = {}
        self.ready_players[room_code] = {}
        
        return self.game_states[room_code]
    
    async def _assign_roles_and_players(self, room, football_players: List) -> Dict:
        """Asignar roles de impostor y jugadores de fútbol"""
        players = room.players
        
        # Elegir impostor aleatorio
        impostor = random.choice(players)
        impostor.is_impostor = True
        
        # Mezclar jugadores de fútbol
        random.shuffle(football_players)
        
        # Asignar jugadores de fútbol a cada jugador
        assigned_players = {}
        for i, player in enumerate(players):
            if i < len(football_players):
                assigned_player_data = football_players[i]
                # El impostor NO recibe información del jugador asignado
                if player.id != impostor.id:
                    player.assigned_player = assigned_player_data
                assigned_players[player.id] = assigned_player_data
        
        return {
            "impostor_id": impostor.id,
            "impostor_name": impostor.name,
            "assigned_players": assigned_players
        }
    
    async def mark_player_ready(self, room_code: str, player_id: str, phase: str) -> bool:
        """Marcar jugador como listo para una fase"""
        if room_code not in self.ready_players:
            self.ready_players[room_code] = {}
        
        if phase not in self.ready_players[room_code]:
            self.ready_players[room_code][phase] = []
        
        if player_id not in self.ready_players[room_code][phase]:
            self.ready_players[room_code][phase].append(player_id)
            return True
        
        return False
    
    def get_ready_players(self, room_code: str, phase: str) -> List[str]:
        """Obtener lista de jugadores listos para una fase"""
        if (room_code in self.ready_players and 
            phase in self.ready_players[room_code]):
            return self.ready_players[room_code][phase]
        return []
    
    async def all_players_ready(self, room_code: str, phase: str) -> bool:
        """Verificar si todos los jugadores están listos"""
        room = room_service.get_room(room_code)
        if not room:
            return False
        
        ready_players = self.get_ready_players(room_code, phase)
        alive_players = self.game_states.get(room_code, {}).get("alive_players", [])
        
        return len(ready_players) >= len(alive_players)
    
    async def save_player_answer(self, room_code: str, player_id: str, question_id: str, answer: str):
        """Guardar respuesta de jugador"""
        if room_code not in self.player_answers:
            self.player_answers[room_code] = {}
        
        if player_id not in self.player_answers[room_code]:
            self.player_answers[room_code][player_id] = {}
        
        self.player_answers[room_code][player_id][question_id] = answer
    
    async def all_answers_received(self, room_code: str) -> bool:
        """Verificar si todas las respuestas fueron recibidas"""
        room = room_service.get_room(room_code)
        if not room:
            return False
        
        game_state = self.game_states.get(room_code, {})
        alive_players = game_state.get("alive_players", [])
        
        if room_code not in self.player_answers:
            return False
        
        return len(self.player_answers[room_code]) >= len(alive_players)
    
    async def cast_vote(self, room_code: str, voter_id: str, voted_player_id: str) -> Dict:
        """Registrar voto de un jugador"""
        if room_code not in self.player_votes:
            self.player_votes[room_code] = {}
        
        self.player_votes[room_code][voter_id] = voted_player_id
        
        return {
            "voter_id": voter_id,
            "voted_player_id": voted_player_id,
            "total_votes": len(self.player_votes[room_code])
        }
    
    async def all_votes_received(self, room_code: str) -> bool:
        """Verificar si todos los votos fueron recibidos"""
        game_state = self.game_states.get(room_code, {})
        alive_players = game_state.get("alive_players", [])
        
        if room_code not in self.player_votes:
            return False
        
        return len(self.player_votes[room_code]) >= len(alive_players)
    
    def get_current_votes(self, room_code: str) -> Dict:
        """Obtener votos actuales"""
        return self.player_votes.get(room_code, {})
    
    async def calculate_voting_result(self, room_code: str) -> Dict:
        """Calcular resultado de la votación"""
        votes = self.player_votes.get(room_code, {})
        
        # Contar votos
        vote_count = {}
        for voted_id in votes.values():
            vote_count[voted_id] = vote_count.get(voted_id, 0) + 1
        
        # Encontrar jugador más votado
        if vote_count:
            eliminated_id = max(vote_count, key=vote_count.get)
            eliminated_player = next(
                (p for p in room_service.get_room(room_code).players 
                 if p.id == eliminated_id), None
            )
            
            # Actualizar estado del juego
            if eliminated_id in self.game_states[room_code]["alive_players"]:
                self.game_states[room_code]["alive_players"].remove(eliminated_id)
            
            # Reiniciar votos para la siguiente ronda
            self.player_votes[room_code] = {}
            
            return {
                "eliminated_player": eliminated_player.dict() if eliminated_player else None,
                "vote_count": vote_count,
                "is_impostor": eliminated_player.is_impostor if eliminated_player else False
            }
        
        return {"eliminated_player": None, "vote_count": {}}
    
    async def move_to_next_phase(self, room_code: str, current_phase: str, next_phase: str) -> Dict:
        """Mover a la siguiente fase del juego"""
        if room_code in self.game_states:
            self.game_states[room_code]["current_phase"] = next_phase
            
            # Si pasamos a una nueva ronda
            if next_phase == "question":
                room = room_service.get_room(room_code)
                room.current_round += 1
        
        return self.game_states.get(room_code, {})

# Instancia global
game_service = GameService()