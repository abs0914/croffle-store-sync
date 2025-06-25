
import { useState, useCallback } from 'react';
import { useSecurityAudit } from '@/contexts/auth/SecurityAuditContext';

export function useCameraPermissions() {
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [consentPurpose, setConsentPurpose] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const { logSecurityEvent } = useSecurityAudit();

  const requestCameraPermission = useCallback(async (purpose: string) => {
    try {
      await logSecurityEvent('camera_permission_requested', { purpose });
      
      // Check if permission was previously granted
      const permissions = await navigator.permissions.query({ name: 'camera' as any });
      
      if (permissions.state === 'granted') {
        setPermissionGranted(true);
        await logSecurityEvent('camera_permission_already_granted', { purpose });
        return true;
      }
      
      // Show consent dialog
      setConsentPurpose(purpose);
      setShowConsentDialog(true);
      
      return new Promise<boolean>((resolve) => {
        const handleConsent = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop()); // Stop immediately after getting permission
            
            setPermissionGranted(true);
            setShowConsentDialog(false);
            await logSecurityEvent('camera_permission_granted', { purpose });
            resolve(true);
          } catch (error: any) {
            await logSecurityEvent('camera_permission_denied', { purpose, error: error.message });
            setShowConsentDialog(false);
            resolve(false);
          }
        };
        
        const handleDecline = async () => {
          await logSecurityEvent('camera_permission_declined', { purpose });
          setShowConsentDialog(false);
          resolve(false);
        };
        
        // Store handlers for the consent dialog
        (window as any).cameraConsentHandlers = { handleConsent, handleDecline };
      });
    } catch (error: any) {
      await logSecurityEvent('camera_permission_error', { purpose, error: error.message });
      return false;
    }
  }, [logSecurityEvent]);

  return {
    requestCameraPermission,
    showConsentDialog,
    consentPurpose,
    permissionGranted,
    setShowConsentDialog
  };
}
