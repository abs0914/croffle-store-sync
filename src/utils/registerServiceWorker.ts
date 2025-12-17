/**
 * SERVICE WORKER REGISTRATION
 * 
 * Registers the service worker for offline support.
 * Only runs in production and when service workers are supported.
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // Only register in production builds
  if (import.meta.env.DEV) {
    console.log('⚠️ Service worker disabled in development');
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service workers not supported');
    return null;
  }

  try {
    console.log('📦 Registering service worker...');
    
    // First, try to unregister any existing service workers in invalid state
    const existingRegistrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of existingRegistrations) {
      try {
        if (!reg.active && !reg.installing && !reg.waiting) {
          console.log('🧹 Cleaning up invalid service worker registration');
          await reg.unregister();
        }
      } catch (e) {
        console.warn('⚠️ Could not clean up service worker:', e);
      }
    }

    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
      updateViaCache: 'none' // Prevent caching issues
    });

    console.log('✅ Service worker registered:', registration.scope);

    // Check for updates periodically (non-blocking, delayed start)
    setTimeout(() => {
      setInterval(() => {
        registration.update().catch(() => {
          // Silently ignore update errors
        });
      }, 60000);
    }, 5000);

    // Handle updates (non-blocking)
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('🔄 New service worker available');
          
          // Optionally notify user about update
          if (confirm('New version available. Reload to update?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });
    });

    // Handle controller change (new service worker activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service worker controller changed');
    });

    return registration;
  } catch (error) {
    console.error('❌ Service worker registration failed:', error);
    // Don't throw - let app continue without service worker
    return null;
  }
}

/**
 * Unregister service worker (for testing)
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log('✅ Service worker unregistered');
      return success;
    }
    return false;
  } catch (error) {
    console.error('❌ Failed to unregister service worker:', error);
    return false;
  }
}
