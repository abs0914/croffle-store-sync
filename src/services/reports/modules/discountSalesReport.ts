
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export type DiscountType = 'senior' | 'pwd' | 'naac' | 'solo_parent';

export interface DiscountSaleTransaction {
  id: string;
  receiptNumber: string;
  date: string;
  time: string;
  customerName?: string;
  idNumber?: string;
  grossSales: number;
  discountAmount: number;
  vatExemptSales: number;
  vatAmount: number;
  netSales: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    amount: number;
  }>;
}

export interface DiscountSalesReport {
  discountType: DiscountType;
  discountLabel: string;
  discountPercentage: number;
  dateRange: { from: string; to: string };
  storeName: string;
  storeAddress: string;
  tin: string;
  transactions: DiscountSaleTransaction[];
  summary: {
    totalTransactions: number;
    totalGrossSales: number;
    totalDiscountAmount: number;
    totalVatExemptSales: number;
    totalVatAmount: number;
    totalNetSales: number;
  };
}

const DISCOUNT_CONFIG: Record<DiscountType, { label: string; percentage: number; dbValues: string[] }> = {
  senior: { 
    label: 'Senior Citizen', 
    percentage: 20, 
    dbValues: ['senior', 'senior_citizen', 'Senior Citizen'] 
  },
  pwd: { 
    label: 'Person with Disability (PWD)', 
    percentage: 20, 
    dbValues: ['pwd', 'PWD', 'Person with Disability'] 
  },
  naac: { 
    label: 'National Athletes and Coaches', 
    percentage: 20, 
    dbValues: ['naac', 'athletes_coaches', 'National Athletes & Coaches', 'national_athletes'] 
  },
  solo_parent: { 
    label: 'Solo Parent', 
    percentage: 20, 
    dbValues: ['solo_parent', 'Solo Parent', 'soloparent'] 
  },
};

export async function fetchDiscountSalesReport(
  storeId: string,
  discountType: DiscountType,
  from: string,
  to: string
): Promise<DiscountSalesReport | null> {
  try {
    const config = DISCOUNT_CONFIG[discountType];
    
    // Fetch store info
    const { data: storeData } = await supabase
      .from('stores')
      .select('name, address')
      .eq('id', storeId)
      .single();

    // Fetch BIR config for TIN
    const { data: birConfig } = await supabase
      .from('bir_store_config')
      .select('tin')
      .eq('store_id', storeId)
      .single();

    // Fetch transactions with this discount type
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
      .eq('status', 'completed')
      .or(config.dbValues.map(v => `discount_type.eq.${v}`).join(','))
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching discount sales:', error);
      return null;
    }

    // Process transactions
    const processedTransactions: DiscountSaleTransaction[] = (transactions || []).map(t => {
      const createdAt = new Date(t.created_at);
      const items = Array.isArray(t.items) ? t.items : [];
      const discountDetails = t.discount_details as any;
      
      return {
        id: t.id,
        receiptNumber: t.receipt_number || '',
        date: format(createdAt, 'MM/dd/yyyy'),
        time: format(createdAt, 'HH:mm:ss'),
        customerName: discountDetails?.customerName || discountDetails?.name || '',
        idNumber: t.discount_id_number || discountDetails?.idNumber || '',
        grossSales: t.subtotal || 0,
        discountAmount: t.discount_amount || t.discount || 0,
        vatExemptSales: t.vat_exempt_sales || 0,
        vatAmount: t.vat_amount || 0,
        netSales: t.total || 0,
        items: items.map((item: any) => ({
          name: item.name || item.productName || '',
          quantity: item.quantity || 1,
          price: item.price || 0,
          amount: (item.price || 0) * (item.quantity || 1),
        })),
      };
    });

    // Calculate summary
    const summary = processedTransactions.reduce(
      (acc, t) => ({
        totalTransactions: acc.totalTransactions + 1,
        totalGrossSales: acc.totalGrossSales + t.grossSales,
        totalDiscountAmount: acc.totalDiscountAmount + t.discountAmount,
        totalVatExemptSales: acc.totalVatExemptSales + t.vatExemptSales,
        totalVatAmount: acc.totalVatAmount + t.vatAmount,
        totalNetSales: acc.totalNetSales + t.netSales,
      }),
      {
        totalTransactions: 0,
        totalGrossSales: 0,
        totalDiscountAmount: 0,
        totalVatExemptSales: 0,
        totalVatAmount: 0,
        totalNetSales: 0,
      }
    );

    return {
      discountType,
      discountLabel: config.label,
      discountPercentage: config.percentage,
      dateRange: { from, to },
      storeName: storeData?.name || 'Unknown Store',
      storeAddress: storeData?.address || '',
      tin: birConfig?.tin || '',
      transactions: processedTransactions,
      summary,
    };
  } catch (error) {
    console.error('Error in fetchDiscountSalesReport:', error);
    return null;
  }
}

export interface BIRSalesSummary {
  dateRange: { from: string; to: string };
  storeName: string;
  storeAddress: string;
  tin: string;
  grossSales: number;
  netSales: number;
  vatableSales: number;
  vatExemptSales: number;
  vatZeroRatedSales: number;
  vatAmount: number;
  totalDiscounts: number;
  discountBreakdown: {
    senior: { count: number; amount: number };
    pwd: { count: number; amount: number };
    naac: { count: number; amount: number };
    soloParent: { count: number; amount: number };
    regular: { count: number; amount: number };
    other: { count: number; amount: number };
  };
  transactionCount: number;
  voidCount: number;
  voidAmount: number;
  refundCount: number;
  refundAmount: number;
  dailyBreakdown: Array<{
    date: string;
    grossSales: number;
    netSales: number;
    vatAmount: number;
    discountAmount: number;
    transactionCount: number;
  }>;
}

export async function fetchBIRSalesSummary(
  storeId: string,
  from: string,
  to: string
): Promise<BIRSalesSummary | null> {
  try {
    // Fetch store info
    const { data: storeData } = await supabase
      .from('stores')
      .select('name, address')
      .eq('id', storeId)
      .single();

    // Fetch BIR config
    const { data: birConfig } = await supabase
      .from('bir_store_config')
      .select('tin')
      .eq('store_id', storeId)
      .single();

    // Fetch all transactions in the date range
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching transactions:', error);
      return null;
    }

    // Fetch void transactions
    const { data: voidTransactions } = await supabase
      .from('deleted_transactions_backup')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`);

    // Fetch refunds
    const { data: refunds } = await supabase
      .from('refunds')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`);

    // Process completed transactions only
    const completedTransactions = (transactions || []).filter(t => t.status === 'completed');

    // Calculate discount breakdown
    const discountBreakdown = {
      senior: { count: 0, amount: 0 },
      pwd: { count: 0, amount: 0 },
      naac: { count: 0, amount: 0 },
      soloParent: { count: 0, amount: 0 },
      regular: { count: 0, amount: 0 },
      other: { count: 0, amount: 0 },
    };

    completedTransactions.forEach(t => {
      const discountType = t.discount_type?.toLowerCase() || '';
      const discountAmount = t.discount_amount || t.discount || 0;

      if (['senior', 'senior_citizen'].includes(discountType)) {
        discountBreakdown.senior.count++;
        discountBreakdown.senior.amount += discountAmount;
      } else if (['pwd'].includes(discountType)) {
        discountBreakdown.pwd.count++;
        discountBreakdown.pwd.amount += discountAmount;
      } else if (['naac', 'athletes_coaches', 'national_athletes'].includes(discountType)) {
        discountBreakdown.naac.count++;
        discountBreakdown.naac.amount += discountAmount;
      } else if (['solo_parent', 'soloparent'].includes(discountType)) {
        discountBreakdown.soloParent.count++;
        discountBreakdown.soloParent.amount += discountAmount;
      } else if (['regular'].includes(discountType)) {
        discountBreakdown.regular.count++;
        discountBreakdown.regular.amount += discountAmount;
      } else if (discountAmount > 0) {
        discountBreakdown.other.count++;
        discountBreakdown.other.amount += discountAmount;
      }
    });

    // Calculate daily breakdown
    const dailyMap = new Map<string, {
      grossSales: number;
      netSales: number;
      vatAmount: number;
      discountAmount: number;
      transactionCount: number;
    }>();

    completedTransactions.forEach(t => {
      const date = format(new Date(t.created_at), 'yyyy-MM-dd');
      const existing = dailyMap.get(date) || {
        grossSales: 0,
        netSales: 0,
        vatAmount: 0,
        discountAmount: 0,
        transactionCount: 0,
      };

      dailyMap.set(date, {
        grossSales: existing.grossSales + (t.subtotal || 0),
        netSales: existing.netSales + (t.total || 0),
        vatAmount: existing.vatAmount + (t.vat_amount || 0),
        discountAmount: existing.discountAmount + (t.discount_amount || t.discount || 0),
        transactionCount: existing.transactionCount + 1,
      });
    });

    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate totals
    const totals = completedTransactions.reduce(
      (acc, t) => ({
        grossSales: acc.grossSales + (t.subtotal || 0),
        netSales: acc.netSales + (t.total || 0),
        vatableSales: acc.vatableSales + (t.vat_sales || 0),
        vatExemptSales: acc.vatExemptSales + (t.vat_exempt_sales || 0),
        vatZeroRatedSales: acc.vatZeroRatedSales + (t.zero_rated_sales || 0),
        vatAmount: acc.vatAmount + (t.vat_amount || 0),
        totalDiscounts: acc.totalDiscounts + (t.discount_amount || t.discount || 0),
      }),
      {
        grossSales: 0,
        netSales: 0,
        vatableSales: 0,
        vatExemptSales: 0,
        vatZeroRatedSales: 0,
        vatAmount: 0,
        totalDiscounts: 0,
      }
    );

    // Calculate void and refund totals
    const voidAmount = (voidTransactions || []).reduce((sum, t) => sum + (t.total || 0), 0);
    const refundAmount = (refunds || []).reduce((sum, r) => sum + (r.refund_amount || 0), 0);

    return {
      dateRange: { from, to },
      storeName: storeData?.name || 'Unknown Store',
      storeAddress: storeData?.address || '',
      tin: birConfig?.tin || '',
      ...totals,
      discountBreakdown,
      transactionCount: completedTransactions.length,
      voidCount: (voidTransactions || []).length,
      voidAmount,
      refundCount: (refunds || []).length,
      refundAmount,
      dailyBreakdown,
    };
  } catch (error) {
    console.error('Error in fetchBIRSalesSummary:', error);
    return null;
  }
}
