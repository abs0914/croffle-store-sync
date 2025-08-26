import { supabase } from '@/integrations/supabase/client';

export const fetchExpenseReport = async (
  stores: any[],
  dateRange: { from: string; to: string },
  storeFilter: string,
  ownershipFilter: 'all' | 'company_owned' | 'franchise'
) => {
  let filteredStores = stores;
  if (ownershipFilter !== 'all') {
    filteredStores = stores.filter(s => s.ownership_type === (ownershipFilter === 'franchise' ? 'franchisee' : ownershipFilter));
  }
  const storeIds = storeFilter === 'all' ? filteredStores.map(s => s.id) : [storeFilter];
  
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select(`
      *,
      expense_categories:category_id(name),
      stores:store_id(name, ownership_type)
    `)
    .in('store_id', storeIds)
    .gte('expense_date', dateRange.from)
    .lte('expense_date', dateRange.to)
    .order('expense_date', { ascending: false });

  if (error) throw error;

  // Category breakdown
  const categoryMap = new Map();
  (expenses || []).forEach(expense => {
    const categoryName = expense.expense_categories?.name || 'Uncategorized';
    if (categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, categoryMap.get(categoryName) + expense.amount);
    } else {
      categoryMap.set(categoryName, expense.amount);
    }
  });

  const totalExpenses = Array.from(categoryMap.values()).reduce((sum, amount) => sum + amount, 0);
  const categoryBreakdown = Array.from(categoryMap.entries()).map(([name, amount]) => ({
    name,
    amount,
    percentage: totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0
  }));

  // Ownership breakdown
  const ownershipBreakdown = [
    {
      ownershipType: 'Company Owned',
      totalExpenses: (expenses || [])
        .filter(e => e.stores?.ownership_type === 'company_owned')
        .reduce((sum, e) => sum + e.amount, 0)
    },
    {
      ownershipType: 'Franchise',
      totalExpenses: (expenses || [])
        .filter(e => e.stores?.ownership_type === 'franchisee')
        .reduce((sum, e) => sum + e.amount, 0)
    }
  ];

  // Store breakdown
  const storeBreakdown = stores.map(store => {
    const storeExpenses = (expenses || []).filter(e => e.store_id === store.id);
    const totalExpenses = storeExpenses.reduce((sum, e) => sum + e.amount, 0);
    const approvedExpenses = storeExpenses
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + e.amount, 0);
    const pendingExpenses = storeExpenses
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      storeId: store.id,
      storeName: store.name,
      ownershipType: store.ownership_type === 'company_owned' ? 'Company Owned' : 'Franchise',
      totalExpenses,
      approvedExpenses,
      pendingExpenses,
      expenseCount: storeExpenses.length
    };
  });

  // Monthly trends (simplified)
  const monthlyTrends = generateMonthlyTrends(expenses || [], dateRange);

  // Budget comparison (placeholder data)
  const budgetComparison = categoryBreakdown.map(category => ({
    category: category.name,
    budgetAmount: category.amount * 1.2, // Placeholder: 20% above actual
    actualAmount: category.amount
  }));

  return {
    categoryBreakdown,
    ownershipBreakdown,
    storeBreakdown,
    monthlyTrends,
    budgetComparison
  };
};

const generateMonthlyTrends = (expenses: any[], dateRange: { from: string; to: string }) => {
  const months = [];
  const start = new Date(dateRange.from);
  const end = new Date(dateRange.to);
  
  // Generate monthly data
  for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d.setMonth(d.getMonth() + 1)) {
    const monthStr = d.toISOString().slice(0, 7); // YYYY-MM format
    const monthExpenses = expenses.filter(e => 
      e.expense_date.startsWith(monthStr)
    );
    
    months.push({
      month: monthStr,
      totalExpenses: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
      approvedExpenses: monthExpenses
        .filter(e => e.status === 'approved')
        .reduce((sum, e) => sum + e.amount, 0)
    });
  }
  
  return months;
};