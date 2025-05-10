
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, FileX } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReportErrorStateProps {
  errorMessage?: string;
  onRetry?: () => void;
}

export function ReportErrorState({ 
  errorMessage = "Failed to load report data", 
  onRetry 
}: ReportErrorStateProps) {
  const isMobile = useIsMobile();
  
  return (
    <Card className="border-red-200">
      <CardContent className={`${isMobile ? 'py-8' : 'py-12'} flex flex-col items-center justify-center text-center`}>
        <div className="rounded-full bg-red-100 p-3 mb-4">
          <FileX className="h-8 w-8 text-red-600" />
        </div>
        
        <h3 className="text-lg font-medium mb-2">{errorMessage}</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          There was a problem loading the report data. This could be due to a network issue or missing data.
        </p>
        
        {onRetry && (
          <Button onClick={onRetry} className="mt-2">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
        
        <div className="mt-6 text-xs text-muted-foreground max-w-sm">
          <p>If this issue persists, please check your database connection or contact support.</p>
        </div>
      </CardContent>
    </Card>
  );
}
