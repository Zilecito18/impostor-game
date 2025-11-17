import { useState, useEffect, useRef, useCallback } from 'react';
import type { Room } from '../types/game'; // ✅ Solo importar Room

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface WebSocketHook {
  isConnected: boolean;
  gameState: Room | null;
  messages: any[];
  sendMessage: (type: string, data?: any) => boolean;
  reconnect: () => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export const useWebSocket = (roomCode: string | null): WebSocketHook => {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<Room | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const getWebSocketUrl = useCallback((roomCode: string) => {
    const baseUrl = 'wss://impostor-game-backend-pl8h.onrender.com';
    return `${baseUrl}/api/ws/${roomCode}`;
  }, []);

  const connect = useCallback(() => {
    if (!roomCode) {
      console.log('❌ No hay roomCode, no se puede conectar');
      return;
    }

    if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('⚠️ Ya hay una conexión WebSocket activa o conectándose');
      return;
    }

    console.log(`🔗 Conectando WebSocket a sala: ${roomCode}`);
    setConnectionStatus('connecting');

    try {
      const wsUrl = getWebSocketUrl(roomCode);
      console.log('🌐 WebSocket URL:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket conectado exitosamente');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        
        if (messageQueueRef.current.length > 0) {
          console.log(`📨 Enviando ${messageQueueRef.current.length} mensajes en cola`);
          const queueCopy = [...messageQueueRef.current];
          messageQueueRef.current = [];
          
          queueCopy.forEach(message => {
            try {
              ws.send(JSON.stringify(message));
              console.log('📤 Mensaje de cola enviado:', message.type);
            } catch (error) {
              console.error('❌ Error enviando mensaje de cola:', error);
              messageQueueRef.current.push(message);
            }
          });
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Mensaje WebSocket recibido:', data.type, data);
          
          switch (data.type) {
            case 'room_state':
            case 'player_joined':
            case 'player_left':
            case 'game_started':
            case 'game_updated':
              if (data.room) {
                console.log('🔄 Actualizando estado de la sala');
                setGameState((prevState: Room | null) => ({
                  ...prevState,
                  ...data.room,
                  current_phase: data.room.current_phase || prevState?.current_phase,
                  current_round: data.room.current_round || prevState?.current_round
                }));
              }
              break;
              
            case 'phase_changed':
              console.log('🔄 Cambio de fase recibido:', data.phase);
              setGameState((prevState: Room | null) => ({ // ✅ CORREGIDO: Usar Room
                ...prevState,
                current_phase: data.phase,
                ...data.room
              }));
              break;
              
            case 'player_ready':
            case 'all_players_ready':
            case 'answer_submitted':
            case 'vote_submitted':
            case 'voting_complete':
              if (data.room) {
                setGameState(data.room as Room);  // ✅ CORREGIDO: Type assertion a Room
              }
              break;
              
            case 'chat_message':
              setMessages(prev => [...prev, {
                playerId: data.player_id,
                playerName: data.player_name,
                message: data.message,
                timestamp: data.timestamp || new Date().toISOString()
              }]);
              break;
              
            case 'error':
              console.error('❌ Error del servidor:', data.message);
              break;
              
            default:
              console.log('⚠️ Mensaje no manejado:', data.type, data);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error, event.data);
        }
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket desconectado. Código: ${event.code}, Razón: ${event.reason}`);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        if (event.code !== 1000 && roomCode && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(3000 * (reconnectAttemptsRef.current + 1), 15000);
          reconnectAttemptsRef.current++;
          
          console.log(`🔄 Intentando reconexión ${reconnectAttemptsRef.current}/${maxReconnectAttempts} en ${delay}ms...`);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('❌ Máximo de intentos de reconexión alcanzado');
          setConnectionStatus('error');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('❌ Error creando WebSocket:', error);
      setConnectionStatus('error');
      
      if (roomCode && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = 5000;
        
        console.log(`🔄 Reconectando después de error en ${delay}ms...`);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, delay);
      }
    }
  }, [roomCode, getWebSocketUrl]);

  const disconnect = useCallback(() => {
    console.log('🛑 Desconectando WebSocket...');
    
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    reconnectAttemptsRef.current = 0;
    
    if (socketRef.current) {
      socketRef.current.close(1000, 'Manual disconnect');
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  const sendMessage = useCallback((type: string, data: any = {}): boolean => {
    const message = { 
      type, 
      ...data, 
      timestamp: Date.now(),
      room_code: roomCode
    };
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(message));
        console.log('📤 Mensaje enviado:', type, data);
        return true;
      } catch (error) {
        console.error('❌ Error enviando mensaje:', error);
        messageQueueRef.current.push(message);
        return false;
      }
    } else {
      console.log('💾 Mensaje guardado en cola (WebSocket no conectado):', type);
      messageQueueRef.current.push(message);
      
      if (!isConnected && roomCode) {
        console.log('🔄 WebSocket no conectado, intentando reconectar...');
        connect();
      }
      return false;
    }
  }, [isConnected, roomCode, connect]);

  const reconnect = useCallback(() => {
    console.log('🔄 Reconexión manual solicitada');
    disconnect();
    reconnectTimeoutRef.current = window.setTimeout(() => {
      connect();
    }, 500);
  }, [disconnect, connect]);

  useEffect(() => {
    if (roomCode) {
      console.log('🎯 Iniciando conexión WebSocket para sala:', roomCode);
      connect();
    } else {
      console.log('❌ No hay roomCode, limpiando...');
      disconnect();
      setGameState(null);
      setMessages([]);
    }
    
    return () => {
      console.log('🧹 Limpiando WebSocket (unmount)');
      disconnect();
    };
  }, [connect, disconnect, roomCode]);

  useEffect(() => {
    if (gameState) {
      console.log('🔄 gameState actualizado:', {
        code: gameState.code,
        phase: gameState.current_phase,
        players: gameState.players?.length,
        gameStarted: gameState.game_started
      });
    }
  }, [gameState]);

  return {
    isConnected,
    gameState,
    messages,
    sendMessage,
    reconnect,
    connectionStatus
  };
};

// ✅ HOOK DE ACCIONES MEJORADO
export const useWebSocketActions = (sendMessage: (type: string, data?: any) => boolean) => {
  const sendChatMessage = useCallback((message: string, playerId: string, playerName: string) => {
    return sendMessage('chat_message', { 
      message, 
      player_id: playerId,
      player_name: playerName 
    });
  }, [sendMessage]);

  const setPlayerReady = useCallback((playerId: string, isReady: boolean = true, phase?: string) => {
    return sendMessage('player_ready', { 
      player_id: playerId, 
      is_ready: isReady,
      phase: phase
    });
  }, [sendMessage]);

  const startGame = useCallback((playerId: string) => {
    return sendMessage('start_game', { 
      player_id: playerId 
    });
  }, [sendMessage]);

  const joinRoom = useCallback((playerId: string, playerName: string) => {
    return sendMessage('player_join', { 
      player_id: playerId,
      player_name: playerName 
    });
  }, [sendMessage]);

  const leaveRoom = useCallback((playerId: string) => {
    return sendMessage('player_leave', { 
      player_id: playerId 
    });
  }, [sendMessage]);

  const submitAnswer = useCallback((playerId: string, answer: string, questionId: string, roundId: string) => {
    return sendMessage('player_answer', {
      player_id: playerId,
      answer: answer,
      question_id: questionId,
      round_id: roundId
    });
  }, [sendMessage]);

  const submitVote = useCallback((playerId: string, votedPlayerId: string, roundId: string) => {
    return sendMessage('player_vote', {
      player_id: playerId,
      voted_player_id: votedPlayerId,
      round_id: roundId
    });
  }, [sendMessage]);

  return {
    sendChatMessage,
    setPlayerReady,
    startGame,
    joinRoom,
    leaveRoom,
    submitAnswer,
    submitVote
  };
};