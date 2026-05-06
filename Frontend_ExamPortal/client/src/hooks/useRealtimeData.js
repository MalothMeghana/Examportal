/**
 * useRealtimeData Hook
 * Universal hook for real-time data fetching with polling
 */

import { useEffect, useState, useCallback, useRef } from 'react';

export function useRealtimeData({
  fetchFn,
  interval = 10000, // Default 10 seconds
  enabled = true,
  dependencies = [],
  onSuccess,
  onError,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async (isInitial = false) => {
    if (!enabled) return;
    
    try {
      if (isInitial) setLoading(true);
      
      const result = await fetchFn();
      
      if (isMountedRef.current) {
        setData(result);
        setError(null);
        setLastUpdated(new Date());
        onSuccess?.(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to fetch data');
        onError?.(err);
      }
    } finally {
      if (isMountedRef.current && isInitial) {
        setLoading(false);
      }
    }
  }, [fetchFn, enabled, onSuccess, onError]);

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchData(false);
  }, [fetchData]);

  // Initial fetch and polling setup
  useEffect(() => {
    isMountedRef.current = true;
    
    if (enabled) {
      // Initial fetch
      fetchData(true);

      // Set up polling
      intervalRef.current = setInterval(() => {
        fetchData(false);
      }, interval);
    }

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, ...dependencies]);

  // Visibility-based refresh (fetch when tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        fetchData(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, enabled]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    isStale: lastUpdated ? (Date.now() - lastUpdated.getTime()) > interval * 2 : false,
  };
}

export default useRealtimeData;
