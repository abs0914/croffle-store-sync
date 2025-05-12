
// Camera hook types
export interface CameraState {
  showCamera: boolean;
  photo: string | null;
  cameraError: string | null;
  cameraInitialized: boolean;
  isStartingCamera: boolean;
}

export interface CameraActions {
  setShowCamera: (show: boolean) => void;
  setPhoto: (photo: string | null) => void;
  setCameraError: (error: string | null) => void;
  startCamera: () => Promise<boolean | void>;
  stopCamera: () => void;
  capturePhoto: () => string | null;
  logVideoState: () => void;
}

export interface UseCameraResult extends CameraState, CameraActions {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}
