import React, { useState, useEffect } from 'react';
import type { Room as RoomType, Player as PlayerType } from '../types/game';
import { roomService } from '../services/roomService';
import { useWebSocket } from '../hooks/useWebSocket';
import DebugTools from './DebugTools';

interface RoomProps {
  room: RoomType;
  playerName: string;
  onGameStart: () => void;
}

// Función para convertir room del backend al tipo frontend - MOVIDA AFUERA DEL COMPONENTE
const convertBackendRoomToFrontend = (backendRoom: any): RoomType => {
  return {
    id: backendRoom.code || backendRoom.id,
    code: backendRoom.code,
    hostId: backendRoom.players?.find((p: any) => p.is_host || p.isHost)?.id || 'host-id',
    maxPlayers: backendRoom.max_players || backendRoom.maxPlayers || 8,
    rounds: backendRoom.total_rounds || backendRoom.rounds || 5,
    players: (backendRoom.players || []).map((player: any) => ({
      id: player.id,
      name: player.name,
      isHost: player.is_host || player.isHost || false,
      isAlive: player.is_alive !== undefined ? player.is_alive : player.isAlive !== undefined ? player.isAlive : true,
      isImpostor: player.is_impostor || player.isImpostor || false,
      assignedPlayer: player.assigned_player || player.assignedPlayer
    })),
    status: backendRoom.status || 'waiting',
    debateMode: backendRoom.debate_mode || backendRoom.debateMode || false,
    debateTime: backendRoom.debate_time || backendRoom.debateTime || 5,
    currentRound: backendRoom.current_round || backendRoom.currentRound || 1,
    totalRounds: backendRoom.total_rounds || backendRoom.totalRounds || 5
  };
};

const Room: React.FC<RoomProps> = ({ room, playerName, onGameStart }) => {
  const [currentRoom, setCurrentRoom] = useState<RoomType>(room);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Conectar WebSocket a la sala
  const { isConnected, gameState, sendMessage } = useWebSocket(room.code);
  
  const currentPlayer = currentRoom.players.find(p => p.name === playerName);
  const isHost = currentPlayer?.isHost;

  // Sincronizar estado cuando lleguen actualizaciones via WebSocket
  useEffect(() => {
    if (gameState) {
      console.log('🔄 Actualizando sala desde WebSocket:', gameState);
      const convertedRoom = convertBackendRoomToFrontend(gameState);
      setCurrentRoom(convertedRoom);
    }
  }, [gameState]);

  // Escuchar mensajes de nuevos jugadores via WebSocket
  useEffect(() => {
    if (isConnected) {
      console.log('✅ Conectado a la sala via WebSocket');
      // Solicitar estado actual de la sala
      sendMessage('get_room_state', {});
    }
  }, [isConnected, sendMessage]);

  // Actualizar periódicamente el estado de la sala (OPCIONAL - comentado por ahora)
  /*
  useEffect(() => {
    const interval = setInterval(async () => {
      if (room.code && isConnected) {
        try {
          const roomData = await roomService.getRoom(room.code);
          if (roomData) {
            const convertedRoom = convertBackendRoomToFrontend(roomData);
            setCurrentRoom(convertedRoom);
          }
        } catch (error) {
          console.log('No se pudo actualizar el estado de la sala');
        }
      }
    }, 5000); // Actualizar cada 5 segundos

    return () => clearInterval(interval);
  }, [room.code, isConnected]);
  */

  const handleStartGame = async () => {
    if (!isHost) return;

    setIsStarting(true);
    setError(null);

    try {
      console.log(`🎯 Iniciando juego en sala: ${room.code}`);
      const result = await roomService.startGame(room.code);
      
      if (result.success) {
        console.log('🎮 Juego iniciado:', result);
        
        // Convertir y actualizar estado local
        const updatedRoom = convertBackendRoomToFrontend({
          ...result.room,
          status: 'playing'
        });
        
        setCurrentRoom(updatedRoom);
        
        // Notificar al componente padre
        onGameStart();
      } else {
        setError(result.message || 'Error al iniciar el juego');
      }
    } catch (error: any) {
      console.error('Error starting game:', error);
      setError(error.message || 'Error de conexión con el servidor');
      
      // Fallback: iniciar juego localmente
      const updatedRoom: RoomType = {
        ...currentRoom,
        status: 'playing'
      };
      setCurrentRoom(updatedRoom);
      onGameStart();
    } finally {
      setIsStarting(false);
    }
  };

  const handleAddBot = () => {
    // Enviar mensaje via WebSocket para agregar bot
    const sent = sendMessage('add_bot', {});
    
    if (!sent) {
      // Fallback local si WebSocket no está disponible
      const botNames = [
        'Lionel Messi', 'Cristiano Ronaldo', 'Neymar Jr', 'Kylian Mbappé',
        'Kevin De Bruyne', 'Virgil van Dijk', 'Robert Lewandowski', 'Mohamed Salah'
      ];
      
      const availableNames = botNames.filter(name => 
        !currentRoom.players.some(player => player.name === name)
      );

      if (availableNames.length > 0 && currentRoom.players.length < currentRoom.maxPlayers) {
        const newBot: PlayerType = {
          id: `bot-${Date.now()}`,
          name: availableNames[0],
          isHost: false,
          isAlive: true,
          isImpostor: false
        };

        setCurrentRoom(prev => ({
          ...prev,
          players: [...prev.players, newBot]
        }));
      }
    }
  };

  // Función para recargar el estado de la sala manualmente
  const handleRefreshRoom = async () => {
    try {
      const roomData = await roomService.getRoom(room.code);
      if (roomData) {
        const convertedRoom = convertBackendRoomToFrontend(roomData);
        setCurrentRoom(convertedRoom);
      }
    } catch (error) {
      console.error('Error refreshing room:', error);
      setError('Error al actualizar la sala');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 bg-[url('https://images.unsplash.com/photo-1556056504-5c7696c4c28d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center bg-fixed p-4">
      <div className="bg-black/60 backdrop-blur-sm min-h-screen">
        <div className="max-w-4xl mx-auto">
          
          {/* Estado de conexión */}
          <div className={`p-3 rounded-lg mb-4 text-center ${
            isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            <div className="flex items-center justify-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              {isConnected ? '✅ Conectado al servidor' : '❌ Desconectado del servidor'}
            </div>
            <button 
              onClick={handleRefreshRoom}
              className="mt-2 text-sm text-gray-300 hover:text-white underline"
            >
              Actualizar estado
            </button>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-lg mr-2">⚠️</span>
                  <span>{error}</span>
                </div>
                <button 
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-200"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Herramientas de Debug - Solo en desarrollo */}
          {import.meta.env.DEV && isHost && (
            <DebugTools 
              room={currentRoom}
              onAddBot={handleAddBot}
              onStartGame={handleStartGame}
            />
          )}

          {/* Header de la sala */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 mb-6 shadow-lg border border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-white">Sala: {currentRoom.code}</h2>
                <p className="text-gray-300 mt-1">
                  {currentRoom.status === 'waiting' ? '🟡 Esperando jugadores...' : '🟢 Juego en progreso'}
                </p>
                {import.meta.env.DEV && (
                  <p className="text-yellow-400 text-sm mt-1">🔧 Modo Desarrollo Activo</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm bg-gray-700 px-4 py-2 rounded-full font-semibold text-white">
                  {currentRoom.players.length}/{currentRoom.maxPlayers} jugadores
                </div>
                <div className="text-xs text-gray-300 mt-1">
                  {currentRoom.rounds} rondas • {currentRoom.debateMode ? '🗣️ Modo Debate' : '❓ Modo Preguntas'}
                </div>
              </div>
            </div>
          </div>

          {/* Lista de jugadores */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 mb-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 flex items-center text-white">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Jugadores en sala ({currentRoom.players.length})
            </h3>
            
            {currentRoom.players.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>No hay jugadores en la sala todavía</p>
                <p className="text-sm mt-2">Comparte el código de la sala: <strong className="text-white">{currentRoom.code}</strong></p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentRoom.players.map((player) => (
                  <div 
                    key={player.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      player.isHost 
                        ? 'border-blue-500 bg-blue-500/20' 
                        : 'border-gray-600 bg-gray-700/70'
                    } ${player.name === playerName ? 'ring-2 ring-green-400' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-lg text-white">
                        {player.name}
                        {player.name !== playerName && (player.name.includes('Messi') || player.name.includes('Ronaldo')) && (
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
                    {player.isImpostor && currentRoom.status === 'playing' && (
                      <div className="text-red-400 text-sm mt-1">🎭 Impostor</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Botón de inicio (solo para el host) */}
            {isHost && currentRoom.status === 'waiting' && currentRoom.players.length >= 1 && (
              <div className="text-center mt-6">
                <button 
                  onClick={handleStartGame}
                  disabled={isStarting}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-all transform hover:scale-105 disabled:hover:scale-100 text-white flex items-center justify-center mx-auto"
                >
                  {isStarting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Iniciando...
                    </>
                  ) : (
                    '🚀 Iniciar Juego'
                  )}
                </button>
                <p className="text-gray-300 text-sm mt-2">
                  {import.meta.env.DEV 
                    ? 'Modo testing: 1+ jugadores requeridos' 
                    : `Mínimo 4 jugadores requeridos (${currentRoom.players.length}/${Math.max(4, currentRoom.players.length)})`
                  }
                </p>
              </div>
            )}

            {isHost && currentRoom.players.length < 1 && (
              <div className="text-center text-orange-400 bg-orange-400/10 p-4 rounded-lg mt-4">
                Necesitas al menos 1 jugador para iniciar el juego (modo testing)
              </div>
            )}

            {currentRoom.status === 'playing' && (
              <div className="text-center text-green-400 bg-green-400/10 p-4 rounded-lg mt-4">
                🎮 El juego está en progreso...
              </div>
            )}
          </div>

          {/* Información de la sala */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
            <h4 className="text-lg font-semibold text-white mb-3">📊 Información de la Sala</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-gray-400">Estado</div>
                <div className={`font-bold ${currentRoom.status === 'waiting' ? 'text-yellow-400' : 'text-green-400'}`}>
                  {currentRoom.status === 'waiting' ? 'Esperando' : 'En Juego'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Modo</div>
                <div className="font-bold text-blue-400">
                  {currentRoom.debateMode ? 'Debate' : 'Preguntas'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Rondas</div>
                <div className="font-bold text-purple-400">
                  {currentRoom.rounds}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Conexión</div>
                <div className={`font-bold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
            <h4 className="text-blue-400 font-semibold mb-2">💡 Instrucciones:</h4>
            <ul className="text-blue-300 text-sm space-y-1">
              <li>• Comparte el código <strong>{currentRoom.code}</strong> con otros jugadores</li>
              <li>• Cuando todos estén listos, haz clic en "Iniciar Juego"</li>
              <li>• El anfitrión puede agregar bots para testing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;