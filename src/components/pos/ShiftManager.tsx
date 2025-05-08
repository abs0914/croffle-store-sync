
import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useShift } from "@/contexts/ShiftContext";
import { useStore } from "@/contexts/StoreContext";
import { format } from "date-fns";
import { Camera } from "lucide-react";
import { toast } from "sonner";

export default function ShiftManager() {
  const { currentShift, startShift, endShift } = useShift();
  const { currentStore } = useStore();
  const [isStartShiftOpen, setIsStartShiftOpen] = useState(false);
  const [isEndShiftOpen, setIsEndShiftOpen] = useState(false);
  const [startingCash, setStartingCash] = useState<number>(0);
  const [endingCash, setEndingCash] = useState<number>(0);
  const [showCamera, setShowCamera] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const handleStartShift = async () => {
    const success = await startShift(startingCash, photo || undefined);
    if (success) {
      setIsStartShiftOpen(false);
      setStartingCash(0);
      setPhoto(null);
      stopCamera();
    }
  };

  const handleEndShift = async () => {
    if (!currentShift) return;
    
    const success = await endShift(endingCash, photo || undefined);
    if (success) {
      setIsEndShiftOpen(false);
      setEndingCash(0);
      setPhoto(null);
      stopCamera();
    }
  };

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        mediaStreamRef.current = stream;
      }
      
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please check permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setShowCamera(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the video frame to the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Draw timestamp on the photo
        const now = new Date();
        const timestamp = format(now, "yyyy-MM-dd HH:mm:ss");
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        
        ctx.font = '16px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'right';
        ctx.fillText(timestamp, canvas.width - 10, canvas.height - 10);
        if (currentStore) {
          ctx.textAlign = 'left';
          ctx.fillText(currentStore.name, 10, canvas.height - 10);
        }
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhoto(dataUrl);
        stopCamera();
      }
    }
  }, [currentStore, stopCamera]);

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">Shift Management</CardTitle>
      </CardHeader>
      <CardContent>
        {currentShift ? (
          <div className="space-y-4">
            <div>
              <p className="font-medium text-sm">Active Shift</p>
              <p>Started: {format(new Date(currentShift.startTime), "MMM dd, yyyy h:mm a")}</p>
              <p>Starting Cash: ₱{currentShift.startingCash.toFixed(2)}</p>
            </div>
            
            <Dialog open={isEndShiftOpen} onOpenChange={setIsEndShiftOpen}>
              <DialogTrigger asChild>
                <Button className="w-full mt-2 bg-red-500 hover:bg-red-600">End Shift</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>End Current Shift</DialogTitle>
                  <DialogDescription>
                    Please count your cash drawer and enter the ending amount.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="endingCash">Ending Cash Amount</Label>
                    <Input
                      id="endingCash"
                      type="number"
                      value={endingCash || ''}
                      onChange={(e) => setEndingCash(Number(e.target.value))}
                      placeholder="0.00"
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Capture Photo (Optional)</Label>
                    {showCamera ? (
                      <div className="relative">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          className="w-full h-48 object-cover rounded-md"
                        />
                        <Button 
                          onClick={capturePhoto} 
                          className="absolute bottom-2 left-1/2 transform -translate-x-1/2"
                        >
                          Capture
                        </Button>
                      </div>
                    ) : photo ? (
                      <div className="relative">
                        <img 
                          src={photo} 
                          alt="Captured photo" 
                          className="w-full h-48 object-cover rounded-md" 
                        />
                        <Button 
                          onClick={() => { setPhoto(null); startCamera(); }} 
                          variant="outline" 
                          size="sm"
                          className="absolute bottom-2 right-2"
                        >
                          Retake
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={startCamera} variant="outline" className="w-full">
                        <Camera className="mr-2 h-4 w-4" />
                        Take Photo
                      </Button>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsEndShiftOpen(false);
                    stopCamera();
                    setPhoto(null);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleEndShift}>
                    End Shift
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div>
            <p className="text-muted-foreground mb-2">No active shift. Start a shift to begin processing transactions.</p>
            
            <Dialog open={isStartShiftOpen} onOpenChange={setIsStartShiftOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">Start Shift</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Shift</DialogTitle>
                  <DialogDescription>
                    Please count your cash drawer and enter the starting amount.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="startingCash">Starting Cash Amount</Label>
                    <Input
                      id="startingCash"
                      type="number"
                      value={startingCash || ''}
                      onChange={(e) => setStartingCash(Number(e.target.value))}
                      placeholder="0.00"
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Capture Photo (Optional)</Label>
                    {showCamera ? (
                      <div className="relative">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          className="w-full h-48 object-cover rounded-md"
                        />
                        <Button 
                          onClick={capturePhoto} 
                          className="absolute bottom-2 left-1/2 transform -translate-x-1/2"
                        >
                          Capture
                        </Button>
                      </div>
                    ) : photo ? (
                      <div className="relative">
                        <img 
                          src={photo} 
                          alt="Captured photo" 
                          className="w-full h-48 object-cover rounded-md" 
                        />
                        <Button 
                          onClick={() => { setPhoto(null); startCamera(); }} 
                          variant="outline" 
                          size="sm"
                          className="absolute bottom-2 right-2"
                        >
                          Retake
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={startCamera} variant="outline" className="w-full">
                        <Camera className="mr-2 h-4 w-4" />
                        Take Photo
                      </Button>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsStartShiftOpen(false);
                    stopCamera();
                    setPhoto(null);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleStartShift}>
                    Start Shift
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
