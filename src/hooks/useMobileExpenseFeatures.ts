
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface MobileExpenseFeatures {
  isOnline: boolean;
  cameraSupported: boolean;
  offlineQueue: any[];
  syncPending: boolean;
  addToOfflineQueue: (expense: any) => void;
  syncOfflineData: () => Promise<void>;
  requestCameraPermission: () => Promise<boolean>;
  captureReceipt: () => Promise<File | null>;
}

export function useMobileExpenseFeatures(): MobileExpenseFeatures {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [syncPending, setSyncPending] = useState(false);

  useEffect(() => {
    // Check camera support
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setCameraSupported(true);
    }

    // Monitor online status
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored');
      if (offlineQueue.length > 0) {
        syncOfflineData();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info('Working offline - data will sync when connection is restored');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load offline queue from localStorage
    const savedQueue = localStorage.getItem('expense_offline_queue');
    if (savedQueue) {
      setOfflineQueue(JSON.parse(savedQueue));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addToOfflineQueue = (expense: any) => {
    const newQueue = [...offlineQueue, { ...expense, id: Date.now(), offline: true }];
    setOfflineQueue(newQueue);
    localStorage.setItem('expense_offline_queue', JSON.stringify(newQueue));
    toast.info('Expense saved offline - will sync when online');
  };

  const syncOfflineData = async () => {
    if (offlineQueue.length === 0 || syncPending) return;

    setSyncPending(true);
    toast.info('Syncing offline data...');

    try {
      // Simulate API calls to sync offline data
      for (const expense of offlineQueue) {
        // In a real implementation, you would call your expense service here
        console.log('Syncing expense:', expense);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      }

      setOfflineQueue([]);
      localStorage.removeItem('expense_offline_queue');
      toast.success(`Synced ${offlineQueue.length} offline expenses`);
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Failed to sync offline data');
    } finally {
      setSyncPending(false);
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (!cameraSupported) {
      toast.error('Camera not supported on this device');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });
      
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
      
      toast.success('Camera permission granted');
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      toast.error('Camera permission denied');
      return false;
    }
  };

  const captureReceipt = async (): Promise<File | null> => {
    if (!cameraSupported) {
      toast.error('Camera not supported');
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });

      // Create a canvas to capture the image
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      video.srcObject = stream;
      video.play();

      return new Promise((resolve) => {
        video.addEventListener('loadedmetadata', () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Capture frame after a short delay
          setTimeout(() => {
            if (context) {
              context.drawImage(video, 0, 0);
              
              canvas.toBlob((blob) => {
                if (blob) {
                  const file = new File([blob], `receipt_${Date.now()}.jpg`, {
                    type: 'image/jpeg'
                  });
                  resolve(file);
                } else {
                  resolve(null);
                }
                
                // Stop the camera stream
                stream.getTracks().forEach(track => track.stop());
              }, 'image/jpeg', 0.8);
            } else {
              resolve(null);
              stream.getTracks().forEach(track => track.stop());
            }
          }, 1000);
        });
      });
    } catch (error) {
      console.error('Camera capture failed:', error);
      toast.error('Failed to capture receipt');
      return null;
    }
  };

  return {
    isOnline,
    cameraSupported,
    offlineQueue,
    syncPending,
    addToOfflineQueue,
    syncOfflineData,
    requestCameraPermission,
    captureReceipt
  };
}
