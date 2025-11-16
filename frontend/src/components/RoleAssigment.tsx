import React, { useState, useEffect } from 'react';
import type { Room, FootballPlayer } from '../types/game';
import { footballService } from '../services/footballService';

interface RoleAssignmentProps {
  room: Room;
  currentPlayerName: string;
  onGameStart: () => void;
}

const RoleAssignment: React.FC<RoleAssignmentProps> = ({ 
  room, 
  currentPlayerName,
  onGameStart 
}) => {
  const [countdown, setCountdown] = useState(5);
  const [assignedPlayer, setAssignedPlayer] = useState<FootballPlayer | null>(null);
  const [isImpostor, setIsImpostor] = useState(false);
  const [impostorClue, setImpostorClue] = useState<string>('');
  const [footballPlayers, setFootballPlayers] = useState<FootballPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar jugadores reales de la API
  useEffect(() => {
    const loadRealPlayers = async () => {
      try {
        setLoading(true);
        const players = await footballService.getGamePlayers();
        setFootballPlayers(players);
        setError(null);
        console.log('Jugadores cargados:', players.length);
      } catch (err) {
        setError('Error cargando jugadores de la API');
        console.error('Error loading players from API:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRealPlayers();
  }, []);

  useEffect(() => {
    // Esperar a que se carguen los jugadores antes de empezar el countdown
    if (loading || footballPlayers.length === 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          assignRoles();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, footballPlayers]);

  const assignRoles = () => {
    if (footballPlayers.length === 0) {
      console.error('No hay jugadores disponibles de la API');
      return;
    }

    // Seleccionar jugador aleatorio de la API
    const randomPlayer = footballPlayers[Math.floor(Math.random() * footballPlayers.length)];
    const randomIsImpostor = Math.random() < 0.3; // 30% de chance de ser impostor

    setAssignedPlayer(randomPlayer);
    setIsImpostor(randomIsImpostor);

    // Si es impostor, generar una pista aleatoria basada en datos reales
    if (randomIsImpostor) {
      const clues = generateClues(randomPlayer);
      const randomClue = clues[Math.floor(Math.random() * clues.length)];
      setImpostorClue(randomClue);
    }
  };

  const generateClues = (player: FootballPlayer): string[] => {
    const clues = [];
    
    if (player.team) clues.push(`Juega en: ${player.team}`);
    if (player.position && player.position !== 'Jugador') clues.push(`Posición: ${player.position}`);
    if (player.nationality) clues.push(`Nacionalidad: ${player.nationality}`);
    if (player.position && player.position !== 'Jugador') clues.push(`Es ${player.position.toLowerCase()}`);
    if (player.team) clues.push(`Equipo: ${player.team}`);
    
    // Si no hay suficientes pistas, agregar genéricas
    if (clues.length < 2) {
      clues.push('Jugador de fútbol profesional', 'Juega en liga importante');
    }
    
    return clues;
  };

  // Estados de carga y error
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold mb-4">Cargando Jugadores...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl text-purple-200">Obteniendo datos reales de futbolistas</p>
          <p className="text-purple-300 mt-2">Desde The Sports DB API</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold mb-4">⚠️ Error</div>
          <p className="text-xl text-red-200 mb-4">{error}</p>
          <p className="text-purple-200">Usando datos de respaldo...</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (countdown > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl font-bold mb-4">{countdown}</div>
          <p className="text-xl text-purple-200">Asignando roles...</p>
          <p className="text-purple-300 mt-2">
            {footballPlayers.length} jugadores reales cargados
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            {isImpostor ? 'Eres el IMPOSTOR' : 'Eres INOCENTE'}
          </h1>
          <p className="text-gray-400 mb-2">
            Jugador: <span className="text-green-400 font-semibold">{currentPlayerName}</span>
          </p>
          <p className="text-gray-400">
            {isImpostor 
              ? 'Tu objetivo es engañar a los demás sin ser descubierto' 
              : 'Encuentra al impostor antes de que sea demasiado tarde'
            }
          </p>
          <div className="mt-2 text-sm text-gray-500">
            Datos en tiempo real de The Sports DB
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Información del Rol */}
          <div className={`p-8 rounded-xl ${
            isImpostor 
              ? 'bg-red-900 border-2 border-red-500' 
              : 'bg-green-900 border-2 border-green-500'
          }`}>
            <h2 className="text-2xl font-bold mb-4 text-center">
              {isImpostor ? 'Rol: IMPOSTOR' : 'Rol: JUGADOR'}
            </h2>
            
            {isImpostor ? (
              <div className="space-y-4">
                <div className="bg-red-800 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">Tu Misión:</h3>
                  <ul className="space-y-2 text-red-100">
                    <li>• Finge ser un jugador de fútbol real</li>
                    <li>• Responde preguntas sin levantar sospechas</li>
                    <li>• Convence a los demás de que no eres tú</li>
                    <li>• Sobrevive hasta el final de las {room.rounds} rondas</li>
                  </ul>
                </div>
                
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-800 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">Tu Misión:</h3>
                  <ul className="space-y-2 text-green-100">
                    <li>• Di una palabra que identifique al jugador</li>
                    <li>• Identifica al impostor por sus respuestas sospechosas</li>
                    <li>• Vota en cada ronda para eliminar sospechosos</li>
                    <li>• Encuentra al impostor antes de que gane</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Información del Jugador */}
          <div className={`p-8 rounded-xl ${
            isImpostor 
              ? 'bg-gray-800 border-2 border-gray-600' 
              : 'bg-blue-900 border-2 border-blue-500'
          }`}>
            <h2 className="text-2xl font-bold mb-6 text-center">
              {isImpostor ? 'Información Limitada' : 'Jugador Asignado'}
            </h2>
            
            {!isImpostor && assignedPlayer ? (
              <div className="text-center">
                <h3 className="text-3xl font-bold mb-2">{assignedPlayer.name}</h3>
                <div className="space-y-2 text-lg">
                  <p><strong>Equipo:</strong> {assignedPlayer.team}</p>
                  {assignedPlayer.position && assignedPlayer.position !== 'Jugador' && (
                    <p><strong>Posición:</strong> {assignedPlayer.position}</p>
                  )}
                  <p><strong>Nacionalidad:</strong> {assignedPlayer.nationality}</p>
                  {assignedPlayer.thumb && (
                    <div className="mt-4">
                      <img 
                        src={assignedPlayer.thumb} 
                        alt={assignedPlayer.name}
                        className="w-24 h-24 mx-auto rounded-full object-cover border-2 border-blue-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="mt-6 p-4 bg-blue-800 rounded-lg">
                  <p className="text-blue-200">
                    Memoriza esta información. El impostor no la conoce completamente.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-400 mb-4">
                  Como impostor, solo conoces una pista del jugador asignado.
                  ¡Ten cuidado con tus respuestas!
                </p>
                <div className="bg-yellow-900 border border-yellow-700 p-4 rounded-lg">
                  <h4 className="font-bold text-yellow-300 mb-2">Tu Pista:</h4>
                  <p className="text-yellow-200 text-lg">{impostorClue}</p>
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  Información real de la base de datos
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botón de Continuar */}
        <div className="text-center mt-8">
          <button
            onClick={onGameStart}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-all transform hover:scale-105"
          >
            {isImpostor ? 'Comenzar como Impostor' : 'Comenzar Juego'}
          </button>
          <p className="text-gray-400 mt-2">
            {room.rounds} rondas - {room.players.length} jugadores - {footballPlayers.length} futbolistas disponibles
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Datos proporcionados por The Sports DB
          </p>
        </div>

      </div>
    </div>
  );
};

export default RoleAssignment;