
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Camera, Smartphone, Monitor } from 'lucide-react';
import { CameraDevice } from '@/services/cameraService';

interface CameraSelectorProps {
  cameras: CameraDevice[];
  selectedCameraId: string;
  onCameraSelect: (deviceId: string) => void;
  isLoading?: boolean;
}

export default function CameraSelector({ 
  cameras, 
  selectedCameraId, 
  onCameraSelect, 
  isLoading 
}: CameraSelectorProps) {
  const getCameraIcon = (kind: CameraDevice['kind']) => {
    switch (kind) {
      case 'front':
        return <Smartphone className="h-4 w-4" />;
      case 'back':
        return <Camera className="h-4 w-4" />;
      case 'external':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Camera className="h-4 w-4" />;
    }
  };

  if (cameras.length <= 1) {
    return null; // Don't show selector if only one camera
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Camera</Label>
      <Select 
        value={selectedCameraId} 
        onValueChange={onCameraSelect}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select camera" />
        </SelectTrigger>
        <SelectContent>
          {cameras.map((camera) => (
            <SelectItem key={camera.deviceId} value={camera.deviceId}>
              <div className="flex items-center gap-2">
                {getCameraIcon(camera.kind)}
                <span>{camera.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
