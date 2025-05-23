
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";

interface ErrorViewProps {
  error: Error | unknown;
  onRetry?: () => void;
}

export default function ErrorView({ error, onRetry }: ErrorViewProps) {
  const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
  const isPermissionError = errorMessage.includes('permission') || 
                           errorMessage.includes('access') || 
                           errorMessage.includes('not allowed');
  
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6 flex flex-col items-center text-center">
        <AlertTriangleIcon className="h-10 w-10 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Users</h3>
        <p className="text-muted-foreground mb-2">{errorMessage}</p>
        {isPermissionError ? (
          <p className="text-sm text-muted-foreground">
            You may not have sufficient permissions to view this data. Please contact your administrator.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            This might be due to a temporary database issue. Please try again or contact support if the problem persists.
          </p>
        )}
      </CardContent>
      {onRetry && (
        <CardFooter className="justify-center">
          <Button onClick={onRetry} variant="outline">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
