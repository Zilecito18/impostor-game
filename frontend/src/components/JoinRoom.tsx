import React, { useState } from 'react';
import type { Room } from '../types/game';

interface JoinRoomProps {
  onRoomJoined: (room: Room) => void;
  playerName: string;
}

const JoinRoom: React.FC<JoinRoomProps> = ({ onRoomJoined, playerName }) => {
  const [roomCode, setRoomCode] = useState<string>('');

  const handleJoinRoom = () => {
    // Simulación temporal - luego conectaremos con el backend
    const joinedRoom: Room = {
      id: Math.random().toString(36).substr(2, 9),
      code: roomCode.toUpperCase(),
      hostId: 'host-id',
      maxPlayers: 8,
      rounds: 5,
      players: [
        {
          id: 'existing-player',
          name: 'Jugador Existente',
          isHost: true,
          isAlive: true
        },
        {
          id: 'new-player',
          name: playerName,
          isHost: false,
          isAlive: true
        }
      ],
      status: 'waiting',
      debateMode: false,
      debateTime: 0
    };

    onRoomJoined(joinedRoom);
  };

  return (
    <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-xl">
      <h2 className="text-2xl font-bold mb-6 text-center">Unirse a Sala</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-3 text-center">
            Código de la Sala:
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="w-full p-4 rounded-lg bg-gray-700 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors text-center text-xl font-mono tracking-widest"
            placeholder="EJ: A1B2C3"
            maxLength={6}
          />
          <p className="text-gray-400 text-sm mt-2 text-center">
            Pide el código de 6 letras al anfitrión de la sala
          </p>
        </div>

        <button
          onClick={handleJoinRoom}
          disabled={!roomCode.trim() || !playerName.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-4 rounded-lg font-bold transition-colors text-lg"
        >
          Unirse a la Sala
        </button>

        {!playerName.trim() && (
          <div className="text-orange-400 text-center text-sm">
            Primero ingresa tu nombre en el menú principal
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinRoom;