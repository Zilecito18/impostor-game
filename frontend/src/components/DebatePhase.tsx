import React, { useState, useEffect } from 'react';
import type { Room, Player } from '../types/game';

interface DebatePhaseProps {
  room: Room;
  currentPlayer: Player;
  onDebateComplete: () => void;
}

const DebatePhase: React.FC<DebatePhaseProps> = ({ 
  room, 
  currentPlayer, 
  onDebateComplete 
}) => {
  // ✅ CORREGIDO: Usar snake_case
  const [timeLeft, setTimeLeft] = useState(room.debate_time * 60); // Convertir a segundos
  const [hasFinished, setHasFinished] = useState(false);
  const [finishedPlayers, setFinishedPlayers] = useState<string[]>([]);

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
    onDebateComplete();
  };

  const handleFinishDebate = () => {
    if (!hasFinished) {
      setHasFinished(true);
      setFinishedPlayers(prev => [...prev, currentPlayer.id]);
      
      // Simular que otros jugadores también terminan
      setTimeout(() => {
        const randomPlayers = alivePlayers
          .filter(p => p.id !== currentPlayer.id)
          .slice(0, Math.floor(Math.random() * alivePlayers.length / 2))
          .map(p => p.id);
        
        setFinishedPlayers(prev => [...prev, ...randomPlayers]);
      }, 1000);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const allPlayersFinished = finishedPlayers.length >= alivePlayers.length;

  // Si todos terminaron o se acabó el tiempo, pasar automáticamente
  useEffect(() => {
    if (allPlayersFinished && hasFinished) {
      const timer = setTimeout(() => {
        onDebateComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [allPlayersFinished, hasFinished, onDebateComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4"></div>
          <h1 className="text-4xl font-bold mb-4">Tiempo de Debatir</h1>
          <p className="text-gray-300 text-lg">
            Turnense y digan una palabra referente al jugador Asignando
          </p>
        </div>

        {/* Información principal */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="text-left">
              {/* ✅ CORREGIDO: Usar snake_case */}
              <h2 className="text-2xl font-bold">Ronda {room.current_round} de {room.total_rounds}</h2>
              <p className="text-gray-400">Tiempo de Debatir</p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${
                timeLeft <= 60 ? 'text-red-400 animate-pulse' : 'text-yellow-400'
              }`}>
                {formatTime(timeLeft)}
              </div>
              <div className="text-gray-400">
                {/* ✅ CORREGIDO: Usar snake_case */}
                {room.debate_time} {room.debate_time === 1 ? 'minuto' : 'minutos'}
              </div>
            </div>
          </div>

          {/* Instrucciones principales */}
          <div className="bg-blue-900 border border-blue-600 rounded-lg p-6 mb-6 text-center">
            <h3 className="text-xl font-bold text-blue-300 mb-4">¡DEBATAN!</h3>
            <p className="text-blue-200 text-lg mb-4">
              Analicen las respuestas que dieron en la fase anterior
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="bg-blue-800 p-4 rounded-lg">
                <h4 className="font-bold text-green-400 mb-2">Para Analizar:</h4>
                <ul className="text-sm text-blue-200 space-y-1">
                  <li>• ¿Quién dio respuestas vagas?</li>
                  <li>• ¿Hubo inconsistencias?</li>
                  <li>• ¿Quién dudó mucho?</li>
                  <li>• ¿Los datos coinciden?</li>
                </ul>
              </div>
              <div className="bg-blue-800 p-4 rounded-lg">
                <h4 className="font-bold text-yellow-400 mb-2">Para Discutir:</h4>
                <ul className="text-sm text-blue-200 space-y-1">
                  <li>• Compartan sus sospechas</li>
                  <li>• Pregunten sobre detalles</li>
                  <li>• Escuchen a los demás</li>
                  <li>• Trabajen en equipo</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Estado del debate */}
          <div className="bg-gray-700 rounded-lg p-6 text-center">
            <h3 className="text-xl font-bold mb-4">Estado del Debate</h3>
            
            {!hasFinished ? (
              <div>
                <p className="text-gray-300 mb-4">
                  Usen este tiempo para debatir sobre las respuestas de cada jugador
                </p>
                
                <button
                  onClick={handleFinishDebate}
                  className="bg-green-600 hover:bg-green-700 px-8 py-4 rounded-lg font-bold text-lg transition-colors"
                >
                  Terminar Debate
                </button>
              </div>
            ) : (
              <div>
                <div className="text-green-400 text-lg font-bold mb-4">
                  ¡Listo! Esperando a los demás jugadores...
                </div>
                <div className="flex justify-center space-x-2 mb-4">
                  {alivePlayers.map(player => (
                    <div
                      key={player.id}
                      className={`w-3 h-3 rounded-full ${
                        finishedPlayers.includes(player.id) ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                      title={player.name}
                    ></div>
                  ))}
                </div>
                <p className="text-gray-300">
                  {finishedPlayers.length} de {alivePlayers.length} jugadores han terminado
                </p>
                
                {allPlayersFinished && (
                  <div className="mt-4 p-3 bg-green-900 rounded-lg">
                    <p className="text-green-300 font-bold">
                      ¡Todos han terminado! Pasando a votación...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recordatorio de que no hay preguntas nuevas */}
        <div className="mt-6 bg-yellow-900 border border-yellow-600 rounded-lg p-4">
          <h4 className="font-bold text-yellow-300 mb-2">Recordatorio</h4>
          <p className="text-yellow-200 text-sm">
            En la fase de discución podran elegir a quien eliminar.
          </p>
        </div>

        {/* Información para llamadas externas */}
        {/* ✅ CORREGIDO: Usar snake_case */}
        {!room.debate_mode && (
          <div className="mt-4 bg-blue-900 border border-blue-600 rounded-lg p-4">
            <h4 className="font-bold text-blue-300 mb-2">Modo Llamada Externa</h4>
            <p className="text-blue-200 text-sm">
              Usa Discord, Zoom o llamada telefónica para debatir con tus compañeros.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default DebatePhase;