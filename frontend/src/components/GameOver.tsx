import React from 'react';
import type { Room, Player } from '../types/game';

interface GameOverProps {
  room: Room;
  currentPlayer: Player;
  winner: 'impostor' | 'players';
  onReturnToMenu: () => void;
  onPlayAgain: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ 
  room, 
  currentPlayer, 
  winner, 
  onReturnToMenu,
  onPlayAgain 
}) => {
  // ✅ CORREGIDO: Usar snake_case
  const isPlayerImpostor = (player: Player): boolean => {
    return player.is_impostor ?? false;
  };

  // ✅ CORREGIDO: Usar snake_case
  const impostors = room.players.filter(player => isPlayerImpostor(player));
  // ✅ CORREGIDO: Usar snake_case
  const alivePlayers = room.players.filter(player => player.is_alive);
  // ✅ CORREGIDO: Usar snake_case
  const eliminatedPlayers = room.players.filter(player => !player.is_alive);

  const playerWon = 
    (winner === 'players' && !isPlayerImpostor(currentPlayer)) ||
    (winner === 'impostor' && isPlayerImpostor(currentPlayer));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header con resultado */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">
            {playerWon ? '' : ''}
          </div>
          <h1 className="text-5xl font-bold mb-4">
            {playerWon ? '¡VICTORIA!' : 'DERROTA'}
          </h1>
          <div className={`text-3xl font-bold mb-4 ${
            winner === 'impostor' ? 'text-red-400' : 'text-green-400'
          }`}>
            {winner === 'impostor' ? 'EL IMPOSTOR GANÓ' : 'LOS JUGADORES GANARON'}
          </div>
          <p className="text-gray-300 text-xl">
            {playerWon 
              ? '¡Felicidades! Cumpliste tu objetivo' 
              : 'Mejor suerte la próxima vez'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* Información del Impostor */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-red-400">El Impostor</h2>
            {impostors.map(impostor => (
              <div key={impostor.id} className="bg-red-900 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-lg">{impostor.name}</div>
                  <span className={`px-2 py-1 rounded text-sm ${
                    // ✅ CORREGIDO: Usar snake_case
                    impostor.is_alive ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {/* ✅ CORREGIDO: Usar snake_case */}
                    {impostor.is_alive ? 'SOBREVIVIÓ' : 'ELIMINADO'}
                  </span>
                </div>
                {impostor.id === currentPlayer.id && (
                  <div className="bg-yellow-600 rounded p-2 text-sm text-yellow-100">
                    ✨ ¡Este eras tú!
                  </div>
                )}
              </div>
            ))}
            {impostors.length === 0 && (
              <p className="text-gray-400 text-center py-4">
                No hay impostores en esta partida
              </p>
            )}
          </div>

          {/* Estadísticas del juego */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-blue-400">Estadísticas Finales</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 p-3 rounded text-center">
                  <div className="text-2xl font-bold text-green-400">{alivePlayers.length}</div>
                  <div className="text-gray-400 text-sm">Sobrevivieron</div>
                </div>
                <div className="bg-gray-700 p-3 rounded text-center">
                  <div className="text-2xl font-bold text-red-400">{eliminatedPlayers.length}</div>
                  <div className="text-gray-400 text-sm">Eliminados</div>
                </div>
              </div>
              
              <div className="bg-gray-700 p-3 rounded">
                <div className="flex justify-between text-sm">
                  <span>Duración del juego:</span>
                  {/* ✅ CORREGIDO: Usar snake_case */}
                  <span className="font-bold">{room.total_rounds} rondas</span>
                </div>
              </div>
              
              <div className="bg-gray-700 p-3 rounded">
                <div className="flex justify-between text-sm">
                  <span>Jugadores totales:</span>
                  <span className="font-bold">{room.players.length}</span>
                </div>
              </div>

              <div className="bg-gray-700 p-3 rounded">
                <div className="flex justify-between text-sm">
                  <span>Tu rol:</span>
                  <span className={`font-bold ${
                    isPlayerImpostor(currentPlayer) ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {isPlayerImpostor(currentPlayer) ? 'IMPOSTOR' : 'JUGADOR'}
                  </span>
                </div>
              </div>

              <div className="bg-gray-700 p-3 rounded">
                <div className="flex justify-between text-sm">
                  <span>Resultado:</span>
                  <span className={`font-bold ${
                    playerWon ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {playerWon ? 'VICTORIA' : 'DERROTA'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista completa de jugadores */}
        <div className="bg-gray-800 rounded-lg p-6 mb-12">
          <h2 className="text-2xl font-bold mb-4">Resumen de Jugadores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {room.players.map(player => (
              <div 
                key={player.id}
                className={`p-4 rounded-lg border-2 ${
                  player.id === currentPlayer.id
                    ? 'border-yellow-400 bg-yellow-400/10'
                    : isPlayerImpostor(player)
                    ? 'border-red-400 bg-red-400/10'
                    : 'border-green-400 bg-green-400/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold">
                    {player.name}
                    {player.id === currentPlayer.id && (
                      <span className="ml-2 text-yellow-400 text-sm">(Tú)</span>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-xs px-2 py-1 rounded ${
                      isPlayerImpostor(player) ? 'bg-red-500' : 'bg-green-500'
                    }`}>
                      {isPlayerImpostor(player) ? 'IMPOSTOR' : 'JUGADOR'}
                    </span>
                    <span className={`text-xs mt-1 px-2 py-1 rounded ${
                      // ✅ CORREGIDO: Usar snake_case
                      player.is_alive ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {/* ✅ CORREGIDO: Usar snake_case */}
                      {player.is_alive ? 'VIVO' : 'ELIMINADO'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="text-center space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <button
              onClick={onPlayAgain}
              className="bg-green-600 hover:bg-green-700 px-8 py-4 rounded-lg font-bold text-lg transition-colors"
            >
              Jugar Otra Vez
            </button>
            <button
              onClick={onReturnToMenu}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg font-bold text-lg transition-colors"
            >
              Volver al Menú
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GameOver;