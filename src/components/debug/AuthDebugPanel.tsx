
import React, { useState, useEffect } from 'react';
import { authDebugger } from '@/utils/authDebug';
import { useAuth } from '@/contexts/auth/SimplifiedAuthProvider';
import { useStore } from '@/contexts/StoreContext';

export function AuthDebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [events, setEvents] = useState(authDebugger.getEvents());
  const { user, session, isLoading: authLoading, isAuthenticated } = useAuth();
  const { currentStore, stores, isLoading: storeLoading, error: storeError } = useStore();

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    const interval = setInterval(() => {
      setEvents(authDebugger.getEvents());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Show/hide panel with Ctrl+Shift+D
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsVisible(!isVisible);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  if (process.env.NODE_ENV !== 'development' || !isVisible) {
    return null;
  }

  const summary = authDebugger.getEventsSummary();

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-white border border-gray-300 rounded-lg shadow-lg z-50 overflow-hidden">
      <div className="bg-gray-100 p-2 flex justify-between items-center">
        <h3 className="font-semibold text-sm">Auth Debug Panel</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-600 hover:text-gray-800"
        >
          ×
        </button>
      </div>
      
      <div className="p-3 text-xs">
        <div className="mb-2">
          <strong>Status:</strong>
          <div className="ml-2">
            Auth Loading: {authLoading ? '🟡' : '🟢'} | 
            Store Loading: {storeLoading ? '🟡' : '🟢'} | 
            Authenticated: {isAuthenticated ? '🟢' : '🔴'}
          </div>
        </div>

        <div className="mb-2">
          <strong>User:</strong>
          <div className="ml-2">
            {user ? `${user.email} (${user.role})` : 'None'}
          </div>
        </div>

        <div className="mb-2">
          <strong>Store:</strong>
          <div className="ml-2">
            {currentStore ? currentStore.name : 'None'} 
            {storeError && <span className="text-red-600"> (Error: {storeError})</span>}
          </div>
        </div>

        <div className="mb-2">
          <strong>Events ({summary.total}):</strong>
          {summary.errors > 0 && <span className="text-red-600"> {summary.errors} errors</span>}
          {summary.warnings > 0 && <span className="text-orange-600"> {summary.warnings} warnings</span>}
        </div>

        <div className="max-h-32 overflow-y-auto text-xs">
          {events.slice(0, 10).map((event, index) => (
            <div key={index} className={`mb-1 p-1 rounded ${
              event.level === 'error' ? 'bg-red-100' : 
              event.level === 'warning' ? 'bg-orange-100' : 'bg-gray-50'
            }`}>
              <div className="font-mono text-xs">
                {event.timestamp.toLocaleTimeString()}: {event.event}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 flex gap-2">
          <button 
            onClick={() => authDebugger.clearEvents()}
            className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
          >
            Clear
          </button>
          <button 
            onClick={() => console.log('Auth Debug Events:', authDebugger.getEvents())}
            className="text-xs bg-blue-200 px-2 py-1 rounded hover:bg-blue-300"
          >
            Log All
          </button>
        </div>
      </div>
    </div>
  );
}
