
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OptimizedCapacitorInit } from './mobile/OptimizedCapacitorInit'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    },
  },
})

// Initialize Capacitor mobile plugins with non-blocking approach
OptimizedCapacitorInit.initialize()
  .then(() => {
    console.log('📱 Mobile initialization complete');
  })
  .catch((error) => {
    console.warn('📱 Mobile initialization failed (non-blocking):', error);
  });

// Render the app immediately without waiting for mobile init
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
