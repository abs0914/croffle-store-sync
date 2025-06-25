
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, Store } from '@/types';

interface ReportMetrics {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  topSellingProduct: string;
  revenueGrowth: number;
}

export const useAdminReportsData = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [reportType, setReportType] = useState('sales');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReportsData();
    fetchStores();
  }, [dateRange]);

  const fetchReportsData = async () => {
    setIsLoading(true);
    try {
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          customers:customer_id(name),
          stores:store_id(name)
        `)
        .gte('created_at', startDate.toISOString())
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (transactionsError) {
        throw transactionsError;
      }

      // Transform data to match Transaction interface
      const transformedTransactions: Transaction[] = (transactionsData || []).map((transaction: any) => ({
        id: transaction.id,
        receiptNumber: transaction.receipt_number,
        receipt_number: transaction.receipt_number,
        customer_id: transaction.customer_id,
        store_id: transaction.store_id,
        total: transaction.total,
        subtotal: transaction.subtotal,
        tax_amount: transaction.tax_amount,
        discount: transaction.discount,
        payment_method: transaction.payment_method,
        status: transaction.status,
        items: transaction.items || [],
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
        customers: transaction.customers,
        stores: transaction.stores,
      }));

      setTransactions(transformedTransactions);
    } catch (error: any) {
      console.error('Error fetching reports data:', error);
      toast.error('Failed to load reports data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw error;
      }

      // Transform database data to match Store interface
      const transformedStores: Store[] = (data || []).map((store: any) => ({
        id: store.id,
        name: store.name,
        location: store.address || store.city || 'N/A',
        phone: store.phone,
        email: store.email,
        address: store.address,
        tax_id: store.tax_id,
        logo_url: store.logo_url,
        is_active: store.is_active,
        created_at: store.created_at,
        updated_at: store.updated_at,
        location_type: store.location_type,
        region: store.region,
        logistics_zone: store.logistics_zone,
        ownership_type: store.ownership_type,
        franchise_agreement_date: store.franchise_agreement_date,
        franchise_fee_percentage: store.franchise_fee_percentage,
        franchisee_contact_info: store.franchisee_contact_info,
      }));

      setStores(transformedStores);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(transaction => 
        transaction.receiptNumber.toLowerCase().includes(query) ||
        (transaction.customers?.name && 
         transaction.customers.name.toLowerCase().includes(query))
      );
    }

    // Apply store filter
    if (storeFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.store_id === storeFilter);
    }

    return filtered;
  }, [transactions, searchQuery, storeFilter]);

  const reportMetrics: ReportMetrics = useMemo(() => {
    const totalRevenue = filteredTransactions.reduce((sum, transaction) => sum + transaction.total, 0);
    const totalTransactions = filteredTransactions.length;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Calculate top selling product (simplified)
    const productCounts: Record<string, number> = {};
    filteredTransactions.forEach(transaction => {
      transaction.items.forEach(item => {
        productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
      });
    });

    const topSellingProduct = Object.entries(productCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    // Simple revenue growth calculation (comparing current period to previous)
    const revenueGrowth = 0; // Would need more complex logic for accurate calculation

    return {
      totalRevenue,
      totalTransactions,
      averageOrderValue,
      topSellingProduct,
      revenueGrowth,
      topPerformingStore: 'N/A', // Would need store performance data
      growthRate: 0 // Would need historical data to calculate
    };
  }, [filteredTransactions]);

  return {
    transactions,
    stores,
    filteredTransactions,
    searchQuery,
    setSearchQuery,
    storeFilter,
    setStoreFilter,
    dateRange,
    setDateRange,
    reportType,
    setReportType,
    isLoading,
    refreshReports: fetchReportsData,
    reportMetrics
  };
};
