import React from 'react';
import type { Room } from '../types/game';

interface DebugToolsProps {
  room: Room;
  onAddBot: () => void;
  onStartGame: () => void;
}

const DebugTools: React.FC<DebugToolsProps> = ({ room, onAddBot, onStartGame }) => {
  return (
    <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4 mb-4">
      <h3 className="text-yellow-300 font-bold mb-2">🔧 HERRAMIENTAS DE DEBUG</h3>
      <p className="text-yellow-200 text-sm mb-3">
        Modo testing - Estas herramientas solo se ven en desarrollo
      </p>
      
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onAddBot}
          disabled={room.players.length >= room.maxPlayers}
          className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 px-3 py-2 rounded text-sm"
        >
          Añadir Bot (+1)
        </button>
        
        <button
          onClick={onStartGame}
          disabled={room.players.length < 1}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-3 py-2 rounded text-sm"
        >
          Forzar Inicio ({room.players.length}/1+)
        </button>
        
        <div className="text-yellow-200 text-sm">
          Jugadores: {room.players.length}
        </div>
      </div>
    </div>
  );
};

export default DebugTools;