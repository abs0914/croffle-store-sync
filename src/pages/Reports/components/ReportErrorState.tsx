
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReportErrorStateProps {
  onRetry?: () => void;
  errorMessage?: string;
}

export function ReportErrorState({ onRetry, errorMessage }: ReportErrorStateProps) {
  const isMobile = useIsMobile();
  
  return (
    <Card>
      <CardContent className={`p-4 ${isMobile ? 'py-6' : 'py-10'}`}>
        <div className="text-center flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive/80" />
          <div>
            <p className="text-destructive font-medium text-lg">
              {errorMessage || "Error loading report data"}
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              There was a problem retrieving the report information
            </p>
          </div>
          {onRetry && (
            <Button 
              variant="outline" 
              onClick={onRetry}
              className="mt-2 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
