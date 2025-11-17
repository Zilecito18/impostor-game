import React, { useState } from 'react';
import type { Room } from '../types/game';
import { roomService } from '../services/roomService';

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
  const [debateMode, setDebateMode] = useState<boolean>(true);
  const [debateTime, setDebateTime] = useState<number>(5);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await roomService.createRoom({
        player_name: playerName,
        max_players: maxPlayers,
        total_rounds: rounds,
        debate_mode: debateMode
      });

      if (result.success) {
        // ✅ CORREGIDO: Crear objeto Room con snake_case
        const newRoom: Room = {
          code: result.room_code,
          players: result.room?.players?.map((player: any) => ({
            id: player.id,
            name: player.name,
            is_host: player.is_host || false,
            is_alive: player.is_alive !== false,
            is_impostor: player.is_impostor || false,
            is_ready: player.is_ready || false,
            assigned_player: player.assigned_player
          })) || [
            {
              id: 'player-1',
              name: playerName,
              is_host: true,
              is_alive: true,
              is_impostor: false,
              is_ready: false,
              assigned_player: undefined
            }
          ],
          status: result.room?.status || 'waiting',
          max_players: result.room?.max_players || maxPlayers,
          current_round: result.room?.current_round || 1,
          total_rounds: result.room?.total_rounds || rounds,
          debate_mode: result.room?.debate_mode || debateMode,
          debate_time: result.room?.debate_time || debateTime,
          game_started: result.room?.game_started || false
        };
        
        onRoomCreated(newRoom);
      } else {
        setError(result.message || 'Error al crear la sala');
      }
    } catch (error: any) {
      console.error('Error creating room:', error);
      setError(error.message || 'Error de conexión con el servidor');
      
      // ✅ CORREGIDO: Fallback con snake_case
      const fallbackRoom: Room = {
        code: Math.random().toString(36).substr(2, 6).toUpperCase(),
        players: [
          {
            id: 'player-1',
            name: playerName,
            is_host: true,
            is_alive: true,
            is_impostor: false,
            is_ready: false,
            assigned_player: undefined
          }
        ],
        status: 'waiting',
        max_players: maxPlayers,
        current_round: 1,
        total_rounds: rounds,
        debate_mode: debateMode,
        debate_time: debateTime,
        game_started: false
      };
      
      onRoomCreated(fallbackRoom);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-xl border-2 border-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Crear Sala</h2>
      
      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg mb-4">
          <div className="flex items-center">
            <span className="text-lg mr-2">⚠️</span>
            <span>{error}</span>
          </div>
          <p className="text-sm mt-1 text-red-200">
            Se creará una sala local como respaldo.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium mb-3 text-gray-300">
            Digita tu nickname:
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => {
              setPlayerName(e.target.value);
              setError(null);
            }}
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
            {debateMode && <li>• Con chat integrado en la aplicación</li>}
            {!debateMode && <li>• Ideal para jugar en llamadas externas</li>}
          </ul>
        </div>

        {/* Estado de conexión */}
        <div className="text-center">
          <div className="flex items-center justify-center text-sm text-gray-400 mb-2">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isCreating ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
            }`}></div>
            {isCreating ? 'Conectando con el servidor...' : 'Servidor listo'}
          </div>
        </div>

        {/* Botón Crear Sala */}
        <button
          onClick={handleCreateRoom}
          disabled={!playerName.trim() || isCreating}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed py-4 rounded-lg font-bold text-white transition-all transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center"
        >
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creando Sala...
            </>
          ) : (
            'Crear Sala'
          )}
        </button>

        {/* Información de desarrollo */}
        {import.meta.env.DEV && (
          <div className="text-center text-xs text-gray-500 mt-2">
            Modo desarrollo: Backend en localhost:8000
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateRoom;