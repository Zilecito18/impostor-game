import React, { useState, useEffect } from 'react';
import type { Room, FootballPlayer, Player } from '../types/game';

interface RoleAssignmentProps {
  room: Room;
  currentPlayer: Player;
  assignedPlayer?: FootballPlayer;
  onReady: () => void;
}

const RoleAssignment: React.FC<RoleAssignmentProps> = ({ 
  room, 
  currentPlayer,
  assignedPlayer,
  onReady 
}) => {
  const [countdown, setCountdown] = useState(5); // ✅ Reducido a 5 segundos para mejor UX
  const [showRole, setShowRole] = useState(false);
  const [readyPlayers, setReadyPlayers] = useState<string[]>([]);

  // ✅ OBTENER INFORMACIÓN DEL JUGADOR ACTUAL
  const isImpostor = currentPlayer?.is_impostor || false;
  const playerName = currentPlayer?.name || 'Jugador';
  
  // ✅ USAR EL assignedPlayer QUE VIENE DEL BACKEND
  const currentAssignedPlayer = assignedPlayer;

  // ✅ CONTADOR AUTOMÁTICO MEJORADO
  useEffect(() => {
    if (!room || !currentPlayer) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowRole(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [room, currentPlayer]);

  // ✅ ACTUALIZAR JUGADORES LISTOS DESDE EL ROOM - CORREGIDO
  useEffect(() => {
    if (room?.players) {
      const ready = room.players
        .filter(player => player.is_ready)
        .map(player => player.id);
      setReadyPlayers(ready);
    }
  }, [room]);

  // ✅ VERIFICAR SI EL JUGADOR ACTUAL ESTÁ LISTO
  const isCurrentPlayerReady = currentPlayer?.is_ready || false;

  // ✅ MANEJAR CLIC EN BOTÓN LISTO
  const handleReady = () => {
    if (!isCurrentPlayerReady) {
      onReady();
    }
  };

  // ✅ ESTADOS DE CARGA MEJORADOS
  if (!room || !currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold mb-4">Cargando...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  // ✅ PANTALLA DE COUNTDOWN MEJORADA
  if (!showRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl font-bold mb-6 animate-pulse">{countdown}</div>
          <p className="text-2xl text-purple-200 mb-4">Asignando Roles</p>
          <p className="text-purple-300">
            Preparando la partida para {room.players?.length || 0} jugadores
          </p>
          <div className="mt-6">
            <div className="flex justify-center space-x-2">
              {room.players?.map((player) => (
                <div 
                  key={player.id}
                  className={`w-3 h-3 rounded-full ${
                    readyPlayers.includes(player.id)
                      ? 'bg-green-500 animate-pulse' 
                      : 'bg-gray-600'
                  }`}
                  title={player.name}
                />
              ))}
            </div>
            <p className="text-sm text-purple-400 mt-2">
              {readyPlayers.length}/{room.players?.length} listos
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* ✅ HEADER MEJORADO */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            {isImpostor ? '🕵️ Eres el IMPOSTOR' : '👤 Eres un JUGADOR'}
          </h1>
          <p className="text-gray-400 mb-2">
            Jugador: <span className="text-green-400 font-semibold">{playerName}</span>
          </p>
          <p className="text-gray-400 mb-4">
            {isImpostor 
              ? 'Tu objetivo es engañar a los demás sin ser descubierto' 
              : 'Encuentra al impostor antes de que sea demasiado tarde'
            }
          </p>
          
          {/* ✅ INDICADOR DE JUGADORES LISTOS MEJORADO */}
          <div className="mt-4 inline-block bg-gray-800 px-4 py-2 rounded-lg">
            <span className="text-green-400 font-bold">{readyPlayers.length}</span>
            <span className="text-gray-400"> de </span>
            <span className="text-blue-400 font-bold">{room.players?.length || 0}</span>
            <span className="text-gray-400"> jugadores listos</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* ✅ INFORMACIÓN DEL ROL MEJORADA */}
          <div className={`p-6 rounded-xl ${
            isImpostor 
              ? 'bg-red-900 border-2 border-red-500' 
              : 'bg-green-900 border-2 border-green-500'
          }`}>
            <h2 className="text-2xl font-bold mb-4 text-center">
              {isImpostor ? '🎭 Rol: IMPOSTOR' : '✅ Rol: JUGADOR'}
            </h2>
            
            {isImpostor ? (
              <div className="space-y-4">
                <div className="bg-red-800 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-2 text-red-200">🎯 Tu Misión:</h3>
                  <ul className="space-y-2 text-red-100 text-sm">
                    <li>• 🤥 <strong>Finge</strong> ser un jugador de fútbol real</li>
                    <li>• 💬 <strong>Responde</strong> preguntas sin levantar sospechas</li>
                    <li>• 🎭 <strong>Convence</strong> a los demás de que no eres tú</li>
                    <li>• 🏆 <strong>Sobrevive</strong> hasta el final de las {room.total_rounds} rondas</li>
                  </ul>
                </div>
                
                <div className="bg-yellow-900 border border-yellow-700 p-3 rounded-lg">
                  <h4 className="font-bold text-yellow-300 mb-1 text-sm">⚠️ Información Limitada:</h4>
                  <p className="text-yellow-200 text-xs">
                    No conoces al jugador asignado. ¡Ten cuidado con tus respuestas!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-800 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-2 text-green-200">🎯 Tu Misión:</h3>
                  <ul className="space-y-2 text-green-100 text-sm">
                    <li>• 🎯 <strong>Responde</strong> preguntas sobre tu jugador</li>
                    <li>• 🔍 <strong>Identifica</strong> al impostor por sus respuestas</li>
                    <li>• 🗳️ <strong>Vota</strong> en cada ronda para eliminar sospechosos</li>
                    <li>• 🏅 <strong>Encuentra</strong> al impostor antes de que gane</li>
                  </ul>
                </div>
                
                <div className="bg-blue-900 border border-blue-700 p-3 rounded-lg">
                  <h4 className="font-bold text-blue-300 mb-1 text-sm">💡 Consejo:</h4>
                  <p className="text-blue-200 text-xs">
                    Memoriza la información de tu jugador. El impostor no la conoce.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ✅ INFORMACIÓN DEL JUGADOR ASIGNADO - CORREGIDA */}
          <div className={`p-6 rounded-xl ${
            isImpostor 
              ? 'bg-gray-800 border-2 border-gray-600' 
              : 'bg-blue-900 border-2 border-blue-500'
          }`}>
            <h2 className="text-2xl font-bold mb-4 text-center">
              {isImpostor ? '❓ Información Limitada' : '👤 Tu Jugador'}
            </h2>
            
            {!isImpostor && currentAssignedPlayer ? (
              <div className="text-center">
                <div className="mb-4">
                  {currentAssignedPlayer.thumb ? (
                    <img 
                      src={currentAssignedPlayer.thumb} 
                      alt={currentAssignedPlayer.name}
                      className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-blue-500 shadow-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/96?text=⚽';
                      }}
                    />
                  ) : (
                    <div className="w-24 h-24 mx-auto rounded-full bg-blue-600 border-4 border-blue-500 flex items-center justify-center text-3xl">
                      ⚽
                    </div>
                  )}
                </div>
                
                <h3 className="text-2xl font-bold mb-3 text-blue-300">{currentAssignedPlayer.name}</h3>
                
                <div className="space-y-2 text-left bg-blue-800 p-4 rounded-lg">
                  <p><strong className="text-blue-400">Equipo:</strong> {currentAssignedPlayer.team || 'Desconocido'}</p>
                  {currentAssignedPlayer.position && (
                    <p><strong className="text-blue-400">Posición:</strong> {currentAssignedPlayer.position}</p>
                  )}
                  <p><strong className="text-blue-400">Nacionalidad:</strong> {currentAssignedPlayer.nationality || 'Desconocida'}</p>
                </div>
                
                <div className="mt-4 p-3 bg-blue-800 rounded-lg">
                  <p className="text-blue-200 text-sm">
                    💾 <strong>Memoriza esta información.</strong> El impostor no la conoce completamente.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-6xl mb-4">🕵️</div>
                <p className="text-gray-400 mb-4">
                  Como impostor, no conoces al jugador asignado. 
                </p>
                
                <div className="bg-red-900 border border-red-700 p-3 rounded-lg">
                  <h4 className="font-bold text-red-300 mb-2 text-sm">🎯 Tu Estrategia:</h4>
                  <ul className="text-red-200 text-left text-xs space-y-1">
                    <li>• Escucha atentamente las respuestas de otros</li>
                    <li>• Da respuestas vagas pero creíbles</li>
                    <li>• No contradigas información conocida</li>
                    <li>• Culpa a otros jugadores en las votaciones</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ✅ BOTÓN DE LISTO MEJORADO */}
        <div className="text-center">
          {!isCurrentPlayerReady ? (
            <button
              onClick={handleReady}
              className={`px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
                isImpostor 
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700' 
                  : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700'
              }`}
            >
              {isImpostor ? '🎭 Estoy Listo como Impostor' : '✅ Estoy Listo para Jugar'}
            </button>
          ) : (
            <div className="bg-green-900 border-2 border-green-500 px-8 py-4 rounded-lg inline-block">
              <p className="text-green-200 text-lg font-bold">
                ✅ ¡Estás listo! Esperando a otros jugadores...
              </p>
            </div>
          )}
          
          {/* ✅ INFORMACIÓN ADICIONAL */}
          <div className="mt-6 text-gray-400 text-sm">
            <p>
              <strong>{room.players?.length || 0}</strong> jugadores • <strong>{room.total_rounds}</strong> rondas • 
              Sala: <span className="text-green-400 font-mono">{room.code}</span>
            </p>
          </div>

          {/* ✅ LISTA DE JUGADORES LISTOS - MEJORADA */}
          {readyPlayers.length > 0 && (
            <div className="mt-6 bg-gray-800 rounded-lg p-4 max-w-md mx-auto">
              <h4 className="font-bold text-gray-300 mb-3 text-center">Jugadores Listos:</h4>
              <div className="flex flex-wrap gap-2 justify-center">
                {room.players
                  ?.filter(player => player.is_ready)
                  .map(player => (
                    <span 
                      key={player.id}
                      className={`px-3 py-1 rounded-full text-sm ${
                        player.id === currentPlayer.id
                          ? 'bg-green-600 text-white font-bold'
                          : 'bg-green-800 text-green-200'
                      }`}
                    >
                      {player.name}
                      {player.id === currentPlayer.id && ' (Tú)'}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default RoleAssignment;