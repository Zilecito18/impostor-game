import React, { useState } from 'react';
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

const App: React.FC = () => {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [currentView, setCurrentView] = useState<'main' | 'create' | 'join' | 'howToPlay'>('main');
  const [gamePhase, setGamePhase] = useState<'waiting' | 'role_assignment' | 'question' | 'debate' | 'voting' | 'results' | 'finished'>('waiting');
  const [currentRound, setCurrentRound] = useState(1);
  const [votedPlayerId, setVotedPlayerId] = useState<string | null>(null);
  const [gameWinner, setGameWinner] = useState<'impostor' | 'players' | null>(null);

  // Datos de ejemplo temporal para testing
  const mockCurrentPlayer: Player = {
    id: 'player-1',
    name: playerName || 'Jugador Test',
    isHost: true,
    isImpostor: false,
    isAlive: true
  };

  // ========== FLUJO DEL JUEGO ==========

  // 1. Pantalla final del juego
  if (gamePhase === 'finished' && gameWinner && currentRoom) {
    return (
      <GameOver
        room={currentRoom}
        currentPlayer={mockCurrentPlayer}
        winner={gameWinner}
        onReturnToMenu={() => {
          setCurrentRoom(null);
          setGamePhase('waiting');
          setCurrentRound(1);
          setGameWinner(null);
        }}
        onPlayAgain={() => {
          setGamePhase('role_assignment');
          setCurrentRound(1);
          setGameWinner(null);
        }}
      />
    );
  }

  // 2. Resultados de la ronda
  if (gamePhase === 'results' && currentRoom) {
    return (
      <ResultsPhase
        room={{ ...currentRoom, currentRound, totalRounds: 5 }}
        currentPlayer={mockCurrentPlayer}
        votedPlayerId={votedPlayerId}
        onNextRound={() => {
          const nextRound = currentRound + 1;
          setCurrentRound(nextRound);
          
          if (nextRound > 5) {
            // Fin del juego - el impostor gana si llega al final
            setGameWinner('impostor');
            setGamePhase('finished');
          } else {
            // Siguiente ronda - depende del modo de juego
            if (currentRoom.debateMode) {
              // MODO CON LLAMADA: Ir directamente a debate
              setGamePhase('debate');
            } else {
              // MODO SIN LLAMADA: Ir a preguntas
              setGamePhase('question');
            }
          }
          setVotedPlayerId(null);
        }}
        onGameOver={(winner) => {
          setGameWinner(winner);
          setGamePhase('finished');
        }}
      />
    );
  }

  // 3. Fase de votación
  if (gamePhase === 'voting' && currentRoom) {
    return (
      <VotingPhase
        room={{ ...currentRoom, currentRound, totalRounds: 5 }}
        currentPlayer={mockCurrentPlayer}
        onVotingComplete={(playerId) => {
          setVotedPlayerId(playerId);
          setGamePhase('results');
        }}
      />
    );
  }

  // 4. Fase de Debate (SOLO para modo con llamada)
  if (gamePhase === 'debate' && currentRoom && currentRoom.debateMode) {
    return (
      <DebatePhase
        room={{ ...currentRoom, currentRound, totalRounds: 5 }}
        currentPlayer={mockCurrentPlayer}
        onDebateComplete={() => setGamePhase('voting')}
      />
    );
  }

  // 5. Fase de preguntas (SOLO para modo sin llamada)
  if (gamePhase === 'question' && currentRoom && !currentRoom.debateMode) {
    return (
      <QuestionPhase
        room={{ ...currentRoom, currentRound, totalRounds: 5 }}
        currentPlayer={mockCurrentPlayer}
        onPhaseComplete={() => setGamePhase('voting')}
      />
    );
  }

  // 6. Asignación de roles
  if (gamePhase === 'role_assignment' && currentRoom) {
    return (
      <RoleAssignment 
        room={currentRoom}
        currentPlayerName={playerName}
        onGameStart={() => {
          // Depende del modo de juego
          if (currentRoom.debateMode) {
            // MODO CON LLAMADA: Empezar con debate
            setGamePhase('debate');
          } else {
            // MODO SIN LLAMADA: Empezar con preguntas
            setGamePhase('question');
          }
        }}
      />
    );
  }

  // 7. Sala de espera normal
  if (currentRoom && gamePhase === 'waiting') {
    return (
      <RoomComponent 
        room={currentRoom} 
        playerName={playerName}
        onGameStart={() => setGamePhase('role_assignment')}
      />
    );
  }

  // ========== MENÚ PRINCIPAL ==========
  // ... (el resto del código del menú principal se mantiene igual)
  // Vista principal con tres botones
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

          {/* Input del nombre (siempre visible) */}
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
        <CreateRoom 
          onRoomCreated={(room) => {
            setCurrentRoom(room);
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
          onRoomJoined={(room) => {
            setCurrentRoom(room);
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
        
        <div className="max-w-4xl mx-auto bg-gray-800 rounded-xl p-8">
          <h2 className="text-3xl font-bold mb-8 text-center">Cómo Jugar</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Reglas Básicas */}
            <div className="bg-gray-700 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4 text-green-400">Reglas Básicas</h3>
              <ul className="space-y-3 text-gray-300">
                <li>• 4-15 jugadores por partida</li>
                <li>• 5-10 rondas para encontrar al impostor</li>
                <li>• Los jugadores se les asigna un futbolista</li>
                <li>• El impostor NO sabe su futbolista</li>
                <li>• Preguntas y votaciones cada ronda</li>
              </ul>
            </div>

            {/* Objetivo */}
            <div className="bg-gray-700 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4 text-blue-400">Objetivo</h3>
              <ul className="space-y-3 text-gray-300">
                <li>• <strong>Jugadores:</strong> Encontrar al impostor</li>
                <li>• <strong>Impostor:</strong> Engañar a los demás</li>
                <li>• Votaciones eliminan jugadores</li>
                <li>• Si eliminan al impostor, ganan los jugadores</li>
                <li>• Si el impostor sobrevive, gana él</li>
              </ul>
            </div>

            {/* Cómo Descubrir al Impostor */}
            <div className="bg-gray-700 p-6 rounded-lg md:col-span-2">
              <h3 className="text-xl font-bold mb-4 text-yellow-400">Pistas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                <div>
                  <h4 className="font-bold mb-2">Señales del Impostor:</h4>
                  <ul className="space-y-1">
                    <li>• Respuestas vagas o genéricas</li>
                    <li>• Dudas sobre datos futbolísticos</li>
                    <li>• Cambia su historia frecuentemente</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Estrategias:</h4>
                  <ul className="space-y-1">
                    <li>• Haz preguntas específicas</li>
                    <li>• Observa las reacciones</li>
                    <li>• Coordina votaciones con tu equipo</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => setCurrentView('main')}
              className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-lg font-bold transition-colors"
            >
              ¡Entendido! Jugar Ahora
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default App;