import React, { useState, useEffect } from 'react';
import type { Room, FootballPlayer } from '../types/game';

interface RoleAssignmentProps {
  room: Room;
  currentPlayerName: string;
  onGameStart: () => void;
}

// Datos de ejemplo de jugadores de fútbol
const footballPlayers: FootballPlayer[] = [
  { id: '1', name: 'Lionel Messi', team: 'Inter Miami', position: 'Delantero', nationality: 'Argentina' },
  { id: '2', name: 'Cristiano Ronaldo', team: 'Al Nassr', position: 'Delantero', nationality: 'Portugal' },
  { id: '3', name: 'Kylian Mbappé', team: 'PSG', position: 'Delantero', nationality: 'Francia' },
  { id: '4', name: 'Kevin De Bruyne', team: 'Manchester City', position: 'Mediocampista', nationality: 'Bélgica' },
  { id: '5', name: 'Virgil van Dijk', team: 'Liverpool', position: 'Defensa', nationality: 'Países Bajos' },
  { id: '6', name: 'Robert Lewandowski', team: 'Barcelona', position: 'Delantero', nationality: 'Polonia' },
  { id: '7', name: 'Erling Haaland', team: 'Manchester City', position: 'Delantero', nationality: 'Noruega' },
  { id: '8', name: 'Luka Modrić', team: 'Real Madrid', position: 'Mediocampista', nationality: 'Croacia' },
];

const RoleAssignment: React.FC<RoleAssignmentProps> = ({ 
  room, 
  currentPlayerName,
  onGameStart 
}) => {
  const [countdown, setCountdown] = useState(5);
  const [assignedPlayer, setAssignedPlayer] = useState<FootballPlayer | null>(null);
  const [isImpostor, setIsImpostor] = useState(false);
  const [impostorClue, setImpostorClue] = useState<string>('');

  useEffect(() => {
    // Simular asignación de roles (luego vendrá del backend)
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          assignRoles();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const assignRoles = () => {
    // Lógica temporal de asignación
    const randomPlayer = footballPlayers[Math.floor(Math.random() * footballPlayers.length)];
    const randomIsImpostor = Math.random() < 0.3; // 30% de chance de ser impostor

    setAssignedPlayer(randomPlayer);
    setIsImpostor(randomIsImpostor);

    // Si es impostor, generar una pista aleatoria
    if (randomIsImpostor) {
      const clues = [
        `Juega en: ${randomPlayer.team}`,
        `Posición: ${randomPlayer.position}`,
        `Nacionalidad: ${randomPlayer.nationality}`,
        `Es ${randomPlayer.position.toLowerCase()}`,
        `Equipo: ${randomPlayer.team}`
      ];
      const randomClue = clues[Math.floor(Math.random() * clues.length)];
      setImpostorClue(randomClue);
    }
  };

  if (countdown > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl font-bold mb-4">{countdown}</div>
          <p className="text-xl text-purple-200">Asignando roles...</p>
          <p className="text-purple-300 mt-2">Prepárate para el juego</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            {isImpostor ? 'Eres el IMPOSTOR' : 'Eres INOCENTE'}
          </h1>
          <p className="text-gray-400 mb-2">
            Jugador: <span className="text-green-400 font-semibold">{currentPlayerName}</span>
          </p>
          <p className="text-gray-400">
            {isImpostor 
              ? 'Tu objetivo es engañar a los demás sin ser descubierto' 
              : 'Encuentra al impostor antes de que sea demasiado tarde'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Información del Rol */}
          <div className={`p-8 rounded-xl ${
            isImpostor 
              ? 'bg-red-900 border-2 border-red-500' 
              : 'bg-green-900 border-2 border-green-500'
          }`}>
            <h2 className="text-2xl font-bold mb-4 text-center">
              {isImpostor ? 'Rol: IMPOSTOR' : 'Rol: JUGADOR'}
            </h2>
            
            {isImpostor ? (
              <div className="space-y-4">
                <div className="bg-red-800 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">Tu Misión:</h3>
                  <ul className="space-y-2 text-red-100">
                    <li>• Finge ser un jugador de fútbol real</li>
                    <li>• Responde preguntas sin levantar sospechas</li>
                    <li>• Convence a los demás de que no eres tú</li>
                    <li>• Sobrevive hasta el final de las {room.rounds} rondas</li>
                  </ul>
                </div>
                
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-800 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">Tu Misión:</h3>
                  <ul className="space-y-2 text-green-100">
                    <li>• Di una palabra que identifique al jugador</li>
                    <li>• Identifica al impostor por sus respuestas sospechosas</li>
                    <li>• Vota en cada ronda para eliminar sospechosos</li>
                    <li>• Encuentra al impostor antes de que gane</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Información del Jugador */}
          <div className={`p-8 rounded-xl ${
            isImpostor 
              ? 'bg-gray-800 border-2 border-gray-600' 
              : 'bg-blue-900 border-2 border-blue-500'
          }`}>
            <h2 className="text-2xl font-bold mb-6 text-center">
              {isImpostor ? 'Información Limitada' : 'Jugador Asignado'}
            </h2>
            
            {!isImpostor && assignedPlayer ? (
              <div className="text-center">
                <h3 className="text-3xl font-bold mb-2">{assignedPlayer.name}</h3>
                <div className="space-y-2 text-lg">
                  <p><strong>Equipo:</strong> {assignedPlayer.team}</p>
                  <p><strong>Posición:</strong> {assignedPlayer.position}</p>
                  <p><strong>Nacionalidad:</strong> {assignedPlayer.nationality}</p>
                </div>
                <div className="mt-6 p-4 bg-blue-800 rounded-lg">
                  <p className="text-blue-200">
                    Memoriza esta información. El impostor no la conoce completamente.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-400 mb-4">
                  Como impostor, solo conoces una pista del jugador asignado.
                  ¡Ten cuidado con tus respuestas!
                </p>
                <div className="bg-yellow-900 border border-yellow-700 p-4 rounded-lg">
                  <h4 className="font-bold text-yellow-300 mb-2">Tu Pista:</h4>
                  <p className="text-yellow-200 text-lg">{impostorClue}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botón de Continuar */}
        <div className="text-center mt-8">
          <button
            onClick={onGameStart}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-all transform hover:scale-105"
          >
            {isImpostor ? 'Comenzar como Impostor' : 'Comenzar Juego'}
          </button>
          <p className="text-gray-400 mt-2">
            {room.rounds} rondas - {room.players.length} jugadores
          </p>
        </div>

      </div>
    </div>
  );
};

export default RoleAssignment;