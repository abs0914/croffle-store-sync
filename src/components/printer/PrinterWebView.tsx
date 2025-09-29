import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Bluetooth, Printer, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PrinterDevice {
  id: string;
  name: string;
  connected: boolean;
}

interface PrinterWebViewProps {
  onPrinterConnected?: (printer: PrinterDevice) => void;
  onPrinterDisconnected?: () => void;
  onPrintComplete?: (success: boolean) => void;
}

export function PrinterWebView({ 
  onPrinterConnected, 
  onPrinterDisconnected, 
  onPrintComplete 
}: PrinterWebViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<PrinterDevice | null>(null);
  const [webViewUrl, setWebViewUrl] = useState('');

  // Get the current base URL for the WebView
  useEffect(() => {
    const baseUrl = window.location.origin;
    setWebViewUrl(`${baseUrl}/printer-webview`);
  }, []);

  // Handle messages from the WebView iframe
  const handleMessage = useCallback((event: MessageEvent) => {
    // Ensure the message is from our WebView
    if (event.origin !== window.location.origin) {
      return;
    }

    const { type, ...data } = event.data;

    switch (type) {
      case 'PRINTER_AVAILABILITY':
        console.log('📱 WebView: Printer availability:', data);
        setIsAvailable(data.available && data.bluetoothEnabled);
        setIsLoading(false);
        break;

      case 'PRINTER_CONNECTED':
        console.log('📱 WebView: Printer connected:', data.printer);
        setConnectedPrinter(data.printer);
        onPrinterConnected?.(data.printer);
        toast.success(`Connected to ${data.printer.name}`);
        break;

      case 'PRINTER_DISCONNECTED':
        console.log('📱 WebView: Printer disconnected');
        setConnectedPrinter(null);
        onPrinterDisconnected?.();
        toast.success('Printer disconnected');
        break;

      case 'PRINT_TEST_RECEIPT':
        console.log('📱 WebView: Print test receipt result:', data);
        onPrintComplete?.(data.success);
        if (data.success) {
          toast.success('Test receipt printed successfully');
        } else {
          toast.error('Failed to print test receipt');
        }
        break;

      default:
        console.log('📱 WebView: Unknown message type:', type, data);
    }
  }, [onPrinterConnected, onPrinterDisconnected, onPrintComplete]);

  // Set up message listener
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Send message to WebView
  const sendMessageToWebView = useCallback((message: any) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, window.location.origin);
    }
  }, []);

  // Request printer status from WebView
  const requestPrinterStatus = useCallback(() => {
    sendMessageToWebView({ type: 'GET_PRINTER_STATUS' });
  }, [sendMessageToWebView]);

  // Send print job to WebView
  const sendPrintJob = useCallback((printData: any) => {
    sendMessageToWebView({ 
      type: 'PRINT_RECEIPT', 
      data: printData 
    });
  }, [sendMessageToWebView]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    console.log('📱 WebView iframe loaded');
    setIsLoading(false);
    
    // Request initial status after a short delay to ensure WebView is ready
    setTimeout(() => {
      requestPrinterStatus();
    }, 1000);
  }, [requestPrinterStatus]);

  // Refresh WebView
  const refreshWebView = useCallback(() => {
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = iframeRef.current.src;
    }
  }, []);

  // Open WebView in new tab (for debugging)
  const openInNewTab = useCallback(() => {
    window.open(webViewUrl, '_blank');
  }, [webViewUrl]);

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bluetooth className="h-5 w-5" />
              Thermal Printer (WebView)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshWebView}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openInNewTab}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Loading State */}
          {isLoading && (
            <Alert>
              <Spinner className="h-4 w-4" />
              <AlertDescription>
                Loading thermal printer interface...
              </AlertDescription>
            </Alert>
          )}

          {/* Status Badges */}
          {!isLoading && (
            <div className="flex gap-2 flex-wrap">
              <Badge variant={isAvailable ? "default" : "destructive"}>
                {isAvailable ? "WebView Ready" : "WebView Not Available"}
              </Badge>
              {connectedPrinter && (
                <Badge variant="default">
                  Connected: {connectedPrinter.name}
                </Badge>
              )}
            </div>
          )}

          {/* Error State */}
          {!isLoading && !isAvailable && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Web Bluetooth not available in WebView. Please ensure:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Bluetooth is enabled on your device</li>
                  <li>Location permissions are granted</li>
                  <li>WebView has proper permissions</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* WebView Container */}
      <Card>
        <CardContent className="p-0">
          <div className="relative">
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <Spinner className="h-5 w-5" />
                  <span>Loading printer interface...</span>
                </div>
              </div>
            )}

            {/* WebView iframe */}
            <iframe
              ref={iframeRef}
              src={webViewUrl}
              onLoad={handleIframeLoad}
              className="w-full h-[600px] border-0 rounded-lg"
              title="Thermal Printer WebView"
              sandbox="allow-scripts allow-same-origin allow-forms"
              allow="bluetooth; geolocation"
            />
          </div>
        </CardContent>
      </Card>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div>WebView URL: {webViewUrl}</div>
            <div>Available: {isAvailable ? 'Yes' : 'No'}</div>
            <div>Connected Printer: {connectedPrinter?.name || 'None'}</div>
            <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Export methods for external use
export const PrinterWebViewAPI = {
  sendPrintJob: (printData: any) => {
    // This would be implemented to communicate with the active WebView instance
    console.log('Sending print job to WebView:', printData);
  },
  
  requestStatus: () => {
    // This would be implemented to get status from the active WebView instance
    console.log('Requesting status from WebView');
  }
};
