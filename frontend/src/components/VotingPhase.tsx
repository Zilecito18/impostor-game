import React, { useState, useEffect } from 'react';
import type { Room, Player } from '../types/game';

interface VotingPhaseProps {
  room: Room;
  currentPlayer: Player;
  onVotingComplete: (votedPlayerId: string | null) => void;
}

const VotingPhase: React.FC<VotingPhaseProps> = ({ 
  room, 
  currentPlayer, 
  onVotingComplete 
}) => {
  // ✅ CORREGIDO: Usar snake_case
  const initialTime = room.debate_mode ? room.debate_time * 60 : 45;
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [playerVotes, setPlayerVotes] = useState<{[key: string]: number}>({});

  // ✅ CORREGIDO: Usar snake_case
  const alivePlayers = room.players.filter(player => player.is_alive);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleTimeUp = () => {
    if (!hasVoted) {
      handleVote(null);
    }
  };

  const handleVote = (playerId: string | null) => {
    if (hasVoted) return;

    setSelectedPlayer(playerId);
    setHasVoted(true);

    simulateOtherVotes(playerId);

    setTimeout(() => {
      onVotingComplete(playerId);
    }, 3000);
  };

  const simulateOtherVotes = (userVote: string | null) => {
    const votes: {[key: string]: number} = {};
    
    if (userVote) {
      votes[userVote] = 1;
    }

    alivePlayers.forEach(player => {
      if (player.id !== currentPlayer.id) {
        const randomVote = Math.random() < 0.7;
        if (randomVote) {
          const randomPlayer = alivePlayers.filter(p => p.id !== player.id)[
            Math.floor(Math.random() * (alivePlayers.length - 1))
          ];
          if (randomPlayer) {
            votes[randomPlayer.id] = (votes[randomPlayer.id] || 0) + 1;
          }
        }
      }
    });

    setPlayerVotes(votes);
  };

  const getPlayerVoteCount = (playerId: string) => {
    return playerVotes[playerId] || 0;
  };

  const formatTime = (seconds: number) => {
    // ✅ CORREGIDO: Usar snake_case
    if (room.debate_mode) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${seconds}s`;
  };

  const getSuspicionReason = (playerName: string): string => {
    const reasons = [
      `${playerName} dio respuestas muy genéricas sobre equipos`,
      `${playerName} dudó al responder sobre la nacionalidad`,
      `${playerName} tuvo información inconsistente entre rondas`,
      `${playerName} tuvo tiempos de respuesta muy largos`,
      `Patrón de respuestas de ${playerName} similar al impostor`,
      `${playerName} evitó responder preguntas específicas`,
      `${playerName} cambió su historia sobre el equipo`
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900 to-red-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            {/* ✅ CORREGIDO: Usar snake_case */}
            {room.debate_mode ? 'Fase de Discución' : 'Fase de Votación'}
          </h1>
          <p className="text-gray-300 text-lg">
            {/* ✅ CORREGIDO: Usar snake_case */}
            {room.debate_mode 
              ? `Discute y vota para eliminar al impostor (${room.debate_time} min)` 
              : 'Vota para eliminar al jugador más sospechoso'
            }
          </p>
        </div>

        {/* Información de la ronda y temporizador */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              {/* ✅ CORREGIDO: Usar snake_case */}
              <h2 className="text-2xl font-bold">Ronda {room.current_round} de {room.total_rounds}</h2>
              <p className="text-gray-400">
                {hasVoted ? 'Ya votaste - Esperando resultados...' : '¿Quién es el impostor?'}
              </p>
              <div className="flex items-center mt-2">
                <span className={`text-sm px-2 py-1 rounded ${
                  // ✅ CORREGIDO: Usar snake_case
                  room.debate_mode ? 'bg-green-600' : 'bg-blue-600'
                }`}>
                  {/* ✅ CORREGIDO: Usar snake_case */}
                  {room.debate_mode ? `Debate: ${room.debate_time} min` : 'Votación Rápida'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${
                // ✅ CORREGIDO: Usar snake_case
                timeLeft <= (room.debate_mode ? 60 : 10) ? 'text-red-400 animate-pulse' : 'text-yellow-400'
              }`}>
                {formatTime(timeLeft)}
              </div>
              <div className="text-gray-400">
                {/* ✅ CORREGIDO: Usar snake_case */}
                {room.debate_mode ? 'Tiempo de discución' : 'Tiempo para votar'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Lista de jugadores para votar */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">Selecciona un sospechoso:</h3>
            
            <div className="space-y-3">
              {alivePlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => !hasVoted && handleVote(player.id)}
                  disabled={hasVoted || player.id === currentPlayer.id}
                  className={`w-full p-4 rounded-lg text-left transition-all ${
                    selectedPlayer === player.id
                      ? 'bg-red-600 border-2 border-red-400'
                      : player.id === currentPlayer.id
                      ? 'bg-gray-700 cursor-not-allowed opacity-60'
                      : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                  } ${hasVoted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="font-medium text-lg">{player.name}</div>
                      {player.id === currentPlayer.id && (
                        <span className="ml-2 text-green-400 text-sm">(Tú)</span>
                      )}
                    </div>
                    
                    {/* Contador de votos */}
                    {hasVoted && (
                      <div className="flex items-center">
                        <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                          {getPlayerVoteCount(player.id)} votos
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Razones para sospechar (simuladas) */}
                  {hasVoted && getPlayerVoteCount(player.id) > 0 && (
                    <div className="mt-2 text-sm text-gray-300">
                      {getSuspicionReason(player.name)}
                    </div>
                  )}
                </button>
              ))}

              {/* Opción de no votar */}
              <button
                onClick={() => !hasVoted && handleVote(null)}
                disabled={hasVoted}
                className={`w-full p-4 rounded-lg text-center transition-all ${
                  selectedPlayer === null
                    ? 'bg-yellow-600 border-2 border-yellow-400'
                    : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                } ${hasVoted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="font-medium">No votar a nadie</div>
                <div className="text-sm text-gray-300">Pasar la ronda sin eliminar</div>
              </button>
            </div>
          </div>

          {/* Área de discusión y pistas */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">
              {/* ✅ CORREGIDO: Usar snake_case */}
              {room.debate_mode ? 'Discución en Curso' : 'Información de Votación'}
            </h3>
            
            {/* ✅ CORREGIDO: Usar snake_case */}
            {room.debate_mode ? (
              /* MODO DEBATE ACTIVADO - Chat integrado */
              <div className="space-y-4 max-h-96 overflow-y-auto">

                {/* Input para nuevo mensaje (simulado) */}
                <div className="bg-gray-700 p-3 rounded-lg">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Escribe tu mensaje..."
                      className="flex-1 p-2 rounded bg-gray-600 border border-gray-500 text-white placeholder-gray-400"
                      disabled
                    />
                    <button className="bg-green-600 px-4 rounded hover:bg-green-700 transition-colors">
                      Enviar
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    💡 Participa activamente en el debate
                  </p>
                </div>
              </div>
            ) : (
              /* MODO DEBATE DESACTIVADO - Información para llamadas externas */
              <div className="space-y-4">
                <div className="bg-blue-900 border border-blue-600 p-6 rounded-lg text-center">
                  <div className="text-4xl mb-4"></div>
                  <h4 className="text-lg font-bold text-blue-300 mb-2">Modo Debate Desactivado</h4>
                  <p className="text-blue-200 mb-4">
                    Usa Discord, Zoom o llamada para debatir con tus amigos
                  </p>
                  <div className="bg-blue-800 p-3 rounded-lg">
                    <p className="text-sm text-blue-100">
                      💡 <strong>Consejo:</strong> Coordina la votación con tu equipo en la llamada
                    </p>
                  </div>
                </div>

                {/* Pistas fijas */}
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-bold text-yellow-400 mb-2">🔍 Pistas Recordatorias:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Revisa las respuestas sobre equipos y nacionalidades</li>
                    <li>• Busca inconsistencias en las historias</li>
                    <li>• Observa quién dudó más al responder</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ✅ CORREGIDO: Usar snake_case */}
            {currentPlayer.is_impostor && (
              <div className="mt-4 bg-red-900 border border-red-600 p-4 rounded-lg">
                <div className="font-bold text-red-300 mb-2">Eres el Impostor</div>
                <p className="text-red-200 text-sm">
                  {/* ✅ CORREGIDO: Usar snake_case */}
                  {room.debate_mode 
                    ? 'Participa en el debate sin levantar sospechas' 
                    : 'Escucha atentamente la discusión en la llamada'
                  }
                </p>
              </div>
            )}

            {/* Estado de la votación */}
            {hasVoted && (
              <div className="mt-4 bg-blue-900 border border-blue-600 p-4 rounded-lg">
                <div className="font-bold text-blue-300">Votación en curso</div>
                <p>Los jugadores están votando... Resultados en {timeLeft > 3 ? timeLeft - 3 : 'unos'} segundos</p>
                
                <div className="mt-2 space-y-1">
                  {alivePlayers.map(player => (
                    getPlayerVoteCount(player.id) > 0 && (
                      <div key={player.id} className="flex justify-between text-sm">
                        <span>{player.name}:</span>
                        <span>{getPlayerVoteCount(player.id)} votos</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Consejos de votación */}
        <div className="mt-6 p-4 bg-purple-900 rounded-lg">
          <h4 className="font-bold text-purple-300 mb-2">💡 Consejos para {/* ✅ CORREGIDO: Usar snake_case */room.debate_mode ? 'debate' : 'votación'}:</h4>
          <ul className="text-sm text-purple-200 space-y-1 grid grid-cols-1 md:grid-cols-2">
            <li>• Busca respuestas vagas o inconsistentes</li>
            <li>• Observa quién duda mucho al responder</li>
            {/* ✅ CORREGIDO: Usar snake_case */}
            {room.debate_mode && <li>• Participa activamente en el debate</li>}
            {!room.debate_mode && <li>• Coordina con tu equipo en la llamada</li>}
            <li>• No votes al azar - analiza las respuestas</li>
          </ul>
        </div>

        {/* Estado de la votación actual */}
        {hasVoted && (
          <div className="text-center mt-8 p-4 bg-green-900 rounded-lg">
            <p className="text-green-300 text-lg">
              <strong>¡Votación registrada!</strong> Esperando resultados...
            </p>
            <p className="text-green-200">
              {selectedPlayer 
                ? `Votaste por: ${alivePlayers.find(p => p.id === selectedPlayer)?.name}`
                : 'Decidiste no votar a nadie'
              }
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default VotingPhase;