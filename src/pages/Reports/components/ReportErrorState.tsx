
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileX, Database, Wifi, RefreshCw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReportErrorStateProps {
  errorMessage?: string;
  onRetry?: () => void;
  debugInfo?: {
    storeId?: string;
    dateRange?: string;
    reportType?: string;
    isAuthenticated?: boolean;
  };
}

export function ReportErrorState({ 
  errorMessage = "Failed to load report data", 
  onRetry,
  debugInfo
}: ReportErrorStateProps) {
  const isMobile = useIsMobile();
  
  // Determine error type and appropriate icon
  const getErrorInfo = () => {
    if (errorMessage.toLowerCase().includes('authentication') || errorMessage.toLowerCase().includes('session')) {
      return {
        icon: AlertTriangle,
        variant: "destructive" as const,
        bgColor: "bg-red-50",
        title: "Authentication Error",
        suggestion: "Please refresh the page and log in again"
      };
    }
    if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('connection')) {
      return {
        icon: Wifi,
        variant: "secondary" as const,
        bgColor: "bg-blue-50",
        title: "Connection Error", 
        suggestion: "Check your internet connection and try again"
      };
    }
    return {
      icon: FileX,
      variant: "outline" as const,
      bgColor: "bg-gray-50",
      title: "Data Error",
      suggestion: "Try selecting a different date range or store"
    };
  };

  const errorInfo = getErrorInfo();
  const ErrorIcon = errorInfo.icon;
  
  return (
    <Card className={`border-2 ${errorInfo.variant === 'destructive' ? 'border-red-200' : 'border-gray-200'}`}>
      <CardHeader className="text-center pb-4">
        <div className={`rounded-full ${errorInfo.bgColor} p-4 mx-auto w-fit mb-4`}>
          <ErrorIcon className={`h-8 w-8 ${errorInfo.variant === 'destructive' ? 'text-red-600' : 'text-muted-foreground'}`} />
        </div>
        <CardTitle className="text-xl">{errorInfo.title}</CardTitle>
      </CardHeader>
      
      <CardContent className={`${isMobile ? 'px-4' : 'px-6'} text-center space-y-6`}>
        <div className="space-y-3">
          <p className="text-base text-muted-foreground font-medium">
            {errorMessage}
          </p>
          <p className="text-sm text-muted-foreground">
            {errorInfo.suggestion}
          </p>
        </div>

        {debugInfo && (
          <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Debug Information</h4>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {debugInfo.reportType && (
                <div className="flex justify-between">
                  <span>Report Type:</span>
                  <Badge variant="outline" className="text-xs">{debugInfo.reportType}</Badge>
                </div>
              )}
              {debugInfo.storeId && (
                <div className="flex justify-between">
                  <span>Store ID:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded">
                    {debugInfo.storeId.slice(0, 8)}...
                  </code>
                </div>
              )}
              {debugInfo.dateRange && (
                <div className="flex justify-between">
                  <span>Date Range:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded">
                    {debugInfo.dateRange}
                  </code>
                </div>
              )}
              <div className="flex justify-between">
                <span>Authentication:</span>
                <Badge variant={debugInfo.isAuthenticated ? "secondary" : "destructive"} className="text-xs">
                  {debugInfo.isAuthenticated ? "✓ Active" : "✗ Failed"}
                </Badge>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-3">
          {onRetry && (
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Loading
            </Button>
          )}
          
          <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
            <Database className="mr-2 h-4 w-4" />
            Refresh Page
          </Button>
        </div>

        <div className="pt-4 text-xs text-muted-foreground border-t">
          <p>If this issue persists:</p>
          <ul className="list-disc list-inside mt-1 space-y-1 text-left max-w-sm mx-auto">
            <li>Check your internet connection</li>
            <li>Verify you have access to this report</li>
            <li>Try a different date range</li>
            <li>Contact support if the problem continues</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
