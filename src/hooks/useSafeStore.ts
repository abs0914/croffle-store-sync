
import { useContext } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { authDebugger } from '@/utils/authDebug';

/**
 * A safer version of useStore that provides fallback values
 * and better error handling for edge cases
 */
export function useSafeStore() {
  try {
    return useStore();
  } catch (error) {
    authDebugger.log('useSafeStore: StoreProvider not available, using fallbacks', { error }, 'warning');
    
    // Return safe fallback values
    return {
      stores: [],
      selectedStore: null,
      currentStore: null,
      isLoading: false,
      error: 'Store context not available',
      selectStore: () => {
        authDebugger.log('selectStore called without StoreProvider', {}, 'warning');
      },
      setCurrentStore: () => {
        authDebugger.log('setCurrentStore called without StoreProvider', {}, 'warning');
      },
      refreshStores: async () => {
        authDebugger.log('refreshStores called without StoreProvider', {}, 'warning');
      },
    };
  }
}
