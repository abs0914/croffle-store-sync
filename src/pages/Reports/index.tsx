
import { useState, useCallback, useEffect } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/auth';
import { ReportHeader } from './components/ReportHeader';
import { DateRangeSelector } from './components/DateRangeSelector';
import { CollapsibleReportsNavigation } from './components/CollapsibleReportsNavigation';
import { ReportContent } from './components/ReportContent';
import { StoreSelector } from './components/StoreSelector';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Store } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export type ReportType = 'sales' | 'expense' | 'profit_loss' | 'product_sales' | 'x_reading' | 'z_reading' | 'bir_ejournal' | 'bir_backup' | 'void_report' | 'cashier' | 'daily_shift' | 'inventory_status';

export default function Reports() {
  const { currentStore, isLoading: storeLoading } = useStore();
  const { user } = useAuth();
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(),
    to: new Date(),
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const isMobile = useIsMobile();
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  // Set initial store selection - for non-admin users use current store, for admin users set to current store if none selected
  useEffect(() => {
    if (currentStore && !selectedStoreId) {
      if (!isAdmin) {
        // Non-admin users: automatically select their assigned store
        console.log('🏪 Reports: Setting initial store selection for non-admin:', { 
          storeId: currentStore.id.slice(0, 8), 
          storeName: currentStore.name 
        });
        setSelectedStoreId(currentStore.id);
      } else {
        // Admin users: set to current store as default to prevent empty state
        console.log('🏪 Reports: Setting default store selection for admin:', { 
          storeId: currentStore.id.slice(0, 8), 
          storeName: currentStore.name 
        });
        setSelectedStoreId(currentStore.id);
      }
    }
  }, [currentStore, isAdmin, selectedStoreId]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const handleStoreSelection = (storeId: string) => {
    console.log('📊 Reports: Store selection changed:', { 
      previousStoreId: selectedStoreId === 'all' ? 'ALL_STORES' : selectedStoreId.slice(0, 8),
      newStoreId: storeId === 'all' ? 'ALL_STORES' : storeId.slice(0, 8)
    });
    setSelectedStoreId(storeId);
  };

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
        storeId={selectedStoreId || currentStore.id}
        reportType={reportType}
        isAllStores={selectedStoreId === 'all'}
      />
      
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Responsive sidebar with toggle for mobile */}
        <div className={`${isMobile && !isSidebarOpen ? 'hidden' : 'block'} 
                         transition-all duration-300`}>
          <CollapsibleReportsNavigation 
            activeReport={reportType} 
            onSelectReport={setReportType}
            isMobile={isMobile}
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
            <CardContent className="p-4 space-y-4">
              {/* Store Selector (visible for admin users) */}
              {isAdmin && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-2 text-muted-foreground">
                    {selectedStoreId ? 'Change Store' : 'Select Store'}
                  </h3>
                  <StoreSelector
                    selectedStoreId={selectedStoreId}
                    onSelectStore={handleStoreSelection}
                  />
                </div>
              )}
              
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
            selectedStoreId={selectedStoreId || currentStore.id}
            dateRange={dateRange}
          />
        </div>
      </div>
    </div>
  );
}
