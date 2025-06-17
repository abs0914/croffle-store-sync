
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Download, Calendar, TrendingUp } from 'lucide-react';
import { Store } from '@/types';

interface AdminReportsHeaderProps {
  reportType: 'sales' | 'inventory' | 'customers' | 'performance';
  setReportType: (type: 'sales' | 'inventory' | 'customers' | 'performance') => void;
  dateRange: { from: string; to: string };
  setDateRange: (range: { from: string; to: string }) => void;
  storeFilter: string;
  setStoreFilter: (storeId: string) => void;
  stores: Store[];
  onRefresh: () => void;
}

export const AdminReportsHeader: React.FC<AdminReportsHeaderProps> = ({
  reportType,
  setReportType,
  dateRange,
  setDateRange,
  storeFilter,
  setStoreFilter,
  stores,
  onRefresh
}) => {
  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export report:', reportType);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Analytics & Reports
            </CardTitle>
            <CardDescription>
              Comprehensive analytics across all stores and operations
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs value={reportType} onValueChange={(value) => setReportType(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sales">Sales Analytics</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Analytics</TabsTrigger>
            <TabsTrigger value="customers">Customer Analytics</TabsTrigger>
            <TabsTrigger value="performance">Performance Analytics</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Date Range:</span>
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-auto"
            />
            <span className="text-sm text-gray-500">to</span>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="w-auto"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Store:</span>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
