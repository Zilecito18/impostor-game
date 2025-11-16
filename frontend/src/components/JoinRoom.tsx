import React, { useState } from 'react';
import type { Room } from '../types/game';
import { roomService } from '../services/roomService';

interface JoinRoomProps {
  onRoomJoined: (room: Room) => void;
  playerName: string;
}

const JoinRoom: React.FC<JoinRoomProps> = ({ onRoomJoined, playerName }) => {
  const [roomCode, setRoomCode] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('Por favor ingresa tu nombre en el menú principal');
      return;
    }

    if (!roomCode.trim()) {
      setError('Por favor ingresa el código de la sala');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const result = await roomService.joinRoom({
        player_name: playerName,
        room_code: roomCode.toUpperCase()
      });

      if (result.success) {
        // Convertir la respuesta del backend al tipo Room que espera el frontend
        const joinedRoom: Room = {
          id: result.room?.code || roomCode.toUpperCase(),
          code: result.room?.code || roomCode.toUpperCase(),
          hostId: result.room?.players?.find((p: any) => p.is_host)?.id || 'host-id',
          maxPlayers: result.room?.max_players || 8,
          rounds: result.room?.total_rounds || 5,
          players: result.room?.players?.map((player: any) => ({
            id: player.id,
            name: player.name,
            isHost: player.is_host,
            isAlive: player.is_alive,
            isImpostor: player.is_impostor || false
          })) || [],
          status: result.room?.status || 'waiting',
          debateMode: result.room?.debate_mode || false,
          debateTime: 5, // Valor por defecto
          currentRound: result.room?.current_round || 1,
          totalRounds: result.room?.total_rounds || 5
        };

        onRoomJoined(joinedRoom);
      } else {
        setError(result.message || 'Error al unirse a la sala');
      }
    } catch (error: any) {
      console.error('Error joining room:', error);
      setError(error.message || 'Error de conexión con el servidor');
      
      // Fallback: unirse a sala local si el backend falla
      const fallbackRoom: Room = {
        id: roomCode.toUpperCase(),
        code: roomCode.toUpperCase(),
        hostId: 'host-id',
        maxPlayers: 8,
        rounds: 5,
        players: [
          {
            id: 'existing-player',
            name: 'Jugador Existente',
            isHost: true,
            isAlive: true,
            isImpostor: false
          },
          {
            id: 'new-player',
            name: playerName,
            isHost: false,
            isAlive: true,
            isImpostor: false
          }
        ],
        status: 'waiting',
        debateMode: false,
        debateTime: 5,
        currentRound: 1,
        totalRounds: 5
      };

      onRoomJoined(fallbackRoom);
    } finally {
      setIsJoining(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && roomCode.trim() && playerName.trim()) {
      handleJoinRoom();
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-xl border-2 border-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Unirse a Sala</h2>
      
      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg mb-4">
          <div className="flex items-center">
            <span className="text-lg mr-2">⚠️</span>
            <span>{error}</span>
          </div>
          {error.includes('conexión') && (
            <p className="text-sm mt-1 text-red-200">
              Se unirá a una sala local como respaldo.
            </p>
          )}
        </div>
      )}

      <div className="space-y-6">
        {/* Código de sala */}
        <div>
          <label className="block text-sm font-medium mb-3 text-center text-gray-300">
            Código de la Sala:
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyPress={handleKeyPress}
            className="w-full p-4 rounded-lg bg-gray-700 border-2 border-gray-600 focus:border-blue-500 focus:outline-none transition-colors text-center text-xl font-mono tracking-widest text-white"
            placeholder="EJ: A1B2C3"
            maxLength={6}
            disabled={isJoining}
          />
          <p className="text-gray-400 text-sm mt-2 text-center">
            Pide el código de 6 letras al anfitrión de la sala
          </p>
        </div>

        {/* Información del jugador */}
        <div className="bg-gray-700 p-4 rounded-lg border-2 border-gray-600">
          <h3 className="text-sm font-medium text-gray-300 mb-2 text-center">
            Te unirás como:
          </h3>
          <div className="text-center">
            <span className="text-blue-400 font-bold text-lg">{playerName || 'Sin nombre'}</span>
          </div>
          {!playerName.trim() && (
            <p className="text-orange-400 text-center text-sm mt-2">
              Primero ingresa tu nombre en el menú principal
            </p>
          )}
        </div>

        {/* Estado de conexión */}
        <div className="text-center">
          <div className="flex items-center justify-center text-sm text-gray-400 mb-2">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isJoining ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
            }`}></div>
            {isJoining ? 'Conectando con el servidor...' : 'Servidor listo'}
          </div>
        </div>

        {/* Botón Unirse */}
        <button
          onClick={handleJoinRoom}
          disabled={!roomCode.trim() || !playerName.trim() || isJoining}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed py-4 rounded-lg font-bold text-white transition-all transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center"
        >
          {isJoining ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Uniéndose...
            </>
          ) : (
            '🎯 Unirse a Sala'
          )}
        </button>

        {/* Información de desarrollo */}
        {import.meta.env.DEV && (
          <div className="text-center text-xs text-gray-500 mt-2">
            Modo desarrollo: Backend en localhost:8000
          </div>
        )}

        {/* Consejos */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <h4 className="text-blue-400 text-sm font-medium mb-1">💡 Consejo:</h4>
          <p className="text-blue-300 text-xs">
            El código de sala es de 6 caracteres (letras y números). Asegúrate de escribirlo correctamente.
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;