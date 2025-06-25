
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Shield, Eye, Lock } from 'lucide-react';

interface CameraPermissionConsentProps {
  isOpen: boolean;
  onConsent: () => void;
  onDecline: () => void;
  purpose: string;
}

export function CameraPermissionConsent({ 
  isOpen, 
  onConsent, 
  onDecline, 
  purpose 
}: CameraPermissionConsentProps) {
  const [hasReadPolicy, setHasReadPolicy] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Camera Access Required
          </DialogTitle>
          <DialogDescription>
            {purpose}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Privacy Protection</h4>
                    <p className="text-sm text-gray-600">
                      Photos are only stored locally on your device and transmitted securely to our servers.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Limited Access</h4>
                    <p className="text-sm text-gray-600">
                      Camera access is only used for the specific purpose stated above.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Secure Storage</h4>
                    <p className="text-sm text-gray-600">
                      All captured images are encrypted and stored securely.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={hasReadPolicy}
                onChange={(e) => setHasReadPolicy(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">
                I have read and understand the privacy policy regarding camera usage
              </span>
            </label>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onDecline}
                className="flex-1"
              >
                Decline
              </Button>
              <Button
                onClick={onConsent}
                disabled={!hasReadPolicy}
                className="flex-1"
              >
                Allow Camera Access
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
