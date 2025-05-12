
/**
 * Represents the current state of the camera system
 * @interface CameraState
 */
export interface CameraState {
  /** Whether the camera is currently being displayed */
  showCamera: boolean;
  /** Base64 encoded string of the captured photo, or null if no photo has been taken */
  photo: string | null;
  /** Error message if camera initialization failed, or null if no error */
  cameraError: string | null;
  /** Whether the camera has been successfully initialized and is ready to use */
  cameraInitialized: boolean;
  /** Whether the camera is in the process of starting up */
  isStartingCamera: boolean;
}

/**
 * Camera action methods available for controlling the camera
 * @interface CameraActions
 */
export interface CameraActions {
  /**
   * Show or hide the camera view
   * @param show - Boolean indicating whether to show the camera
   */
  setShowCamera: (show: boolean) => void;
  
  /**
   * Set the captured photo data
   * @param photo - Base64 encoded string of the photo or null to clear
   */
  setPhoto: (photo: string | null) => void;
  
  /**
   * Set an error message for camera operations
   * @param error - Error message or null to clear errors
   */
  setCameraError: (error: string | null) => void;
  
  /**
   * Initialize and start the camera
   * @returns Promise that resolves to boolean indicating success, or void
   */
  startCamera: () => Promise<boolean | void>;
  
  /**
   * Stop the camera and release all resources
   */
  stopCamera: () => void;
  
  /**
   * Capture a photo from the current camera view
   * @returns Base64 encoded string of the captured photo, or null if capture failed
   */
  capturePhoto: () => string | null;
  
  /**
   * Log the current state of the video element and media stream for debugging
   */
  logVideoState: () => void;
}

/**
 * Complete camera hook return type combining state, actions and refs
 * @interface UseCameraResult
 * @extends CameraState
 * @extends CameraActions
 */
export interface UseCameraResult extends CameraState, CameraActions {
  /** Reference to the video element used for displaying camera feed */
  videoRef: React.RefObject<HTMLVideoElement>;
  
  /** Reference to the canvas element used for capturing photos */
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

/**
 * Props for camera state management
 * @interface UseCameraStateReturn
 */
export interface UseCameraStateReturn extends CameraState {
  /** Function to set camera visibility */
  setShowCamera: (show: boolean) => void;
  /** Function to set photo data */
  setPhoto: (photo: string | null) => void;
  /** Function to set camera error state */
  setCameraError: (error: string | null) => void;
  /** Function to set camera initialization state */
  setCameraInitialized: (initialized: boolean) => void;
  /** Function to set camera starting state */
  setIsStartingCamera: (starting: boolean) => void;
  /** Reference to the video element */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** Reference to the canvas element */
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** Reference to the active media stream */
  mediaStreamRef: React.MutableRefObject<MediaStream | null>;
  /** Counter for camera initialization attempts */
  attemptCount: React.MutableRefObject<number>;
  /** Reference to the retry timeout */
  retryTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}
