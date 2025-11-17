export interface Player {
    id: string;
    name: string;
    is_host: boolean;
    is_alive: boolean;
    is_impostor: boolean;
    is_ready: boolean;
    assigned_player?: FootballPlayer;
}

// ✅ ACTUALIZAR Room interface para incluir TODAS las propiedades del juego
export interface Room {
    code: string;
    players: Player[];
    status: string;
    max_players: number;
    current_round: number;
    total_rounds: number;
    debate_mode: boolean;
    debate_time: number;
    game_started: boolean;
    current_phase?: string;
    
    // ✅ AGREGAR PROPIEDADES FALTANTES
    current_votes?: { [playerId: string]: string };
    voting_results?: any[]; // O define un tipo más específico
    game_winner?: 'impostor' | 'players';
}

export interface FootballPlayer {
    id: string;
    name: string;
    team: string;
    position: string;
    nationality: string;
    thumb?: string;
    stadium?: string;
    description?: string;
}

export interface Question {
    id: string;
    text: string;
    category: string;
}

// Nuevos tipos para el juego
export interface GameState {
    currentPhase: 'role_assignment' | 'question' | 'discussion' | 'voting' | 'results';
    currentRound: number;
    timer: number;
    impostorPlayerId?: string;
}