import React, { useState, useEffect } from 'react';
import type { Room, Player } from './types/game';
import CreateRoom from './components/CreateRoom';
import RoomComponent from './components/Room';
import JoinRoom from './components/JoinRoom';
import RoleAssignment from './components/RoleAssigment';
import QuestionPhase from './components/QuestionPhase';
import VotingPhase from './components/VotingPhase';
import ResultsPhase from './components/ResultsPhase';
import GameOver from './components/GameOver';
import DebatePhase from './components/DebatePhase';
import { useWebSocket } from './hooks/useWebSocket';

// ✅ Extender el tipo Room para incluir propiedades del juego
interface GameRoom extends Room {
  current_votes?: { [playerId: string]: string };
  voting_results?: any[];
  game_winner?: 'impostor' | 'players';
  // No necesitas redefinir current_round y current_phase porque ya están en Room
}

const App: React.FC = () => {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [currentView, setCurrentView] = useState<'main' | 'create' | 'join' | 'howToPlay'>('main');
  
  const { 
    gameState, 
    isConnected, 
    connectionStatus, 
    sendMessage, 
  } = useWebSocket(currentRoom?.code || null);

  // ✅ Hacer type assertion para gameState
  const gameRoom = gameState as GameRoom | null;

  useEffect(() => {
    if (gameState && gameState.code) {
      console.log('🔄 App: Sincronizando room desde WebSocket:', gameState.code);
      setCurrentRoom(gameState);
    }
  }, [gameState]);

  useEffect(() => {
    if (currentRoom && playerName && playerId) {
      console.log('🔗 App: Uniendo a sala via WebSocket');
      sendMessage('player_join', {
        playerId: playerId,
        playerName: playerName
      });
    }
  }, [currentRoom, playerName, playerId, sendMessage]);

  const currentPhase = gameRoom?.current_phase || 'waiting';
  const currentRound = gameRoom?.current_round || 1;

  const findCurrentPlayer = (): Player => {
    if (!gameRoom?.players || !playerId) {
      return {
        id: playerId,
        name: playerName,
        is_host: false,
        is_alive: true,
        is_impostor: false,
        is_ready: false,
        assigned_player: undefined
      };
    }

    const player = gameRoom.players.find((p: Player) => p.id === playerId);
    
    return player || {
      id: playerId,
      name: playerName,
      is_host: false,
      is_alive: true,
      is_impostor: false,
      is_ready: false,
      assigned_player: undefined
    };
  };

  const currentPlayer = findCurrentPlayer();
  const isHost = !!currentPlayer.is_host;

  // ========== FLUJO DEL JUEGO ==========

  // 1. Pantalla final del juego
  if (currentPhase === 'finished' && currentRoom) {
    return (
      <GameOver
        room={currentRoom}
        currentPlayer={currentPlayer}
        winner={gameRoom?.game_winner || 'players'}
        onReturnToMenu={() => {
          setCurrentRoom(null);
          setPlayerId('');
          setCurrentView('main');
        }}
        onPlayAgain={() => {
          if (isHost) {
            sendMessage('start_game', { playerId: playerId });
          }
        }}
      />
    );
  }

  // 2. Resultados de la ronda
  if (currentPhase === 'results' && currentRoom) {
    // Función para encontrar el jugador más votado
    const getVotedPlayerId = (): string | null => {
      if (!gameRoom?.voting_results || gameRoom.voting_results.length === 0) {
        return null;
      }
      
      try {
        // Asumiendo que voting_results es un array de objetos con playerId y votes
        const validResults = gameRoom.voting_results.filter(result => 
          result && result.playerId && typeof result.votes === 'number'
        );
        
        if (validResults.length === 0) return null;
        
        const mostVoted = validResults.reduce((prev, current) => 
          current.votes > prev.votes ? current : prev
        );
        
        return mostVoted.playerId;
      } catch (error) {
        console.error('Error procesando resultados de votación:', error);
        return null;
      }
    };

    const votedPlayerId = getVotedPlayerId();

    return (
      <ResultsPhase
        room={currentRoom}
        currentPlayer={currentPlayer}
        votedPlayerId={votedPlayerId}
        onNextRound={() => {
          console.log('⏭️ Avanzando a siguiente ronda...');
        }}
        onGameOver={(winner: 'impostor' | 'players') => {
          console.log(`🎮 Fin del juego desde ResultsPhase: ${winner} ganan`);
          // El backend manejará la transición a game over
        }}
      />
    );
  }

  // 3. Fase de votación
  if (currentPhase === 'voting' && currentRoom) {
    return (
      <VotingPhase
        room={currentRoom}
        currentPlayer={currentPlayer}
        onVotingComplete={(votedPlayerId: string | null) => {
          sendMessage('player_vote', {
            playerId: playerId,
            votedPlayerId: votedPlayerId,
            roundId: `round_${currentRound}`
          });
        }}
      />
    );
  }

  // 4. Fase de Debate
  if (currentPhase === 'debate' && currentRoom) {
    return (
      <DebatePhase
        room={currentRoom}
        currentPlayer={currentPlayer}
        onDebateComplete={() => {
          sendMessage('player_ready', {
            playerId: playerId,
            is_ready: true,
            phase: 'debate'
          });
        }}
      />
    );
  }

  // 5. Fase de preguntas
  if (currentPhase === 'question' && currentRoom) {
    return (
      <QuestionPhase
        room={currentRoom}
        currentPlayer={currentPlayer}
        assignedPlayer={currentPlayer.assigned_player}
        onSubmitAnswer={(answer: string, questionId: string) => {
          sendMessage('player_answer', {
            playerId: playerId,
            answer: answer,
            questionId: questionId,
            roundId: `round_${currentRound}`
          });
        }}
        onPhaseComplete={() => {
          sendMessage('player_ready', {
            playerId: playerId,
            is_ready: true,
            phase: 'question'
          });
        }}
      />
    );
  }

  // 6. Asignación de roles
  if (currentPhase === 'role_assignment' && currentRoom) {
    return (
      <RoleAssignment 
        room={currentRoom}
        currentPlayer={currentPlayer}
        assignedPlayer={currentPlayer.assigned_player}
        onReady={() => {
          sendMessage('player_ready', {
            playerId: playerId,
            is_ready: true,
            phase: 'role_assignment'
          });
        }}
      />
    );
  }

  // 7. Sala de espera normal
  if (currentRoom && currentPhase === 'waiting') {
    return (
      <RoomComponent 
        room={currentRoom}
        currentPlayer={currentPlayer}
        connectionStatus={connectionStatus}
        onGameStart={() => {
          if (isHost) {
            sendMessage('start_game', { playerId: playerId });
          }
        }}
        onLeaveRoom={() => {
          sendMessage('player_leave', { playerId: playerId });
          setCurrentRoom(null);
          setPlayerId('');
          setCurrentView('main');
        }}
      />
    );
  }

  // ========== MENÚ PRINCIPAL ==========
  if (currentView === 'main') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-5xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent"
            style={{ fontFamily: "'Press Start 2P', cursive" }}
          >
            AM⚽NG US
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            ¿Tienes lo que se necesita para descubrir al impostor?
          </p>
          
          {/* Estado de conexión */}
          {currentRoom && (
            <div className="mt-4 p-3 bg-gray-800 rounded-lg inline-block">
              <div className={`inline-block w-3 h-3 rounded-full mr-2 ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm">
                {isConnected ? 'Conectado' : 'Desconectado'} - Sala: {currentRoom.code}
              </span>
            </div>
          )}
        </div>

        {/* Botones principales */}
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Crear Sala */}
            <button
              onClick={() => setCurrentView('create')}
              className="relative inline-flex items-center justify-center p-6 overflow-hidden font-medium text-green-600 transition duration-300 ease-out border-4 border-green-500 rounded-xl shadow-lg group"
            >
              <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-gradient-to-r from-green-600 to-green-700 group-hover:translate-x-0 ease">
                <div className="text-center px-4">
                  <p className="text-green-100 text-base">
                    Crea una nueva sala y comparte el código con tus amigos
                  </p>
                </div>
              </span>
              <span className="absolute flex items-center justify-center w-full h-full text-green-600 transition-all duration-300 transform group-hover:translate-x-full ease">
                <div className="text-center">
                  <h3 className="text-2xl font-bold">CREAR SALA</h3>
                </div>
              </span>
              <span className="relative invisible">
                <div className="text-center px-4">
                  <h3 className="text-2xl font-bold">CREAR SALA</h3>
                  <p className="text-base mt-2">
                    Crea una nueva sala y comparte el código con tus amigos
                  </p>
                </div>
              </span>
            </button>

            {/* Unirse a Sala */}
            <button
              onClick={() => setCurrentView('join')}
              className="relative inline-flex items-center justify-center p-6 overflow-hidden font-medium text-blue-600 transition duration-300 ease-out border-4 border-blue-500 rounded-xl shadow-lg group"
            >
              <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-gradient-to-r from-blue-600 to-blue-700 group-hover:translate-x-0 ease">
                <div className="text-center px-4">
                  <p className="text-blue-100 text-base">
                    Únete a una sala existente con el código de invitación
                  </p>
                </div>
              </span>
              <span className="absolute flex items-center justify-center w-full h-full text-blue-600 transition-all duration-300 transform group-hover:translate-x-full ease">
                <div className="text-center">
                  <h3 className="text-2xl font-bold">UNIRSE A SALA</h3>
                </div>
              </span>
              <span className="relative invisible">
                <div className="text-center px-4">
                  <h3 className="text-2xl font-bold">UNIRSE A SALA</h3>
                  <p className="text-base mt-2">
                    Únete a una sala existente con el código de invitación
                  </p>
                </div>
              </span>
            </button>
          </div>

          {/* Cómo Jugar */}
          <button
            onClick={() => setCurrentView('howToPlay')}
            className="relative inline-flex items-center justify-center w-full p-6 overflow-hidden font-medium text-purple-600 transition duration-300 ease-out border-4 border-purple-500 rounded-xl shadow-lg group mb-8"
          >
            <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-gradient-to-r from-purple-600 to-purple-700 group-hover:translate-x-0 ease">
              <div className="text-center px-4">
                <p className="text-purple-100 text-base">
                  Aprende las reglas del juego y descubre cómo ganar
                </p>
              </div>
            </span>
            <span className="absolute flex items-center justify-center w-full h-full text-purple-600 transition-all duration-300 transform group-hover:translate-x-full ease">
              <div className="text-center">
                <h3 className="text-2xl font-bold">CÓMO JUGAR</h3>
              </div>
            </span>
            <span className="relative invisible">
              <div className="text-center px-4">
                <h3 className="text-2xl font-bold">CÓMO JUGAR</h3>
                <p className="text-base mt-2">
                  Aprende las reglas del juego y descubre cómo ganar
                </p>
              </div>
            </span>
          </button>

          {/* Input del nombre */}
          <div>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-4 rounded-lg bg-gray-700 border border-gray-600 focus:border-green-500 focus:outline-none transition-colors text-center text-lg"
              placeholder="Digita tu nickname"
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Desarrollado por Zilecito Navideño</p>
        </footer>
      </div>
    );
  }

  // Vista de Crear Sala
  if (currentView === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
        <button
          onClick={() => setCurrentView('main')}
          className="mb-6 relative inline-flex items-center py-2 px-4 overflow-hidden font-medium text-gray-300 transition-all duration-150 ease-in-out rounded-lg hover:pl-8 hover:pr-4 bg-gray-800 border-2 border-gray-600 group"
        >
          {/* ... botón volver ... */}
        </button>
        <CreateRoom 
          onRoomCreated={(room: Room) => {
            setCurrentRoom(room);
            // Si el playerId viene en el room o lo obtenemos de otra forma
            // Por ejemplo, si el jugador host es el primero en la lista
            if (room.players && room.players.length > 0) {
              const hostPlayer = room.players.find(player => player.is_host);
              if (hostPlayer) {
                setPlayerId(hostPlayer.id);
              }
            }
            setCurrentView('main');
          }}
          playerName={playerName}
          setPlayerName={setPlayerName}
        />
      </div>
    );
  }

  // Vista de Unirse a Sala
  if (currentView === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
        <button
          onClick={() => setCurrentView('main')}
          className="mb-6 relative inline-flex items-center py-2 px-4 overflow-hidden font-medium text-gray-300 transition-all duration-150 ease-in-out rounded-lg hover:pl-8 hover:pr-4 bg-gray-800 border-2 border-gray-600 group"
        >
          <span className="absolute left-0 pl-2 duration-200 ease-out -translate-x-12 group-hover:translate-x-0">
            <svg className="w-5 h-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9.06134 18.1227L3 12.0613M3 12.0613L9.06134 6M3 12.0613H20.9999" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="absolute left-2 duration-200 ease-out translate-x-0 group-hover:translate-x-12 opacity-100 group-hover:opacity-0">
            <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9.06134 18.1227L3 12.0613M3 12.0613L9.06134 6M3 12.0613H20.9999" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="ml-6 transition-colors duration-200 ease-in-out group-hover:text-white">
            Volver
          </span>
        </button>
        <JoinRoom 
          onRoomJoined={(room: Room, newPlayerId: string) => {
            setCurrentRoom(room);
            setPlayerId(newPlayerId);
            setCurrentView('main');
          }}
          playerName={playerName}
        />
      </div>
    );
  }

  // Vista de Cómo Jugar
  if (currentView === 'howToPlay') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
        <button
          onClick={() => setCurrentView('main')}
          className="mb-6 relative inline-flex items-center py-2 px-4 overflow-hidden font-medium text-gray-300 transition-all duration-150 ease-in-out rounded-lg hover:pl-8 hover:pr-4 bg-gray-800 border-2 border-gray-600 group"
        >
          <span className="absolute left-0 pl-2 duration-200 ease-out -translate-x-12 group-hover:translate-x-0">
            <svg className="w-5 h-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9.06134 18.1227L3 12.0613M3 12.0613L9.06134 6M3 12.0613H20.9999" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="absolute left-2 duration-200 ease-out translate-x-0 group-hover:translate-x-12 opacity-100 group-hover:opacity-0">
            <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9.06134 18.1227L3 12.0613M3 12.0613L9.06134 6M3 12.0613H20.9999" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="ml-6 transition-colors duration-200 ease-in-out group-hover:text-white">
            Volver
          </span>
        </button>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8">Cómo Jugar</h1>
          {/* Agrega aquí el contenido de cómo jugar */}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p>Cargando...</p>
      </div>
    </div>
  );
};

export default App;