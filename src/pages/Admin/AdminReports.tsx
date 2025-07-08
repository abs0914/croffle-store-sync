
import React, { useState } from 'react';
import { AdminReportsHeader } from './components/AdminReportsHeader';
import { AdminReportsMetrics } from './components/AdminReportsMetrics';
import { AdminReportsContent } from './components/AdminReportsContent';
import { useAdminReportsData } from './hooks/useAdminReportsData';

export default function AdminReports() {
  const [reportType, setReportType] = useState<'sales' | 'profit-loss' | 'expenses'>('sales');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [storeFilter, setStoreFilter] = useState('all');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'company_owned' | 'franchise'>('all');
  
  const {
    reportData,
    reportMetrics,
    stores,
    isLoading,
    refreshReports
  } = useAdminReportsData(reportType, dateRange, storeFilter, ownershipFilter);

  return (
    <div className="space-y-6">
      <AdminReportsHeader 
        reportType={reportType}
        setReportType={setReportType}
        dateRange={dateRange}
        setDateRange={setDateRange}
        storeFilter={storeFilter}
        setStoreFilter={setStoreFilter}
        ownershipFilter={ownershipFilter}
        setOwnershipFilter={setOwnershipFilter}
        stores={stores}
        onRefresh={refreshReports}
      />
      
      <AdminReportsMetrics 
        metrics={reportMetrics}
        reportType={reportType}
      />
      
      <AdminReportsContent
        reportData={reportData}
        reportType={reportType}
        isLoading={isLoading}
        stores={stores}
      />
    </div>
  );
}
