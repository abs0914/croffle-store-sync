import { supabase } from "@/integrations/supabase/client";
import { fetchProfitLossReport } from "./profitLossReport";
import { eachDayOfInterval, format, subDays, subMonths } from 'date-fns';

export interface ProfitLossStatement {
  revenue: {
    gross_sales: number;
    discounts: number;
    returns: number;
    net_sales: number;
  };
  cost_of_goods: {
    beginning_inventory: number;
    purchases: number;
    ending_inventory: number;
    total_cogs: number;
  };
  gross_profit: number;
  operating_expenses: {
    salaries: number;
    rent: number;
    utilities: number;
    marketing: number;
    other: number;
    total: number;
  };
  ebitda: number;
  depreciation: number;
  interest: number;
  tax: number;
  net_income: number;
  margins: {
    gross_margin: number;
    operating_margin: number;
    net_margin: number;
  };
}

export interface CostAnalysisReport {
  product_costs: Array<{
    product_name: string;
    material_cost: number;
    labor_cost: number;
    overhead_cost: number;
    total_cost: number;
    selling_price: number;
    margin: number;
    volume: number;
    total_profit: number;
  }>;
  cost_trends: Array<{
    date: string;
    material_cost: number;
    labor_cost: number;
    overhead_cost: number;
  }>;
  cost_breakdown: {
    materials: number;
    labor: number;
    overhead: number;
    total: number;
  };
}

export interface PerformanceBenchmark {
  store_id: string;
  store_name: string;
  metrics: {
    revenue_per_sqft: number;
    revenue_per_employee: number;
    transactions_per_day: number;
    average_order_value: number;
    customer_retention_rate: number;
    inventory_turnover: number;
    gross_margin: number;
    labor_cost_percentage: number;
  };
  ranking: {
    overall_rank: number;
    revenue_rank: number;
    efficiency_rank: number;
    profitability_rank: number;
  };
  comparison_to_average: {
    revenue_variance: number;
    margin_variance: number;
    efficiency_variance: number;
  };
}

export interface ComplianceReport {
  bir_compliance: {
    sales_reported: number;
    tax_collected: number;
    penalties: number;
    filing_status: 'compliant' | 'delayed' | 'non_compliant';
  };
  food_safety: {
    inspection_date: string;
    score: number;
    violations: string[];
    corrective_actions: string[];
  };
  labor_compliance: {
    employee_count: number;
    overtime_hours: number;
    minimum_wage_compliance: boolean;
    benefits_compliance: boolean;
  };
  environmental: {
    waste_management_score: number;
    energy_efficiency_rating: string;
    sustainability_initiatives: string[];
  };
}

export interface ExecutiveDashboard {
  kpis: {
    total_revenue: number;
    revenue_growth: number;
    net_profit: number;
    profit_margin: number;
    customer_count: number;
    customer_growth: number;
    average_order_value: number;
    aov_growth: number;
    store_count: number;
    employee_count: number;
  };
  alerts: Array<{
    type: 'revenue' | 'profit' | 'inventory' | 'compliance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    store_id?: string;
    action_required: boolean;
  }>;
  trends: Array<{
    metric: string;
    current_value: number;
    previous_value: number;
    change_percentage: number;
    trend_direction: 'up' | 'down' | 'stable';
  }>;
  top_performers: {
    stores: Array<{ name: string; revenue: number; growth: number; }>;
    products: Array<{ name: string; revenue: number; margin: number; }>;
    employees: Array<{ name: string; sales: number; efficiency: number; }>;
  };
}

export const advancedReportsService = {
  async generateProfitLossStatement(
    storeId: string, 
    dateRange: { from: string; to: string }
  ): Promise<ProfitLossStatement> {
    // Get base profit/loss data
    const profitLossData = await fetchProfitLossReport(storeId, dateRange.from, dateRange.to);
    
    // Get detailed expense breakdown
    const { data: expenses } = await supabase
      .from('expenses')
      .select(`
        amount,
        category:expense_categories(name)
      `)
      .eq('store_id', storeId)
      .eq('status', 'approved')
      .gte('expense_date', dateRange.from)
      .lte('expense_date', dateRange.to);

    // Categorize expenses
    const expenseCategories = expenses?.reduce((acc, exp) => {
      const category = exp.category?.name || 'Other';
      acc[category] = (acc[category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>) || {};

    const totalRevenue = profitLossData?.totalRevenue || 0;
    const totalCOGS = profitLossData?.costOfGoods || 0;
    const grossProfit = totalRevenue - totalCOGS;
    
    const operatingExpenses = {
      salaries: expenseCategories['Salaries'] || 0,
      rent: expenseCategories['Rent'] || 0,
      utilities: expenseCategories['Utilities'] || 0,
      marketing: expenseCategories['Marketing'] || 0,
      other: Object.entries(expenseCategories)
        .filter(([key]) => !['Salaries', 'Rent', 'Utilities', 'Marketing'].includes(key))
        .reduce((sum, [, value]) => sum + value, 0),
      total: Object.values(expenseCategories).reduce((sum, val) => sum + val, 0)
    };

    const ebitda = grossProfit - operatingExpenses.total;
    const depreciation = ebitda * 0.05; // Estimate 5% depreciation
    const interest = ebitda * 0.02; // Estimate 2% interest
    const tax = Math.max(0, (ebitda - depreciation - interest) * 0.30); // 30% tax rate
    const netIncome = ebitda - depreciation - interest - tax;

    return {
      revenue: {
        gross_sales: totalRevenue,
        discounts: 0, // TODO: Calculate from transaction data
        returns: 0, // TODO: Calculate from return data
        net_sales: totalRevenue
      },
      cost_of_goods: {
        beginning_inventory: 0, // TODO: Get from inventory system
        purchases: totalCOGS,
        ending_inventory: 0, // TODO: Get from inventory system
        total_cogs: totalCOGS
      },
      gross_profit: grossProfit,
      operating_expenses: operatingExpenses,
      ebitda,
      depreciation,
      interest,
      tax,
      net_income: netIncome,
      margins: {
        gross_margin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        operating_margin: totalRevenue > 0 ? (ebitda / totalRevenue) * 100 : 0,
        net_margin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
      }
    };
  },

  async generateCostAnalysisReport(
    storeId: string,
    dateRange: { from: string; to: string }
  ): Promise<CostAnalysisReport> {
    // Get product sales and cost data
    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        *,
        transaction_items:transaction_items(*)
      `)
      .eq('store_id', storeId)
      .gte('created_at', `${dateRange.from}T00:00:00`)
      .lte('created_at', `${dateRange.to}T23:59:59`);

    // Get product costs
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId);

    // Calculate product-level costs
    const productCosts = products?.map(product => {
      const salesData = transactions?.flatMap(t => 
        t.transaction_items?.filter(item => item.product_id === product.id) || []
      ) || [];

      const totalQuantity = salesData.reduce((sum, item) => sum + item.quantity, 0);
      const totalRevenue = salesData.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

      // Estimate cost breakdown (in practice, this would come from detailed costing system)
      const materialCost = product.cost * 0.60; // 60% materials
      const laborCost = product.cost * 0.25; // 25% labor
      const overheadCost = product.cost * 0.15; // 15% overhead

      return {
        product_name: product.name,
        material_cost: materialCost,
        labor_cost: laborCost,
        overhead_cost: overheadCost,
        total_cost: product.cost,
        selling_price: product.price,
        margin: product.price > 0 ? ((product.price - product.cost) / product.price) * 100 : 0,
        volume: totalQuantity,
        total_profit: (product.price - product.cost) * totalQuantity
      };
    }) || [];

    // Generate cost trends
    const costTrends = eachDayOfInterval({
      start: new Date(dateRange.from),
      end: new Date(dateRange.to)
    }).map(date => ({
      date: format(date, 'yyyy-MM-dd'),
      material_cost: Math.random() * 1000 + 500, // TODO: Replace with actual data
      labor_cost: Math.random() * 500 + 300,
      overhead_cost: Math.random() * 300 + 200
    }));

    const totalMaterials = productCosts.reduce((sum, p) => sum + (p.material_cost * p.volume), 0);
    const totalLabor = productCosts.reduce((sum, p) => sum + (p.labor_cost * p.volume), 0);
    const totalOverhead = productCosts.reduce((sum, p) => sum + (p.overhead_cost * p.volume), 0);

    return {
      product_costs: productCosts.sort((a, b) => b.total_profit - a.total_profit),
      cost_trends: costTrends,
      cost_breakdown: {
        materials: totalMaterials,
        labor: totalLabor,
        overhead: totalOverhead,
        total: totalMaterials + totalLabor + totalOverhead
      }
    };
  },

  async generatePerformanceBenchmarks(dateRange: { from: string; to: string }): Promise<PerformanceBenchmark[]> {
    const { data: stores } = await supabase
      .from('stores')
      .select('*')
      .eq('is_active', true);

    const benchmarks = await Promise.all(
      (stores || []).map(async (store) => {
        // Get store performance data
        const { data: transactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('store_id', store.id)
          .gte('created_at', `${dateRange.from}T00:00:00`)
          .lte('created_at', `${dateRange.to}T23:59:59`);

        const totalRevenue = transactions?.reduce((sum, t) => sum + t.total, 0) || 0;
        const totalTransactions = transactions?.length || 0;
        const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

        // Calculate metrics (using mock data for missing fields)
        const metrics = {
          revenue_per_sqft: 1000, // Mock: totalRevenue / store.square_footage
          revenue_per_employee: 50000, // Mock: totalRevenue / store.employee_count
          transactions_per_day: totalTransactions / 30, // Assuming 30-day period
          average_order_value: averageOrderValue,
          customer_retention_rate: 75 + Math.random() * 20, // TODO: Calculate from customer data
          inventory_turnover: 6 + Math.random() * 6, // TODO: Calculate from inventory data
          gross_margin: 45 + Math.random() * 20, // TODO: Calculate from actual margin data
          labor_cost_percentage: 25 + Math.random() * 10 // TODO: Calculate from expense data
        };

        return {
          store_id: store.id,
          store_name: store.name,
          metrics,
          ranking: {
            overall_rank: 1, // TODO: Calculate actual rankings
            revenue_rank: 1,
            efficiency_rank: 1,
            profitability_rank: 1
          },
          comparison_to_average: {
            revenue_variance: Math.random() * 40 - 20, // -20% to +20%
            margin_variance: Math.random() * 20 - 10,
            efficiency_variance: Math.random() * 30 - 15
          }
        };
      })
    );

    // Calculate rankings
    benchmarks.sort((a, b) => b.metrics.revenue_per_sqft - a.metrics.revenue_per_sqft);
    benchmarks.forEach((benchmark, index) => {
      benchmark.ranking.revenue_rank = index + 1;
    });

    return benchmarks;
  },

  async generateComplianceReport(storeId: string): Promise<ComplianceReport> {
    // This would integrate with various compliance systems
    return {
      bir_compliance: {
        sales_reported: 1250000,
        tax_collected: 150000,
        penalties: 0,
        filing_status: 'compliant'
      },
      food_safety: {
        inspection_date: '2024-01-15',
        score: 95,
        violations: [],
        corrective_actions: []
      },
      labor_compliance: {
        employee_count: 15,
        overtime_hours: 120,
        minimum_wage_compliance: true,
        benefits_compliance: true
      },
      environmental: {
        waste_management_score: 85,
        energy_efficiency_rating: 'A',
        sustainability_initiatives: [
          'LED lighting conversion',
          'Waste segregation program',
          'Water conservation measures'
        ]
      }
    };
  },

  async generateExecutiveDashboard(dateRange: { from: string; to: string }): Promise<ExecutiveDashboard> {
    // Get overall company metrics
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', `${dateRange.from}T00:00:00`)
      .lte('created_at', `${dateRange.to}T23:59:59`);

    const { data: previousTransactions } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', format(subDays(new Date(dateRange.from), 30), 'yyyy-MM-dd'))
      .lte('created_at', format(subDays(new Date(dateRange.to), 30), 'yyyy-MM-dd'));

    const currentRevenue = transactions?.reduce((sum, t) => sum + t.total, 0) || 0;
    const previousRevenue = previousTransactions?.reduce((sum, t) => sum + t.total, 0) || 0;
    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    return {
      kpis: {
        total_revenue: currentRevenue,
        revenue_growth: revenueGrowth,
        net_profit: currentRevenue * 0.15, // Estimate 15% net margin
        profit_margin: 15,
        customer_count: 1250,
        customer_growth: 12.5,
        average_order_value: transactions?.length ? currentRevenue / transactions.length : 0,
        aov_growth: 8.3,
        store_count: 5,
        employee_count: 75
      },
      alerts: [
        {
          type: 'inventory',
          severity: 'medium',
          message: 'Low stock alert: 5 items below minimum threshold',
          action_required: true
        },
        {
          type: 'compliance',
          severity: 'low',
          message: 'Monthly tax filing due in 3 days',
          action_required: true
        }
      ],
      trends: [
        {
          metric: 'Revenue',
          current_value: currentRevenue,
          previous_value: previousRevenue,
          change_percentage: revenueGrowth,
          trend_direction: revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'stable'
        }
      ],
      top_performers: {
        stores: [
          { name: 'BGC Store', revenue: 450000, growth: 25.3 },
          { name: 'Makati Store', revenue: 425000, growth: 18.7 },
          { name: 'Ortigas Store', revenue: 375000, growth: 15.2 }
        ],
        products: [
          { name: 'Classic Croffle', revenue: 125000, margin: 65.2 },
          { name: 'Chocolate Croffle', revenue: 98000, margin: 62.8 },
          { name: 'Matcha Croffle', revenue: 87000, margin: 58.9 }
        ],
        employees: [
          { name: 'Maria Santos', sales: 45000, efficiency: 95.2 },
          { name: 'Juan Dela Cruz', sales: 42000, efficiency: 92.8 },
          { name: 'Anna Reyes', sales: 38000, efficiency: 90.5 }
        ]
      }
    };
  }
};