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
            "alive_players": [p.id for p in room.players],
            "game_winner": None
        }
        
        # Inicializar estructuras de datos
        self.player_answers[room_code] = {}
        self.player_votes[room_code] = {}
        self.ready_players[room_code] = {}
        
        # Actualizar room
        room.game_started = True
        room.current_phase = "role_assignment"
        room.current_round = 1
        
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
    
    # ✅ MÉTODOS PARA PLAYER_READY - CORREGIDOS
    async def mark_player_ready(self, room_code: str, player_id: str, phase: str, is_ready: bool = True) -> bool:
        """Marcar jugador como listo para una fase"""
        if room_code not in self.ready_players:
            self.ready_players[room_code] = {}
        
        if phase not in self.ready_players[room_code]:
            self.ready_players[room_code][phase] = []
        
        if is_ready:
            if player_id not in self.ready_players[room_code][phase]:
                self.ready_players[room_code][phase].append(player_id)
        else:
            if player_id in self.ready_players[room_code][phase]:
                self.ready_players[room_code][phase].remove(player_id)
        
        print(f"✅ Player {player_id} ready for {phase}. Ready players: {self.ready_players[room_code][phase]}")
        return True
    
    def get_ready_players(self, room_code: str, phase: str) -> List[str]:
        """Obtener lista de jugadores listos para una fase"""
        if (room_code in self.ready_players and 
            phase in self.ready_players[room_code]):
            return self.ready_players[room_code][phase]
        return []
    
    async def all_players_ready(self, room_code: str, phase: str) -> bool:
        """Verificar si todos los jugadores vivos están listos"""
        room = room_service.get_room(room_code)
        if not room:
            return False
        
        ready_players = self.get_ready_players(room_code, phase)
        game_state = self.game_states.get(room_code, {})
        alive_players = game_state.get("alive_players", [p.id for p in room.players])
        
        print(f"🔍 Ready check: {len(ready_players)}/{len(alive_players)} players ready for {phase}")
        
        return len(ready_players) >= len(alive_players)
    
    # ✅ MÉTODO NUEVO: AVANZAR FASE DEL JUEGO
    async def advance_game_phase(self, room_code: str) -> Dict:
        """Avanzar a la siguiente fase del juego automáticamente"""
        game_state = self.game_states.get(room_code)
        room = room_service.get_room(room_code)
        
        if not game_state or not room:
            return {}
        
        current_phase = game_state["current_phase"]
        current_round = game_state["current_round"]
        
        # Lógica de transición de fases
        phase_sequence = {
            "role_assignment": "question",
            "question": "debate", 
            "debate": "voting",
            "voting": "results",
            "results": self._determine_next_phase(room_code)
        }
        
        next_phase = phase_sequence.get(current_phase, "waiting")
        
        # Actualizar estados
        game_state["current_phase"] = next_phase
        room.current_phase = next_phase
        
        # Si volvemos a question, es nueva ronda
        if next_phase == "question":
            game_state["current_round"] += 1
            room.current_round += 1
            
            # Limpiar respuestas y votos de la ronda anterior
            if room_code in self.player_answers:
                self.player_answers[room_code] = {}
            if room_code in self.player_votes:
                self.player_votes[room_code] = {}
        
        # Limpiar ready players de la fase anterior
        if room_code in self.ready_players and current_phase in self.ready_players[room_code]:
            self.ready_players[room_code][current_phase] = []
        
        print(f"🚀 Avanzando de {current_phase} a {next_phase}. Ronda: {game_state['current_round']}")
        
        return game_state
    
    def _determine_next_phase(self, room_code: str) -> str:
        """Determinar qué sigue después de results"""
        game_state = self.game_states.get(room_code, {})
        room = room_service.get_room(room_code)
        
        if not game_state or not room:
            return "finished"
        
        alive_players = game_state.get("alive_players", [])
        impostors_alive = len([p for p in room.players if p.is_impostor and p.id in alive_players])
        players_alive = len(alive_players) - impostors_alive
        
        # Condiciones de fin del juego
        if impostors_alive == 0:
            game_state["game_winner"] = "players"
            room.current_phase = "finished"
            return "finished"
        elif impostors_alive >= players_alive:
            game_state["game_winner"] = "impostor" 
            room.current_phase = "finished"
            return "finished"
        elif game_state["current_round"] >= room.total_rounds:
            game_state["game_winner"] = "impostor"
            room.current_phase = "finished"
            return "finished"
        else:
            # Continuar a siguiente ronda
            return "question"
    
    # ✅ MÉTODO NUEVO: ELIMINAR JUGADOR
    async def eliminate_player(self, room_code: str, player_id: str) -> bool:
        """Eliminar jugador (marcar como no vivo)"""
        room = room_service.get_room(room_code)
        if not room:
            return False
        
        # Encontrar y marcar jugador como muerto
        player = next((p for p in room.players if p.id == player_id), None)
        if player:
            player.is_alive = False
            print(f"💀 Jugador eliminado: {player.name}")
            return True
        
        return False
    
    # ✅ MÉTODO NUEVO: OBTENER ESTADO DEL JUEGO
    async def get_game_state(self, room_code: str) -> Dict:
        """Obtener estado completo del juego para sincronización"""
        game_state = self.game_states.get(room_code, {})
        room = room_service.get_room(room_code)
        
        if not room:
            return {}
        
        # Combinar game_state con room data
        combined_state = {
            **game_state,
            "code": room.code,
            "players": [p.dict() for p in room.players],
            "max_players": room.max_players,
            "current_round": room.current_round,
            "total_rounds": room.total_rounds,
            "debate_mode": room.debate_mode,
            "debate_time": room.debate_time,
            "game_started": room.game_started,
            "current_phase": room.current_phase
        }
        
        return combined_state
    
    # ✅ MÉTODOS EXISTENTES (MANTENER)
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
    
    async def cast_vote(self, room_code: str, voter_id: str, voted_player_id: str) -> bool:
        """Registrar voto de un jugador"""
        if room_code not in self.player_votes:
            self.player_votes[room_code] = {}
        
        self.player_votes[room_code][voter_id] = voted_player_id
        print(f"🗳️ Voto registrado: {voter_id} -> {voted_player_id}")
        return True
    
    async def all_votes_received(self, room_code: str) -> bool:
        """Verificar si todos los votos fueron recibidos"""
        game_state = self.game_states.get(room_code, {})
        alive_players = game_state.get("alive_players", [])
        
        if room_code not in self.player_votes:
            return False
        
        all_received = len(self.player_votes[room_code]) >= len(alive_players)
        print(f"🔍 Votes check: {len(self.player_votes[room_code])}/{len(alive_players)} votes received")
        return all_received
    
    def get_current_votes(self, room_code: str) -> Dict:
        """Obtener votos actuales"""
        return self.player_votes.get(room_code, {})
    
    async def calculate_voting_result(self, room_code: str) -> Dict:
        """Calcular resultado de la votación"""
        votes = self.player_votes.get(room_code, {})
        room = room_service.get_room(room_code)
        
        if not room:
            return {"eliminated_player": None, "vote_count": {}}
        
        # Contar votos
        vote_count = {}
        for voted_id in votes.values():
            if voted_id:  # Solo contar votos válidos (no nulos)
                vote_count[voted_id] = vote_count.get(voted_id, 0) + 1
        
        # Encontrar jugador más votado
        eliminated_player = None
        was_impostor = False
        
        if vote_count:
            eliminated_id = max(vote_count, key=vote_count.get)
            eliminated_player = next(
                (p for p in room.players if p.id == eliminated_id), None
            )
            
            if eliminated_player:
                was_impostor = eliminated_player.is_impostor
                # Marcar como eliminado
                eliminated_player.is_alive = False
                
                # Actualizar lista de jugadores vivos
                if room_code in self.game_states:
                    if eliminated_id in self.game_states[room_code]["alive_players"]:
                        self.game_states[room_code]["alive_players"].remove(eliminated_id)
            
            # Reiniciar votos para la siguiente ronda
            self.player_votes[room_code] = {}
        
        return {
            "eliminated_player": eliminated_player.dict() if eliminated_player else None,
            "vote_count": vote_count,
            "was_impostor": was_impostor,
            "results": [{"playerId": pid, "votes": count} for pid, count in vote_count.items()]
        }

# Instancia global
game_service = GameService()