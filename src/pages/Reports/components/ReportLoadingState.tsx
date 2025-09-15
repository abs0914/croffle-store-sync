
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { FileBarChart, Database } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReportLoadingStateProps {
  message?: string;
}

export function ReportLoadingState({ message = "Loading report data..." }: ReportLoadingStateProps) {
  const isMobile = useIsMobile();
  
  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50/30 to-transparent">
      <CardContent className={`${isMobile ? 'p-4' : 'p-8'}`}>
        <div className="text-center mb-6">
          <div className="flex justify-center items-center mb-4">
            <div className="relative">
              <div className="rounded-full bg-blue-100 p-3">
                <FileBarChart className="h-8 w-8 text-blue-600" />
              </div>
              <div className="absolute -bottom-1 -right-1">
                <div className="rounded-full bg-white p-1 shadow-sm">
                  <Spinner className="h-3 w-3 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Loading Report</h3>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg mb-6">
          <Database className="h-4 w-4 text-blue-600" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Fetching data</span>
              <Spinner className="h-3 w-3" />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{ width: '65%' }}></div>
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
          </div>

          {!isMobile && (
            <div className="mt-6">
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Processing your request...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
