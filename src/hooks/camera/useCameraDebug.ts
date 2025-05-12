
import { useCallback } from "react";

interface UseCameraDebugProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  mediaStreamRef: React.MutableRefObject<MediaStream | null>;
}

export function useCameraDebug({ videoRef, mediaStreamRef }: UseCameraDebugProps) {
  // Log video element state for debugging
  const logVideoState = useCallback(() => {
    console.log('Video element:', videoRef.current);
    if (videoRef.current) {
      console.log('Video element state:', {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
        readyState: videoRef.current.readyState,
        paused: videoRef.current.paused,
        error: videoRef.current.error,
        visibility: document.visibilityState,
        streamActive: mediaStreamRef.current?.active
      });
    } else {
      console.log('Video element is null');
    }
  }, [videoRef, mediaStreamRef]);
  
  return { logVideoState };
}
