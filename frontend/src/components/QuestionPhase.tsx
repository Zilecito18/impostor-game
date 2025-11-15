import React, { useState, useEffect } from 'react';
import type { Room, Player, Question } from '../types/game';

interface QuestionPhaseProps {
  room: Room;
  currentPlayer: Player;
  onPhaseComplete: () => void;
}

const QuestionPhase: React.FC<QuestionPhaseProps> = ({ 
  room, 
  currentPlayer, 
  onPhaseComplete 
}) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [playerAnswer, setPlayerAnswer] = useState('');
  const [questions] = useState<Question[]>([
    {
      id: '1',
      text: '¿En qué equipo juega actualmente tu jugador?',
      category: 'equipo'
    },
    {
      id: '2', 
      text: '¿Qué posición ocupa tu jugador en el campo?',
      category: 'posición'
    },
    {
      id: '3',
      text: '¿De qué nacionalidad es tu jugador?',
      category: 'nacionalidad'
    },
    {
      id: '4',
      text: '¿Cuál es el número característico de tu jugador?',
      category: 'dato personal'
    },
    {
      id: '5',
      text: '¿En qué liga juega tu jugador?',
      category: 'liga'
    }
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex]);

  const handleTimeUp = () => {
    if (currentQuestionIndex < questions.length - 1) {
      // Pasar a la siguiente pregunta
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeLeft(30);
      setPlayerAnswer('');
    } else {
      // Fin de la fase de preguntas
      onPhaseComplete();
    }
  };

  const handleSubmitAnswer = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeLeft(30);
      setPlayerAnswer('');
    } else {
      onPhaseComplete();
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">🎯 Fase de Preguntas</h1>
          <p className="text-gray-300">
            Responde cuidadosamente. El impostor está entre nosotros...
          </p>
        </div>

        {/* Información de la ronda */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold">Ronda {room.currentRound} de {room.totalRounds}</h2>
              <p className="text-gray-400">
                {currentPlayer.isImpostor ? '🎭 Eres el impostor - Ten cuidado' : '✅ Eres jugador - Responde con veracidad'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-yellow-400">{timeLeft}s</div>
              <div className="text-gray-400">Tiempo restante</div>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
            <div 
              className="bg-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Pregunta {currentQuestionIndex + 1} de {questions.length}</span>
            <span>{Math.round(progress)}% completado</span>
          </div>
        </div>

        {/* Pregunta actual */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <div className="text-center mb-6">
            <span className="bg-blue-600 text-sm px-3 py-1 rounded-full mb-4 inline-block">
              {currentQuestion.category}
            </span>
            <h3 className="text-2xl font-bold mb-4">{currentQuestion.text}</h3>
            <p className="text-gray-400">
              {currentPlayer.isImpostor 
                ? '💡 Recuerda: Solo tienes una pista. Responde con cuidado.'
                : '✅ Responde según la información de tu jugador asignado.'
              }
            </p>
          </div>

          {/* Área de respuesta */}
          <div className="max-w-2xl mx-auto">
            <textarea
              value={playerAnswer}
              onChange={(e) => setPlayerAnswer(e.target.value)}
              placeholder={
                currentPlayer.isImpostor 
                  ? "Como impostor, inventa una respuesta convincente..."
                  : "Escribe tu respuesta aquí..."
              }
              className="w-full h-32 p-4 rounded-lg bg-gray-700 border border-gray-600 focus:border-green-500 focus:outline-none resize-none"
              maxLength={200}
            />
            <div className="flex justify-between text-sm text-gray-400 mt-2">
              <span>{playerAnswer.length}/200 caracteres</span>
              <span>Las respuestas son anónimas</span>
            </div>
          </div>
        </div>

        {/* Jugadores activos */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">👥 Jugadores Activos</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {room.players.filter(p => p.isAlive).map(player => (
              <div 
                key={player.id}
                className={`p-3 rounded text-center ${
                  player.name === currentPlayer.name 
                    ? 'bg-green-600' 
                    : 'bg-gray-700'
                }`}
              >
                <div className="font-medium">{player.name}</div>
                <div className="text-xs text-gray-300">
                  {player.name === currentPlayer.name ? '(Tú)' : 'Respondiendo...'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="text-center mt-8">
          <button
            onClick={handleSubmitAnswer}
            disabled={!playerAnswer.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-8 py-4 rounded-lg font-bold text-lg transition-colors"
          >
            {currentQuestionIndex < questions.length - 1 ? 'Siguiente Pregunta →' : 'Finalizar Respuestas'}
          </button>
          <p className="text-gray-400 mt-2">
            {currentQuestionIndex < questions.length - 1 
              ? `Próxima pregunta: ${questions[currentQuestionIndex + 1].category}`
              : 'Preparándose para la votación...'
            }
          </p>
        </div>

      </div>
    </div>
  );
};

export default QuestionPhase;