
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReportLoadingStateProps {
  message?: string;
}

export function ReportLoadingState({ message = "Loading report data..." }: ReportLoadingStateProps) {
  const isMobile = useIsMobile();
  
  return (
    <Card>
      <CardContent className={`${isMobile ? 'h-[300px]' : 'h-[400px]'} flex flex-col`}>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <Spinner className="h-8 w-8 text-croffle-accent" />
          <p className="text-muted-foreground">{message}</p>
          
          <div className="w-full max-w-md mt-4 space-y-3">
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <div className="flex justify-between gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="h-32 w-full mt-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
