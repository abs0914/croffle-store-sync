
import { useState } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { ReportHeader } from './components/ReportHeader';
import { DateRangeSelector } from './components/DateRangeSelector';
import { ReportsNavigation } from './components/ReportsNavigation';
import { ReportContent } from './components/ReportContent';
import { Card, CardContent } from '@/components/ui/card';

export type ReportType = 'sales' | 'inventory' | 'profit_loss' | 'x_reading' | 'z_reading' | 'daily_summary' | 'vat' | 'cashier';

export default function Reports() {
  const { currentStore, isLoading } = useStore();
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(),
    to: new Date(),
  });

  if (!currentStore) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Reports</h1>
        <p>Please select a store first</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <ReportHeader 
        storeId={currentStore.id}
        reportType={reportType}
      />
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-64">
          <ReportsNavigation 
            activeReport={reportType} 
            onSelectReport={setReportType}
          />
        </div>
        
        <div className="flex-1 space-y-4">
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
