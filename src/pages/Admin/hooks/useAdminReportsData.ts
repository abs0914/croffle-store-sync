
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Store } from '@/types';
import { fetchExpenseReport } from './useExpenseReportData';

interface ReportMetrics {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  topPerformingStore: string;
  growthRate: number;
  totalCustomers?: number;
  totalProducts?: number;
  lowStockItems?: number;
}

interface SalesReportData {
  storeBreakdown: Array<{
    storeId: string;
    storeName: string;
    revenue: number;
    transactions: number;
    averageOrderValue: number;
    percentage: number;
  }>;
  dailyTrends: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
  topProducts: Array<{
    productName: string;
    revenue: number;
    quantitySold: number;
  }>;
}

interface InventoryReportData {
  storeBreakdown: Array<{
    storeId: string;
    storeName: string;
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    inventoryValue: number;
  }>;
  lowStockItems: Array<{
    productName: string;
    storeName: string;
    currentStock: number;
    minThreshold: number;
  }>;
}

interface CustomerReportData {
  storeBreakdown: Array<{
    storeId: string;
    storeName: string;
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    averageLifetimeValue: number;
  }>;
  customerGrowth: Array<{
    date: string;
    newCustomers: number;
    totalCustomers: number;
  }>;
}

interface PerformanceReportData {
  storePerformance: Array<{
    storeId: string;
    storeName: string;
    revenue: number;
    transactions: number;
    customers: number;
    products: number;
    efficiency: number;
  }>;
  trends: Array<{
    date: string;
    efficiency: number;
    revenue: number;
  }>;
}

type ReportData = SalesReportData | InventoryReportData | CustomerReportData | PerformanceReportData;

export const useAdminReportsData = (
  reportType: 'sales' | 'customers' | 'expenses',
  dateRange: { from: string; to: string },
  storeFilter: string,
  ownershipFilter: 'all' | 'company_owned' | 'franchise'
) => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [reportType, dateRange, storeFilter, ownershipFilter]);

  const fetchStores = async () => {
    try {
      let query = supabase
        .from('stores')
        .select('*')
        .eq('is_active', true);

      if (ownershipFilter !== 'all') {
        query = query.eq('ownership_type', ownershipFilter);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      setStores(data as Store[] || []);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    }
  };

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      switch (reportType) {
        case 'sales':
          await fetchSalesReport();
          break;
        case 'customers':
          await fetchCustomerReport();
          break;
        case 'expenses':
          await fetchExpenseReportData();
          break;
      }
    } catch (error: any) {
      console.error('Error fetching report data:', error);
      toast.error(`Failed to load ${reportType} report`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSalesReport = async () => {
    let filteredStores = stores;
    if (ownershipFilter !== 'all') {
      filteredStores = stores.filter(s => s.ownership_type === (ownershipFilter === 'franchise' ? 'franchisee' : ownershipFilter));
    }
    const storeIds = storeFilter === 'all' ? filteredStores.map(s => s.id) : [storeFilter];
    
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        stores:store_id(name)
      `)
      .in('store_id', storeIds)
      .gte('created_at', `${dateRange.from}T00:00:00`)
      .lte('created_at', `${dateRange.to}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Process sales data
    const storeBreakdown = stores.map(store => {
      const storeTransactions = transactions?.filter(t => t.store_id === store.id) || [];
      const revenue = storeTransactions.reduce((sum, t) => sum + t.total, 0);
      const transactionCount = storeTransactions.length;
      
      return {
        storeId: store.id,
        storeName: store.name,
        revenue,
        transactions: transactionCount,
        averageOrderValue: transactionCount > 0 ? revenue / transactionCount : 0,
        percentage: 0 // Will calculate after
      };
    });

    const totalRevenue = storeBreakdown.reduce((sum, s) => sum + s.revenue, 0);
    storeBreakdown.forEach(store => {
      store.percentage = totalRevenue > 0 ? (store.revenue / totalRevenue) * 100 : 0;
    });

    // Daily trends
    const dailyTrends = generateDailyTrends(transactions || [], dateRange);

    // Top products (simplified - using transaction items)
    const topProducts = generateTopProducts(transactions || []);

    // Ownership breakdown
    const ownershipBreakdown = [
      {
        ownershipType: 'Company Owned',
        revenue: storeBreakdown
          .filter(s => stores.find(st => st.id === s.storeId)?.ownership_type === 'company_owned')
          .reduce((sum, s) => sum + s.revenue, 0)
      },
      {
        ownershipType: 'Franchise',
        revenue: storeBreakdown
          .filter(s => stores.find(st => st.id === s.storeId)?.ownership_type === 'franchisee')
          .reduce((sum, s) => sum + s.revenue, 0)
      }
    ];

    setReportData({
      storeBreakdown,
      dailyTrends,
      topProducts,
      ownershipBreakdown
    } as SalesReportData);
  };

  const fetchExpenseReportData = async () => {
    try {
      const expenseData = await fetchExpenseReport(stores, dateRange, storeFilter, ownershipFilter);
      setReportData(expenseData as any);
    } catch (error) {
      console.error('Error fetching expense report:', error);
      throw error;
    }
  };

  const fetchCustomerReport = async () => {
    let filteredStores = stores;
    if (ownershipFilter !== 'all') {
      filteredStores = stores.filter(s => s.ownership_type === (ownershipFilter === 'franchise' ? 'franchisee' : ownershipFilter));
    }
    const storeIds = storeFilter === 'all' ? filteredStores.map(s => s.id) : [storeFilter];
    
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select(`
        *,
        stores:store_id(name)
      `)
      .in('store_id', storeIds);

    if (customersError) throw customersError;

    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('customer_id, total, created_at, store_id')
      .in('store_id', storeIds)
      .gte('created_at', `${dateRange.from}T00:00:00`)
      .lte('created_at', `${dateRange.to}T23:59:59`);

    if (transactionsError) throw transactionsError;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const storeBreakdown = stores.map(store => {
      const storeCustomers = customers?.filter(c => c.store_id === store.id) || [];
      const storeTransactions = transactions?.filter(t => t.store_id === store.id) || [];
      
      const activeCustomers = storeCustomers.filter(c => 
        storeTransactions.some(t => t.customer_id === c.id && new Date(t.created_at) > thirtyDaysAgo)
      ).length;

      const newCustomers = storeCustomers.filter(c => 
        new Date(c.created_at!) > new Date(dateRange.from)
      ).length;

      const totalSpent = storeTransactions.reduce((sum, t) => sum + t.total, 0);
      const averageLifetimeValue = storeCustomers.length > 0 ? totalSpent / storeCustomers.length : 0;

      return {
        storeId: store.id,
        storeName: store.name,
        totalCustomers: storeCustomers.length,
        activeCustomers,
        newCustomers,
        averageLifetimeValue
      };
    });

    const customerGrowth = generateCustomerGrowth(customers || [], dateRange);

    setReportData({
      storeBreakdown,
      customerGrowth
    } as CustomerReportData);
  };


  const reportMetrics: ReportMetrics = useMemo(() => {
    if (!reportData) return {
      totalRevenue: 0,
      totalTransactions: 0,
      averageOrderValue: 0,
      topPerformingStore: '',
      growthRate: 0
    };

    switch (reportType) {
      case 'sales': {
        const data = reportData as SalesReportData;
        const totalRevenue = data.storeBreakdown.reduce((sum, s) => sum + s.revenue, 0);
        const totalTransactions = data.storeBreakdown.reduce((sum, s) => sum + s.transactions, 0);
        const topStore = data.storeBreakdown.reduce((top, store) => 
          store.revenue > top.revenue ? store : top, data.storeBreakdown[0] || { storeName: '', revenue: 0 }
        );
        
        return {
          totalRevenue,
          totalTransactions,
          averageOrderValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
          topPerformingStore: topStore.storeName,
          growthRate: calculateGrowthRate(data.dailyTrends)
        };
      }
      case 'expenses': {
        const data = reportData as any;
        const totalExpenses = data.storeBreakdown.reduce((sum: number, s: any) => sum + s.totalExpenses, 0);
        const topStore = data.storeBreakdown.reduce((top: any, store: any) => 
          store.totalExpenses > top.totalExpenses ? store : top, data.storeBreakdown[0] || { storeName: '', totalExpenses: 0 }
        );
        
        return {
          totalRevenue: totalExpenses,
          totalTransactions: data.storeBreakdown.reduce((sum: number, s: any) => sum + s.expenseCount, 0),
          averageOrderValue: 0,
          topPerformingStore: topStore.storeName,
          growthRate: 0
        };
      }
      case 'customers': {
        const data = reportData as CustomerReportData;
        const totalCustomers = data.storeBreakdown.reduce((sum, s) => sum + s.totalCustomers, 0);
        const totalRevenue = data.storeBreakdown.reduce((sum, s) => sum + (s.averageLifetimeValue * s.totalCustomers), 0);
        const topStore = data.storeBreakdown.reduce((top, store) => 
          store.totalCustomers > top.totalCustomers ? store : top, data.storeBreakdown[0] || { storeName: '', totalCustomers: 0 }
        );
        
        return {
          totalRevenue,
          totalTransactions: 0,
          averageOrderValue: totalCustomers > 0 ? totalRevenue / totalCustomers : 0,
          topPerformingStore: topStore.storeName,
          growthRate: calculateCustomerGrowthRate(data.customerGrowth),
          totalCustomers
        };
      }
      default:
        return {
          totalRevenue: 0,
          totalTransactions: 0,
          averageOrderValue: 0,
          topPerformingStore: '',
          growthRate: 0
        };
    }
  }, [reportData, reportType]);

  return {
    reportData,
    reportMetrics,
    stores,
    isLoading,
    refreshReports: fetchReportData
  };
};

// Helper functions
const generateDailyTrends = (transactions: any[], dateRange: { from: string; to: string }) => {
  const days = [];
  const start = new Date(dateRange.from);
  const end = new Date(dateRange.to);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayTransactions = transactions.filter(t => 
      t.created_at.startsWith(dateStr)
    );
    
    days.push({
      date: dateStr,
      revenue: dayTransactions.reduce((sum, t) => sum + t.total, 0),
      transactions: dayTransactions.length
    });
  }
  
  return days;
};

const generateTopProducts = (transactions: any[]) => {
  const productMap = new Map();
  
  transactions.forEach(transaction => {
    if (transaction.items) {
      transaction.items.forEach((item: any) => {
        const key = item.name || 'Unknown Product';
        if (productMap.has(key)) {
          const existing = productMap.get(key);
          existing.revenue += item.price * item.quantity;
          existing.quantitySold += item.quantity;
        } else {
          productMap.set(key, {
            productName: key,
            revenue: item.price * item.quantity,
            quantitySold: item.quantity
          });
        }
      });
    }
  });
  
  return Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
};

const generateCustomerGrowth = (customers: any[], dateRange: { from: string; to: string }) => {
  const days = [];
  const start = new Date(dateRange.from);
  const end = new Date(dateRange.to);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const newCustomers = customers.filter(c => 
      c.created_at && c.created_at.startsWith(dateStr)
    ).length;
    
    const totalCustomers = customers.filter(c => 
      c.created_at && new Date(c.created_at) <= d
    ).length;
    
    days.push({
      date: dateStr,
      newCustomers,
      totalCustomers
    });
  }
  
  return days;
};

const generatePerformanceTrends = (transactions: any[], dateRange: { from: string; to: string }) => {
  const dailyData = generateDailyTrends(transactions, dateRange);
  
  return dailyData.map(day => ({
    date: day.date,
    efficiency: day.transactions > 0 ? day.revenue / day.transactions : 0,
    revenue: day.revenue
  }));
};

const calculateGrowthRate = (dailyTrends: any[]) => {
  if (dailyTrends.length < 2) return 0;
  
  const firstHalf = dailyTrends.slice(0, Math.floor(dailyTrends.length / 2));
  const secondHalf = dailyTrends.slice(Math.floor(dailyTrends.length / 2));
  
  const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.revenue, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.revenue, 0) / secondHalf.length;
  
  return firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
};

const calculateCustomerGrowthRate = (customerGrowth: any[]) => {
  if (customerGrowth.length < 2) return 0;
  
  const start = customerGrowth[0]?.totalCustomers || 0;
  const end = customerGrowth[customerGrowth.length - 1]?.totalCustomers || 0;
  
  return start > 0 ? ((end - start) / start) * 100 : 0;
};

const calculatePerformanceGrowthRate = (trends: any[]) => {
  if (trends.length < 2) return 0;
  
  const firstHalf = trends.slice(0, Math.floor(trends.length / 2));
  const secondHalf = trends.slice(Math.floor(trends.length / 2));
  
  const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.efficiency, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.efficiency, 0) / secondHalf.length;
  
  return firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
};
