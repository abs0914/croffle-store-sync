import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { RefreshCw, FileBarChart } from "lucide-react";
import { fetchZReadingForThermal } from "@/services/reports/modules/zReadingThermalReport";
import { BIRZReadingView } from "@/components/reports/BIRZReadingView";
import { format } from "date-fns";

interface ZReadingThermalWrapperProps {
  storeId: string;
  date: Date | undefined;
}

export function ZReadingThermalWrapper({ storeId, date }: ZReadingThermalWrapperProps) {
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['z-reading-thermal', storeId, formattedDate],
    queryFn: async () => {
      console.log(`🔍 Z-Reading Thermal: Fetching data for store ${storeId.slice(0, 8)} on ${formattedDate}`);
      
      if (!storeId || storeId === '') {
        console.error('❌ Z-Reading Thermal: No valid storeId provided');
        throw new Error('Store ID is required for Z-Reading report');
      }
      
      try {
        const result = await fetchZReadingForThermal(storeId, formattedDate);
        console.log(`📊 Z-Reading Thermal: Result for ${storeId.slice(0, 8)}:`, result ? 'Data received' : 'No data');
        return result;
      } catch (error: any) {
        if (error.message?.includes('Authentication required') || error.message?.includes('no active session')) {
          console.error('❌ Z-Reading Thermal authentication error:', error);
          throw new Error('Session expired. Please refresh the page and login again.');
        }
        throw error;
      }
    },
    enabled: !!storeId && storeId !== '',
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('Authentication required') || error?.message?.includes('Session expired')) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-10 flex justify-center">
          <Spinner className="h-8 w-8 text-croffle-accent" />
        </CardContent>
      </Card>
    );
  }
  
  if (!data) {
    return (
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50/30 to-transparent">
        <CardContent className="p-8 text-center">
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-amber-100 p-4">
                <FileBarChart className="h-12 w-12 text-amber-600" />
              </div>
              
              {error ? (
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-destructive">Z-Reading Error</h3>
                  <p className="text-muted-foreground max-w-md">
                    {error instanceof Error ? error.message : 'Unable to generate Z-Reading report.'}
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                    <p className="text-sm text-red-700">
                      This could be due to authentication issues or missing transaction data.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-muted-foreground">No Z-Reading Data</h3>
                  <p className="text-muted-foreground max-w-md">
                    No transactions found for <strong>{format(new Date(formattedDate), 'MMMM dd, yyyy')}</strong>
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 space-y-2">
                    <p className="text-sm text-blue-700 font-medium">Possible reasons:</p>
                    <ul className="text-xs text-blue-600 space-y-1 text-left">
                      <li>• No transactions were completed on this date</li>
                      <li>• End-of-day process not yet completed</li>
                      <li>• Data may still be processing</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <Button variant="default" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>
              <Button variant="outline" onClick={() => history.back()}>
                Go Back
              </Button>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              <p><strong>Selected Date:</strong> {format(new Date(formattedDate), 'EEEE, MMMM dd, yyyy')}</p>
              <p><strong>Store ID:</strong> {storeId.slice(0, 8)}...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return <BIRZReadingView data={data} />;
}