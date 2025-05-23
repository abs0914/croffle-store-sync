
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";

interface ErrorViewProps {
  error: Error | unknown;
  onRetry: () => void;
}

export default function ErrorView({ error, onRetry }: ErrorViewProps) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-destructive">
          <AlertTriangleIcon className="mr-2 h-5 w-5" />
          Error Loading Users
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
          <Button onClick={onRetry} variant="outline" className="mt-4">
            <RefreshCwIcon className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
