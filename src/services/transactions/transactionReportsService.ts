import { supabase } from "@/integrations/supabase/client";

export interface TransactionWithItems {
  id: string;
  receiptNumber: string;
  storeId: string;
  customerId?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: TransactionItemDetail[];
}

export interface TransactionItemDetail {
  id: string;
  productId: string;
  variationId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  categoryId?: string;
  categoryName?: string;
  productType: string;
}

/**
 * Fetches transactions with detailed item information including categories
 */
export const fetchTransactionsWithItems = async (
  storeId: string,
  startDate?: string,
  endDate?: string,
  limit = 100
): Promise<TransactionWithItems[]> => {
  let query = supabase
    .from('transactions')
    .select(`
      id,
      receipt_number,
      store_id,
      customer_id,
      subtotal,
      tax,
      discount,
      total,
      payment_method,
      status,
      created_at,
      transaction_items (
        id,
        product_id,
        variation_id,
        name,
        quantity,
        unit_price,
        total_price,
        category_id,
        category_name,
        product_type
      )
    `)
    .eq('store_id', storeId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching transactions with items:', error);
    throw new Error('Failed to fetch transaction data');
  }

  return data?.map(transaction => ({
    id: transaction.id,
    receiptNumber: transaction.receipt_number,
    storeId: transaction.store_id,
    customerId: transaction.customer_id,
    subtotal: transaction.subtotal,
    tax: transaction.tax,
    discount: transaction.discount,
    total: transaction.total,
    paymentMethod: transaction.payment_method,
    status: transaction.status,
    createdAt: transaction.created_at,
    items: transaction.transaction_items?.map(item => ({
      id: item.id,
      productId: item.product_id,
      variationId: item.variation_id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      categoryId: item.category_id,
      categoryName: item.category_name,
      productType: item.product_type
    })) || []
  })) || [];
};

/**
 * Fetches sales data by category for analytics
 */
export const fetchSalesByCategory = async (
  storeId: string,
  startDate?: string,
  endDate?: string
): Promise<{ categoryName: string; totalSales: number; totalQuantity: number; categoryId?: string }[]> => {
  let query = supabase
    .from('transaction_items')
    .select(`
      category_id,
      category_name,
      total_price,
      quantity,
      transactions!inner (
        store_id,
        status,
        created_at
      )
    `)
    .eq('transactions.store_id', storeId)
    .eq('transactions.status', 'completed');

  if (startDate) {
    query = query.gte('transactions.created_at', startDate);
  }
  
  if (endDate) {
    query = query.lte('transactions.created_at', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching sales by category:', error);
    throw new Error('Failed to fetch category sales data');
  }

  // Group by category and sum the values
  const categoryMap = new Map<string, { totalSales: number; totalQuantity: number; categoryId?: string }>();

  data?.forEach(item => {
    const categoryKey = item.category_name || 'Uncategorized';
    const existing = categoryMap.get(categoryKey) || { totalSales: 0, totalQuantity: 0 };
    
    categoryMap.set(categoryKey, {
      totalSales: existing.totalSales + (item.total_price || 0),
      totalQuantity: existing.totalQuantity + (item.quantity || 0),
      categoryId: item.category_id || existing.categoryId
    });
  });

  return Array.from(categoryMap.entries()).map(([categoryName, data]) => ({
    categoryName,
    ...data
  }));
};

/**
 * Fetches top-selling products with category information
 */
export const fetchTopSellingProducts = async (
  storeId: string,
  startDate?: string,
  endDate?: string,
  limit = 10
): Promise<{ productName: string; categoryName: string; totalSales: number; totalQuantity: number }[]> => {
  let query = supabase
    .from('transaction_items')
    .select(`
      name,
      category_name,
      total_price,
      quantity,
      transactions!inner (
        store_id,
        status,
        created_at
      )
    `)
    .eq('transactions.store_id', storeId)
    .eq('transactions.status', 'completed');

  if (startDate) {
    query = query.gte('transactions.created_at', startDate);
  }
  
  if (endDate) {
    query = query.lte('transactions.created_at', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching top selling products:', error);
    throw new Error('Failed to fetch top selling products data');
  }

  // Group by product name and sum the values
  const productMap = new Map<string, { categoryName: string; totalSales: number; totalQuantity: number }>();

  data?.forEach(item => {
    const productKey = item.name;
    const existing = productMap.get(productKey) || { categoryName: item.category_name || 'Uncategorized', totalSales: 0, totalQuantity: 0 };
    
    productMap.set(productKey, {
      categoryName: existing.categoryName,
      totalSales: existing.totalSales + (item.total_price || 0),
      totalQuantity: existing.totalQuantity + (item.quantity || 0)
    });
  });

  return Array.from(productMap.entries())
    .map(([productName, data]) => ({
      productName,
      ...data
    }))
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, limit);
};