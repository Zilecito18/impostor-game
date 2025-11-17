import React, { useState, useEffect } from 'react';
import type { Room, Player } from '../types/game';

interface ResultsPhaseProps {
  room: Room;
  currentPlayer: Player;
  votedPlayerId: string | null;
  onNextRound: () => void;
  onGameOver: (winner: 'impostor' | 'players') => void;
}

const ResultsPhase: React.FC<ResultsPhaseProps> = ({ 
  room, 
  currentPlayer, 
  votedPlayerId, 
  onNextRound,
  onGameOver 
}) => {
  const [timeLeft, setTimeLeft] = useState(10);
  const [eliminatedPlayer, setEliminatedPlayer] = useState<Player | null>(null);
  const [wasImpostor, setWasImpostor] = useState(false);
  const [showReveal, setShowReveal] = useState(false);

  // ✅ CORREGIDO: Usar snake_case
  const alivePlayers = room.players.filter(player => player.is_alive);
  const eliminatedPlayers = room.players.filter(player => !player.is_alive);

  useEffect(() => {
    // Encontrar al jugador eliminado en esta ronda
    if (votedPlayerId) {
      const player = room.players.find(p => p.id === votedPlayerId);
      if (player) {
        setEliminatedPlayer(player);
        // ✅ CORREGIDO: Usar snake_case
        setWasImpostor(player.is_impostor || false);
      }
    }

    // Animación de revelación
    const revealTimer = setTimeout(() => {
      setShowReveal(true);
    }, 2000);

    // Temporizador para siguiente ronda
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleNextAction();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(revealTimer);
      clearInterval(timer);
    };
  }, [votedPlayerId, room.players]);

  const handleNextAction = () => {
    // ✅ CORREGIDO: Usar snake_case
    const remainingPlayers = room.players.filter(p => p.is_alive);
    // ✅ CORREGIDO: Usar snake_case
    const impostorsAlive = remainingPlayers.filter(p => p.is_impostor).length;
    const playersAlive = remainingPlayers.filter(p => !p.is_impostor).length;

    // Condiciones de victoria
    if (impostorsAlive === 0) {
      onGameOver('players'); // Jugadores ganan
    } else if (impostorsAlive >= playersAlive) {
      onGameOver('impostor'); // Impostor gana
    } else if (room.current_round && room.current_round >= room.total_rounds) {
      onGameOver('impostor'); // Impostor gana por tiempo
    } else {
      onNextRound(); // Continuar a siguiente ronda
    }
  };

  const getGameStatus = () => {
    if (!votedPlayerId) {
      return {
        title: "Nadie fue eliminado",
        message: "La votación terminó en empate",
        color: "text-yellow-400"
      };
    }

    if (wasImpostor) {
      return {
        title: "¡IMPOSTOR ELIMINADO!",
        message: "¡Los jugadores encontraron al impostor!",
        color: "text-green-400"
      };
    } else {
      return {
        title: "Jugador eliminado",
        message: "Era un jugador inocente",
        color: "text-red-400"
      };
    }
  };

  const status = getGameStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Resultados de la Ronda</h1>
          <p className="text-gray-300">
            {/* ✅ CORREGIDO: Usar snake_case */}
            Ronda {room.current_round} de {room.total_rounds}
          </p>
        </div>

        {/* Resultado principal */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8 text-center">
          {!showReveal ? (
            // Estado de carga/revelación
            <div className="py-12">
              <div className="text-6xl mb-4"></div>
              <h2 className="text-3xl font-bold mb-4">Analizando votos...</h2>
              <p className="text-gray-400">Descubriendo la verdad...</p>
            </div>
          ) : (
            // Resultado revelado
            <>
              <div className={`text-4xl font-bold mb-4 ${status.color}`}>
                {status.title}
              </div>
              
              {eliminatedPlayer && (
                <div className="mb-6">
                  <div className="text-6xl mb-4">
                    {wasImpostor ? '🎭' : '😇'}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">
                    {eliminatedPlayer.name}
                  </h3>
                  <p className="text-gray-300 text-lg">
                    {wasImpostor 
                      ? '¡Era el IMPOSTOR!' 
                      : 'Era un jugador inocente'
                    }
                  </p>
                </div>
              )}

              {!votedPlayerId && (
                <div className="mb-6">
                  <div className="text-6xl mb-4"></div>
                  <p className="text-gray-300 text-lg">
                    Los jugadores no se pusieron de acuerdo en esta ronda
                  </p>
                </div>
              )}

              <p className="text-gray-400 text-lg">
                {status.message}
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          
          {/* Jugadores activos */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-green-400">Jugadores Activos</h3>
            <div className="space-y-2">
              {alivePlayers.map(player => (
                <div 
                  key={player.id}
                  className={`p-3 rounded ${
                    player.name === currentPlayer.name 
                      ? 'bg-green-700' 
                      : 'bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium">
                      {player.name}
                      {player.name === currentPlayer.name && (
                        <span className="ml-2 text-green-300 text-sm">(Tú)</span>
                      )}
                    </div>
                    {/* ✅ CORREGIDO: Usar snake_case */}
                    {player.is_impostor && currentPlayer.is_impostor && (
                      <span className="bg-red-500 text-xs px-2 py-1 rounded">Impostor</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-400">
              {alivePlayers.length} jugadores restantes
            </div>
          </div>

          {/* Jugadores eliminados */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-red-400">Jugadores Eliminados</h3>
            {eliminatedPlayers.length > 0 ? (
              <div className="space-y-2">
                {eliminatedPlayers.map(player => (
                  <div 
                    key={player.id}
                    className="p-3 rounded bg-gray-700 opacity-70"
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{player.name}</div>
                      {/* ✅ CORREGIDO: Usar snake_case */}
                      {player.is_impostor ? (
                        <span className="bg-red-500 text-xs px-2 py-1 rounded">Impostor</span>
                      ) : (
                        <span className="bg-blue-500 text-xs px-2 py-1 rounded">Inocente</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">
                Nadie ha sido eliminado aún
              </p>
            )}
            <div className="mt-4 text-sm text-gray-400">
              {eliminatedPlayers.length} jugadores eliminados
            </div>
          </div>
        </div>

        {/* Estadísticas de la ronda */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">Estadísticas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-2xl font-bold text-green-400">{alivePlayers.length}</div>
              <div className="text-gray-400 text-sm">Jugadores Activos</div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-2xl font-bold text-red-400">{eliminatedPlayers.length}</div>
              <div className="text-gray-400 text-sm">Eliminados</div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              {/* ✅ CORREGIDO: Usar snake_case */}
              <div className="text-2xl font-bold text-yellow-400">
                {room.players.filter(p => p.is_impostor && p.is_alive).length}
              </div>
              <div className="text-gray-400 text-sm">Impostores Vivos</div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              {/* ✅ CORREGIDO: Usar snake_case */}
              <div className="text-2xl font-bold text-blue-400">
                {room.current_round}/{room.total_rounds}
              </div>
              <div className="text-gray-400 text-sm">Ronda Actual</div>
            </div>
          </div>
        </div>

        {/* Siguiente acción */}
        <div className="text-center">
          <div className="bg-blue-900 rounded-lg p-6 mb-4">
            <p className="text-blue-300 text-lg mb-2">
              Siguiente fase en: <span className="font-bold">{timeLeft}s</span>
            </p>
            <p className="text-blue-200">
              {timeLeft > 0 
                ? 'Preparando siguiente ronda...' 
                : 'Avanzando...'
              }
            </p>
          </div>

          {/* Información para el impostor */}
          {/* ✅ CORREGIDO: Usar snake_case */}
          {currentPlayer.is_impostor && currentPlayer.is_alive && (
            <div className="bg-red-900 border border-red-600 rounded-lg p-4 mb-4">
              <h4 className="font-bold text-red-300 mb-2">Eres el Impostor</h4>
              <p className="text-red-200 text-sm">
                {wasImpostor 
                  ? '¡Cuidado! Están cerca de descubrirte' 
                  : 'Bien hecho, eliminaron a un inocente'
                }
              </p>
            </div>
          )}

          {/* Información para jugadores */}
          {/* ✅ CORREGIDO: Usar snake_case */}
          {!currentPlayer.is_impostor && currentPlayer.is_alive && (
            <div className="bg-green-900 border border-green-600 rounded-lg p-4">
              <h4 className="font-bold text-green-300 mb-2">Eres Jugador</h4>
              <p className="text-green-200 text-sm">
                {wasImpostor 
                  ? '¡Bien hecho! Encontraron al impostor' 
                  : 'Lastima, eliminaron a un inocente. Sigan buscando'
                }
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ResultsPhase;