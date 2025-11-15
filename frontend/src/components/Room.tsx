import React, { useState } from 'react';
import type { Room as RoomType } from '../types/game';
import DebugTools from './DebugTools';

interface RoomProps {
  room: RoomType;
  playerName: string;
  onGameStart: () => void;
}

const Room: React.FC<RoomProps> = ({ room, playerName, onGameStart }) => {
  const [debugRoom, setDebugRoom] = useState<RoomType>(room);
  const currentPlayer = debugRoom.players.find(p => p.name === playerName);
  const isHost = currentPlayer?.isHost;

  const handleAddBot = () => {
    const botNames = [
      'Lionel Messi', 'Cristiano Ronaldo', 'Neymar Jr', 'Kylian Mbappé',
      'Kevin De Bruyne', 'Virgil van Dijk', 'Robert Lewandowski', 'Mohamed Salah'
    ];
    
    const availableNames = botNames.filter(name => 
      !debugRoom.players.some(player => player.name === name)
    );

    if (availableNames.length > 0 && debugRoom.players.length < debugRoom.maxPlayers) {
      const newBot = {
        id: `bot-${Date.now()}`,
        name: availableNames[0],
        isHost: false,
        isAlive: true
      };

      setDebugRoom(prev => ({
        ...prev,
        players: [...prev.players, newBot]
      }));
    }
  };

  const handleForceStart = () => {
    onGameStart();
  };

  return (
    // AQUÍ VA EL FONDO CON PATRÓN DE FÚTBOL
    <div className="min-h-screen bg-gray-900 bg-[url('https://images.unsplash.com/photo-1556056504-5c7696c4c28d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center bg-fixed p-4">
      {/* Capa overlay para mejor legibilidad */}
      <div className="bg-black/60 backdrop-blur-sm min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Herramientas de Debug - Solo en desarrollo */}
          {import.meta.env.DEV && isHost && (
            <DebugTools 
              room={debugRoom}
              onAddBot={handleAddBot}
              onStartGame={handleForceStart}
            />
          )}

          {/* Header de la sala */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 mb-6 shadow-lg border border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-white">Sala: {debugRoom.code}</h2>
                <p className="text-gray-300 mt-1">
                  {debugRoom.status === 'waiting' ? 'Esperando jugadores...' : 'Juego en progreso'}
                </p>
                {import.meta.env.DEV && (
                  <p className="text-yellow-400 text-sm mt-1">🔧 Modo Desarrollo Activo</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm bg-gray-700 px-4 py-2 rounded-full font-semibold text-white">
                  {debugRoom.players.length}/{debugRoom.maxPlayers} jugadores
                </div>
                <div className="text-xs text-gray-300 mt-1">
                  {debugRoom.rounds} rondas
                </div>
              </div>
            </div>
          </div>

          {/* Lista de jugadores */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 mb-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 flex items-center text-white">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Jugadores en sala:
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {debugRoom.players.map((player) => (
                <div 
                  key={player.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    player.isHost 
                      ? 'border-blue-500 bg-blue-500/20' 
                      : 'border-gray-600 bg-gray-700/70'
                  } ${player.name === playerName ? 'ring-2 ring-green-400' : ''} ${
                    player.name.includes('Messi') || player.name.includes('Ronaldo') ? 'opacity-90' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-lg text-white">
                      {player.name}
                      {!player.name.includes(playerName) && player.name !== playerName && (
                        <span className="text-xs text-gray-400 ml-2">🤖</span>
                      )}
                    </div>
                    {player.isHost && (
                      <span className="bg-blue-600 text-xs px-2 py-1 rounded-full text-white">Anfitrión</span>
                    )}
                  </div>
                  {player.name === playerName && (
                    <div className="text-green-400 text-sm mt-1">← Tú</div>
                  )}
                </div>
              ))}
            </div>

            {/* Botón de inicio (solo para el host) - MÍNIMO TEMPORAL 1 */}
            {isHost && debugRoom.players.length >= 1 && (
              <div className="text-center mt-6">
                <button 
                  onClick={onGameStart}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-all transform hover:scale-105 text-white"
                >
                  Iniciar Juego
                </button>
                <p className="text-gray-300 text-sm mt-2">
                  {import.meta.env.DEV 
                    ? 'Modo testing: 1+ jugadores requeridos' 
                    : 'Mínimo 4 jugadores requeridos para comenzar'
                  }
                </p>
              </div>
            )}

            {isHost && debugRoom.players.length < 1 && (
              <div className="text-center text-orange-400 bg-orange-400/10 p-4 rounded-lg mt-4">
                Necesitas al menos 1 jugador para iniciar el juego (modo testing)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;