import React, { useState } from 'react';
import type { Room } from '../types/game';

interface CreateRoomProps {
  onRoomCreated: (room: Room) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
}

const CreateRoom: React.FC<CreateRoomProps> = ({ 
  onRoomCreated, 
  playerName, 
  setPlayerName 
}) => {
  const [maxPlayers, setMaxPlayers] = useState<number>(8);
  const [rounds, setRounds] = useState<number>(5);
  const [debateMode, setDebateMode] = useState<boolean>(true); // Por defecto con chat
  const [debateTime, setDebateTime] = useState<number>(5); // 5 minutos por defecto

  // En CreateRoom.tsx, actualiza el handleCreateRoom:
  const handleCreateRoom = () => {
    const newRoom: Room = {
      id: Math.random().toString(36).substr(2, 9),
      code: Math.random().toString(36).substr(2, 6).toUpperCase(),
      hostId: 'host-id',
      maxPlayers,
      rounds,
      players: [
        {
          id: 'player-1',
          name: playerName,
          isHost: true,
          isAlive: true
        }
      ],
      status: 'waiting',
      debateMode, // ← DEBE ESTAR AQUÍ
      debateTime  // ← DEBE ESTAR AQUÍ
    };

    onRoomCreated(newRoom);
  };

  return (
    <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-xl border-2 border-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Crear Sala</h2>
      
      <div className="space-y-6">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium mb-3 text-gray-300">
            Digita tu nickname:
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full p-4 rounded-lg bg-gray-700 border-2 border-gray-600 focus:border-green-500 focus:outline-none transition-colors text-white placeholder-gray-400"
            placeholder="Digita tu nickname"
          />
        </div>

        {/* Jugadores */}
        <div>
          <label className="block text-sm font-medium mb-3 text-gray-300">
            Máximo de Jugadores: <span className="text-green-400 font-bold">{maxPlayers}</span>
          </label>
          <input
            type="range"
            min="4"
            max="15"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
            className="w-full accent-green-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>4</span>
            <span>15</span>
          </div>
        </div>

        {/* Rondas */}
        <div>
          <label className="block text-sm font-medium mb-3 text-gray-300">
            Número de Rondas: <span className="text-blue-400 font-bold">{rounds}</span>
          </label>
          <input
            type="range"
            min="3"
            max="10"
            value={rounds}
            onChange={(e) => setRounds(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>3</span>
            <span>10</span>
          </div>
        </div>

        {/* Modo Debate */}
        <div className="bg-gray-700 p-4 rounded-lg border-2 border-gray-600">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-gray-300">
              Modo Debate:
              <span className={`ml-2 font-bold ${debateMode ? 'text-green-400' : 'text-red-400'}`}>
                {debateMode ? 'ACTIVADO' : 'DESACTIVADO'}
              </span>
            </span>
            <div className="relative inline-block w-12 h-6">
              <input
                type="checkbox"
                checked={debateMode}
                onChange={(e) => setDebateMode(e.target.checked)}
                className="sr-only"
              />
              <div className={`block w-12 h-6 rounded-full transition-colors ${
                debateMode ? 'bg-green-500' : 'bg-gray-600'
              }`}></div>
              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                debateMode ? 'transform translate-x-6' : ''
              }`}></div>
            </div>
          </label>
          
          {debateMode && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-3 text-gray-300">
                Tiempo para debatir: <span className="text-yellow-400 font-bold">{debateTime} min</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={debateTime}
                onChange={(e) => setDebateTime(parseInt(e.target.value))}
                className="w-full accent-yellow-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 min</span>
                <span>10 min</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {debateTime === 1 ? '1 minuto para debatir' : `${debateTime} minutos para debatir`}
              </p>
            </div>
          )}
          
          {!debateMode && (
            <p className="text-xs text-gray-400 mt-2">
              Ideal para jugar con amigos en llamada (Discord, Zoom, etc.)
            </p>
          )}
        </div>

        {/* Resumen de configuración */}
        <div className="bg-gray-700 p-4 rounded-lg border-2 border-gray-600">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Configuración:</h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• {maxPlayers} jugadores máximo</li>
            <li>• {rounds} rondas</li>
            <li>• Modo debate: {debateMode ? `ACTIVADO (${debateTime} min)` : 'DESACTIVADO'}</li>
            {!debateMode && <li>• Ideal para jugar sin llamadas externas.</li>}
          </ul>
        </div>

        {/* Botón Crear Sala */}
        <button
          onClick={handleCreateRoom}
          disabled={!playerName.trim()}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed py-4 rounded-lg font-bold text-white transition-all transform hover:scale-105 disabled:hover:scale-100"
        >
          Crear Sala
        </button>
      </div>
    </div>
  );
};

export default CreateRoom;