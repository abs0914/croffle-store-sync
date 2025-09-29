import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  justReconnected: boolean;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    wasOffline: false,
    justReconnected: false
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({
        isOnline: true,
        wasOffline: prev.wasOffline,
        justReconnected: prev.wasOffline && !prev.isOnline
      }));
      
      // Reset justReconnected flag after a brief moment
      setTimeout(() => {
        setStatus(prev => ({ ...prev, justReconnected: false }));
      }, 3000);
    };

    const handleOffline = () => {
      setStatus(prev => ({
        isOnline: false,
        wasOffline: true,
        justReconnected: false
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}