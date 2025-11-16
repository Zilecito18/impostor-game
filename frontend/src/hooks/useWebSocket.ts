import { useState, useEffect, useRef, useCallback } from 'react';

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
  const reconnectTimeoutRef = useRef<number | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);

  const getWebSocketUrl = useCallback((roomCode: string) => {
    const baseUrl = 'wss://impostor-game-backend-pl8h.onrender.com';
    return `${baseUrl}/api/ws/${roomCode}`;
  }, []);

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
      const wsUrl = getWebSocketUrl(roomCode);
      console.log('🌐 WebSocket URL:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket conectado exitosamente');
        setIsConnected(true);
        setConnectionStatus('connected');
        
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
          
          switch (data.type) {
            case 'player_joined':
            case 'player_left':
            case 'game_started':
            case 'game_updated':
            case 'room_state':
              if (data.room) {
                console.log('🔄 Actualizando estado de la sala:', data.room);
                setGameState(data.room);
              }
              break;
              
            case 'player_ready':
            case 'all_players_ready':
            case 'answer_submitted':
            case 'vote_submitted':
            case 'voting_complete':
            case 'phase_changed':
              if (data.room) {
                setGameState(data.room);
              }
              break;
              
            case 'chat_message':
              setMessages(prev => [...prev, {
                playerName: data.player_name,
                message: data.message,
                timestamp: data.timestamp
              }]);
              break;
              
            case 'error':
              console.error('❌ Error del servidor:', data.message);
              break;
              
            default:
              console.log('⚠️ Mensaje no manejado:', data.type, data);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket desconectado. Código: ${event.code}, Razón: ${event.reason}`);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        if (event.code !== 1000 && roomCode) {
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
        
        if (roomCode) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            console.log('🔄 Reconectando después de error...');
            connect();
          }, 5000);
        }
      };

    } catch (error) {
      console.error('❌ Error creando WebSocket:', error);
      setConnectionStatus('error');
      
      if (roomCode) {
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 5000);
      }
    }
  }, [roomCode, getWebSocketUrl]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      console.log('🛑 Cerrando WebSocket manualmente');
      socketRef.current.close(1000, 'Manual disconnect');
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
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
    }, 100);
  }, [disconnect, connect]);

  useEffect(() => {
    if (roomCode) {
      console.log('🎯 Iniciando conexión WebSocket para sala:', roomCode);
      connect();
    } else {
      console.log('❌ No hay roomCode, desconectando...');
      disconnect();
    }
    
    return () => {
      console.log('🧹 Limpiando WebSocket');
      disconnect();
    };
  }, [connect, disconnect, roomCode]);

  return {
    isConnected,
    gameState,
    messages,
    sendMessage,
    reconnect,
    connectionStatus
  };
};

// ✅ VERSIÓN CORREGIDA
export const useWebSocketActions = (sendMessage: (type: string, data?: any) => boolean) => {
  const sendChatMessage = useCallback((message: string, playerName: string) => {
    return sendMessage('chat_message', { message, player_name: playerName });
  }, [sendMessage]);

  const setPlayerReady = useCallback((playerId: string, playerName: string, isReady: boolean = true) => {
    return sendMessage('player_ready', { 
      player_id: playerId, 
      player_name: playerName, 
      is_ready: isReady 
    });
  }, [sendMessage]);

  const startGame = useCallback(() => {
    return sendMessage('start_game', {});
  }, [sendMessage]);

  return {
    sendChatMessage,
    setPlayerReady,
    startGame
  };
};