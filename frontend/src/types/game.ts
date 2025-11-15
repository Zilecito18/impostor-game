export interface Player {
    id: string;
    name: string;
    isHost: boolean;
    isImpostor?: boolean;
    assignedPlayer?: FootballPlayer; // Jugador de fútbol asignado
    isAlive: boolean;
    votes?: number;
}
// Actualizar Room interface para incluir rondas
export interface Room {
    id: string;
    code: string;
    hostId: string;
    maxPlayers: number;
    rounds: number;
    players: Player[];
    status: 'waiting' | 'role_assignment' | 'question' | 'debate' | 'voting' | 'results' | 'finished';
    currentRound?: number;
    totalRounds?: number;
    debateMode: boolean;  // ← AÑADIR ESTA LÍNEA
    debateTime: number;   // ← AÑADIR ESTA LÍNEA
    }

export interface FootballPlayer {
    id: string;
    name: string;
    team: string;
    position: string;
    nationality: string;
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


