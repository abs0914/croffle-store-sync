
import { useState, useEffect } from 'react';
import { CameraDevice, CameraService } from '@/services/cameraService';

export function useCameraSelection() {
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      setIsLoading(true);
      const cameras = await CameraService.getAvailableCameras();
      setAvailableCameras(cameras);

      // Set initial selection
      const preferredId = CameraService.getPreferredCameraId();
      const preferredCamera = cameras.find(cam => cam.deviceId === preferredId);
      
      if (preferredCamera) {
        setSelectedCameraId(preferredId!);
      } else {
        // Auto-select back camera if available, otherwise first camera
        const backCamera = cameras.find(cam => cam.kind === 'back');
        const defaultCamera = backCamera || cameras[0];
        if (defaultCamera) {
          setSelectedCameraId(defaultCamera.deviceId);
        }
      }
    } catch (error) {
      console.error('Failed to load cameras:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectCamera = (deviceId: string) => {
    setSelectedCameraId(deviceId);
    CameraService.setPreferredCameraId(deviceId);
  };

  const getSelectedCamera = () => {
    return availableCameras.find(cam => cam.deviceId === selectedCameraId);
  };

  return {
    availableCameras,
    selectedCameraId,
    selectCamera,
    getSelectedCamera,
    isLoading,
    refetchCameras: loadCameras
  };
}
