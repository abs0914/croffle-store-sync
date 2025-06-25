
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, Store, ReportMetrics } from '@/types';
import { toast } from 'sonner';

export function useAdminReportsData() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [storeFilter, setStoreFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch transactions and stores in parallel
      const [transactionsResponse, storesResponse] = await Promise.all([
        supabase
          .from('transactions')
          .select(`
            *,
            customers(name),
            stores(name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('stores')
          .select('*')
          .order('name')
      ]);

      if (transactionsResponse.error) throw transactionsResponse.error;
      if (storesResponse.error) throw storesResponse.error;

      // Transform transactions to match Transaction interface
      const transformedTransactions: Transaction[] = (transactionsResponse.data || []).map((tx: any) => ({
        id: tx.id,
        receiptNumber: tx.receipt_number,
        receipt_number: tx.receipt_number,
        customer_id: tx.customer_id,
        store_id: tx.store_id,
        total: tx.total,
        subtotal: tx.subtotal,
        tax_amount: tx.tax_amount,
        discount: tx.discount,
        payment_method: tx.payment_method,
        status: tx.status,
        items: tx.items || [],
        created_at: tx.created_at,
        updated_at: tx.updated_at,
        customers: tx.customers,
        stores: tx.stores
      }));

      // Transform store data to match Store interface
      const transformedStores: Store[] = (storesResponse.data || []).map((store: any) => ({
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

      setTransactions(transformedTransactions);
      setStores(transformedStores);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to fetch report data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(transaction => 
        transaction.receiptNumber.toLowerCase().includes(query) ||
        (transaction.customers?.name && transaction.customers.name.toLowerCase().includes(query)) ||
        (transaction.stores?.name && transaction.stores.name.toLowerCase().includes(query))
      );
    }

    // Apply store filter
    if (storeFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.store_id === storeFilter);
    }

    // Apply date range filter
    filtered = filtered.filter(transaction => {
      const transactionDate = new Date(transaction.created_at).toISOString().split('T')[0];
      return transactionDate >= dateRange.from && transactionDate <= dateRange.to;
    });

    return filtered;
  }, [transactions, searchQuery, storeFilter, dateRange]);

  const reportMetrics: ReportMetrics = useMemo(() => {
    const totalRevenue = filteredTransactions.reduce((sum, tx) => sum + tx.total, 0);
    const totalTransactions = filteredTransactions.length;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    // Find top selling product (placeholder logic)
    const topSellingProduct = "Mixed Berry Croffle";
    
    // Calculate revenue growth (placeholder - would need historical data)
    const revenueGrowth = 12.5;
    
    // Find top performing store
    const storePerformance = stores.map(store => {
      const storeTransactions = filteredTransactions.filter(tx => tx.store_id === store.id);
      const storeRevenue = storeTransactions.reduce((sum, tx) => sum + tx.total, 0);
      return { store: store.name, revenue: storeRevenue };
    });
    
    const topPerformingStore = storePerformance.length > 0 
      ? storePerformance.reduce((top, current) => current.revenue > top.revenue ? current : top).store
      : "N/A";
    
    const growthRate = 8.3; // Placeholder growth rate

    return {
      totalRevenue,
      totalTransactions,
      averageOrderValue,
      topSellingProduct,
      revenueGrowth,
      topPerformingStore,
      growthRate
    };
  }, [filteredTransactions, stores]);

  const refreshReports = () => fetchData();

  return {
    transactions,
    stores,
    filteredTransactions,
    searchQuery,
    setSearchQuery,
    dateRange,
    setDateRange,
    storeFilter,
    setStoreFilter,
    isLoading,
    refreshReports,
    reportMetrics,
  };
}
