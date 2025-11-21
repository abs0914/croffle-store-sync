
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CapacitorMobileInit } from './mobile/capacitor-init'
import { registerServiceWorker } from './utils/registerServiceWorker'
import { ensureDatabaseReady } from './services/offline/db/schema'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

// Initialize app asynchronously
async function initializeApp() {
  try {
    // 1. Initialize offline database first (critical)
    console.log('🔄 Initializing offline database...');
    await ensureDatabaseReady();
    console.log('✅ Offline database ready');

    // 2. Register service worker for offline support
    await registerServiceWorker().catch(console.error);

    // 3. Initialize Capacitor mobile plugins
    await CapacitorMobileInit.initialize().then(() => {
      console.log('✅ Mobile initialization complete');
    }).catch((error) => {
      console.error('⚠️ Mobile initialization failed:', error);
    });

    // 4. Render app
    console.log('🚀 Rendering app...');
    createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    console.error('❌ App initialization failed:', error);
    // Show error to user
    document.getElementById("root")!.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center; font-family: system-ui, -apple-system, sans-serif;">
        <h1 style="color: #dc2626; margin-bottom: 16px;">⚠️ Initialization Error</h1>
        <p style="color: #4b5563; margin-bottom: 24px;">
          The application failed to initialize. This is usually caused by a corrupted offline database.
        </p>
        <button 
          onclick="localStorage.clear(); indexedDB.deleteDatabase('OfflinePOSDB'); location.reload();"
          style="background: #2563eb; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;"
        >
          Clear Data & Reload
        </button>
      </div>
    `;
  }
}

// Start initialization
initializeApp();
