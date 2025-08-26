
export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: 'front' | 'back' | 'external' | 'unknown';
}

export class CameraService {
  static async getAvailableCameras(): Promise<CameraDevice[]> {
    try {
      // Request permissions first to get meaningful labels
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      return videoDevices.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
        kind: this.determineCameraKind(device.label)
      }));
    } catch (error) {
      console.error('Failed to enumerate cameras:', error);
      return [];
    }
  }

  private static determineCameraKind(label: string): CameraDevice['kind'] {
    const lowerLabel = label.toLowerCase();
    
    if (lowerLabel.includes('front') || lowerLabel.includes('user')) {
      return 'front';
    } else if (lowerLabel.includes('back') || lowerLabel.includes('rear') || lowerLabel.includes('environment')) {
      return 'back';
    } else if (lowerLabel.includes('usb') || lowerLabel.includes('external')) {
      return 'external';
    }
    
    return 'unknown';
  }

  static getPreferredCameraId(): string | null {
    return localStorage.getItem('preferred-camera-id');
  }

  static setPreferredCameraId(deviceId: string): void {
    localStorage.setItem('preferred-camera-id', deviceId);
  }
}
