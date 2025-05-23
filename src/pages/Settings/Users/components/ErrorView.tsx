
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ErrorViewProps {
  error: Error | unknown;
}

export default function ErrorView({ error }: ErrorViewProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <h2 className="text-xl font-medium mb-2">Error Loading Users</h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "You may not have permission to view users"}
          </p>
          <pre className="mt-4 text-xs text-left bg-muted p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(error, null, 2)}
          </pre>
          
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
