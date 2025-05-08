
import { useState, useCallback } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { ReportHeader } from './components/ReportHeader';
import { DateRangeSelector } from './components/DateRangeSelector';
import { ReportsNavigation } from './components/ReportsNavigation';
import { ReportContent } from './components/ReportContent';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Store } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export type ReportType = 'sales' | 'inventory' | 'profit_loss' | 'x_reading' | 'z_reading' | 'daily_summary' | 'vat' | 'cashier';

export default function Reports() {
  const { currentStore, isLoading: storeLoading } = useStore();
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(),
    to: new Date(),
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isMobile = useIsMobile();

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Handle store loading state
  if (storeLoading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Reports</h1>
        <Progress value={30} className="w-full mb-4" />
        <p className="text-muted-foreground">Loading store information...</p>
      </div>
    );
  }

  // Handle no store selected state
  if (!currentStore) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Reports</h1>
        <Alert>
          <Store className="h-4 w-4" />
          <AlertTitle>No store selected</AlertTitle>
          <AlertDescription>
            Please select a store from the sidebar before viewing reports.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 space-y-4 sm:space-y-6">
      <ReportHeader 
        storeId={currentStore.id}
        reportType={reportType}
      />
      
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Responsive sidebar with toggle for mobile */}
        <div className={`${isMobile && !isSidebarOpen ? 'hidden' : 'block'} 
                         w-full lg:w-64 transition-all duration-300`}>
          <ReportsNavigation 
            activeReport={reportType} 
            onSelectReport={setReportType}
          />
          
          {isMobile && (
            <Button 
              variant="ghost"
              className="w-full mt-2"
              onClick={toggleSidebar}
              aria-label="Close navigation menu"
            >
              Close Menu
            </Button>
          )}
        </div>
        
        {/* Main content area */}
        <div className="flex-1 space-y-4">
          {/* Sidebar toggle for mobile */}
          {isMobile && !isSidebarOpen && (
            <Button 
              variant="outline" 
              className="mb-2"
              onClick={toggleSidebar}
              aria-label="Open navigation menu"
            >
              Open Report Menu
            </Button>
          )}
          
          <Card>
            <CardContent className="p-4">
              <DateRangeSelector 
                dateRange={dateRange} 
                setDateRange={setDateRange}
                reportType={reportType}
              />
            </CardContent>
          </Card>

          <ReportContent 
            reportType={reportType}
            storeId={currentStore.id} 
            dateRange={dateRange}
          />
        </div>
      </div>
    </div>
  );
}
