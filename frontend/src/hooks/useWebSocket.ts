import { useState, useEffect, useRef, useCallback } from 'react';
import { API_CONFIG } from '../config/api';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface WebSocketHook {
  isConnected: boolean;
  gameState: any;
  messages: any[];
  sendMessage: (type: string, data?: any) => boolean;
  reconnect: () => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export const useWebSocket = (roomCode: string | null): WebSocketHook => {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null); // Cambiado a number | null
  const messageQueueRef = useRef<WebSocketMessage[]>([]);

  const connect = useCallback(() => {
    if (!roomCode) {
      console.log('No hay roomCode, no se puede conectar');
      return;
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ Ya hay una conexión WebSocket activa');
      return;
    }

    console.log(`🔗 Conectando WebSocket a sala: ${roomCode}`);
    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(`${API_CONFIG.WS_URL}/ws/${roomCode}`);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket conectado');
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // Enviar mensajes en cola
        if (messageQueueRef.current.length > 0) {
          console.log(`📨 Enviando ${messageQueueRef.current.length} mensajes en cola`);
          messageQueueRef.current.forEach(message => {
            ws.send(JSON.stringify(message));
          });
          messageQueueRef.current = [];
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Mensaje WebSocket recibido:', data);
          
          // Manejar diferentes tipos de mensajes
          switch (data.type) {
            case 'player_joined':
            case 'player_left':
            case 'game_started':
            case 'game_updated':
            case 'round_started':
            case 'round_ended':
              if (data.room || data.gameState) {
                setGameState(data.room || data.gameState);
              }
              break;
              
            case 'chat_message':
              setMessages(prev => [...prev, data]);
              break;
              
            case 'player_ready':
            case 'player_answer':
            case 'vote_submitted':
              if (data.room) {
                setGameState(data.room);
              }
              break;
              
            case 'error':
              console.error('❌ Error del servidor:', data.message);
              break;
              
            case 'message_received':
              break;
              
            default:
              console.log('⚠️ Mensaje no manejado:', data.type);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket desconectado. Código: ${event.code}, Razón: ${event.reason}`);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Reconexión automática solo si no fue un cierre intencional
        if (event.code !== 1000) {
          console.log('🔄 Intentando reconexión en 3 segundos...');
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, 3000);
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
    }
  }, [roomCode]);

  const disconnect = useCallback(() => {
    // Limpiar timeout de reconexión
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null; // Solo establecemos a null
    }
    
    if (socketRef.current) {
      console.log('🛑 Cerrando WebSocket manualmente');
      socketRef.current.close(1000, 'Manual disconnect');
      socketRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((type: string, data: any = {}): boolean => {
    const message = { type, ...data, timestamp: Date.now() };
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      console.log('📤 Mensaje enviado:', message);
      return true;
    } else {
      console.log('💾 Mensaje guardado en cola (WebSocket no conectado):', message);
      messageQueueRef.current.push(message);
      
      if (!isConnected && roomCode) {
        console.log('🔄 Intentando reconectar...');
        connect();
      }
      return false;
    }
  }, [isConnected, roomCode, connect]);

  const reconnect = useCallback(() => {
    console.log('🔄 Reconexión manual solicitada');
    disconnect();
    // Pequeño delay antes de reconectar
    setTimeout(() => {
      connect();
    }, 100);
  }, [disconnect, connect]);

  // Efecto principal de conexión
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Efecto para manejar cambios de roomCode
  useEffect(() => {
    if (roomCode) {
      disconnect();
      // Pequeño delay antes de conectar con el nuevo roomCode
      const timeoutId = window.setTimeout(() => {
        connect();
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [roomCode, disconnect, connect]);

  return {
    isConnected,
    gameState,
    messages,
    sendMessage,
    reconnect,
    connectionStatus
  };
};

// Hook auxiliar para tipos de mensajes comunes
export const useWebSocketActions = (sendMessage: (type: string, data?: any) => boolean) => {
  const sendChatMessage = useCallback((message: string, playerId: string) => {
    return sendMessage('chat_message', { message, playerId });
  }, [sendMessage]);

  const joinRoom = useCallback((playerId: string, playerName: string) => {
    return sendMessage('player_join', { playerId, playerName });
  }, [sendMessage]);

  const leaveRoom = useCallback((playerId: string) => {
    return sendMessage('player_leave', { playerId });
  }, [sendMessage]);

  const startGame = useCallback((playerId: string) => {
    return sendMessage('game_start', { playerId });
  }, [sendMessage]);

  const submitAnswer = useCallback((playerId: string, answer: any, roundId: string) => {
    return sendMessage('player_answer', { playerId, answer, roundId });
  }, [sendMessage]);

  const submitVote = useCallback((playerId: string, votedPlayerId: string, roundId: string) => {
    return sendMessage('player_vote', { playerId, votedPlayerId, roundId });
  }, [sendMessage]);

  return {
    sendChatMessage,
    joinRoom,
    leaveRoom,
    startGame,
    submitAnswer,
    submitVote
  };
};