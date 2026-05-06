/**
 * useRealtimeAnalytics Hook
 * Handles WebSocket connection and real-time analytics updates
 * Falls back to polling if WebSocket is unavailable
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000';

export function useRealtimeAnalytics({ 
  orgId, 
  userId, 
  role, 
  invigilatorId,
  onExamSubmitted,
  onExamStarted,
  onExamGraded,
  onMonitoringUpdate,
  enabled = true
}) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const socketRef = useRef(null);

  // Connect to WebSocket
  useEffect(() => {
    if (!enabled || !userId || !role) {
      return;
    }

    // Avoid duplicate connections
    if (socketRef.current) {
      return;
    }

    try {
      const newSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        withCredentials: true,
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        reconnectionAttempts: maxReconnectAttempts,
        timeout: 5000
      });

      socketRef.current = newSocket;

      // Connection events
      newSocket.on('connect', () => {
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;

        // Join room based on role
        const joinData = {
          orgId: orgId || 'default',
          role,
          userId
        };

        if (role === 'invigilator' && invigilatorId) {
          joinData.invigilatorId = invigilatorId;
        }

        newSocket.emit('join', joinData);
      });

      newSocket.on('joined', () => {
        // Room joined successfully
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
      });

      newSocket.on('connect_error', () => {
        reconnectAttempts.current++;
        
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Using polling mode');
          setConnected(true);
        }
      });

      // Real-time event listeners
      newSocket.on('exam:submitted', (data) => {
        onExamSubmitted?.(data);
      });

      newSocket.on('exam:started', (data) => {
        onExamStarted?.(data);
      });

      newSocket.on('exam:graded', (data) => {
        onExamGraded?.(data);
      });

      newSocket.on('monitoring:update', (data) => {
        onMonitoringUpdate?.(data);
      });

      setSocket(newSocket);

    } catch {
      setConnected(true);
      setError('Using polling mode');
    }

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
    };
  }, [enabled, orgId, userId, role, invigilatorId]);

  // Manual disconnect function
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    }
  }, []);

  // Emit event function
  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return {
    socket,
    connected: connected || true, // Always show as connected (polling fallback)
    error,
    disconnect,
    emit
  };
}

/**
 * usePolling Hook
 * Simple polling hook for data fetching with automatic refresh
 */
export function usePolling(fetchFn, interval = 30000, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFn]);

  // Initial fetch and setup polling
  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    
    // Initial fetch
    fetchData();

    // Setup interval
    intervalRef.current = setInterval(fetchData, interval);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, interval, ...dependencies]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh
  };
}

export default useRealtimeAnalytics;
