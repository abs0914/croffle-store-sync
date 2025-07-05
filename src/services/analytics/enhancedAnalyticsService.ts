import { supabase } from "@/integrations/supabase/client";
import { addDays, format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface AnalyticsMetrics {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  customerAcquisition: number;
  inventoryTurnover: number;
  profitMargin: number;
  topSellingProducts: ProductAnalytics[];
  revenueGrowth: number;
  customerRetention: number;
  inventoryValue: number;
}

export interface ProductAnalytics {
  id: string;
  name: string;
  revenue: number;
  quantitySold: number;
  profitMargin: number;
  growth: number;
  category?: string;
}

export interface SalesAnalytics {
  dailySales: DailySales[];
  monthlySales: MonthlySales[];
  hourlyDistribution: HourlyDistribution[];
  storeComparison: StoreComparison[];
  categoryPerformance: CategoryPerformance[];
}

export interface DailySales {
  date: string;
  revenue: number;
  transactions: number;
  customers: number;
  averageOrderValue: number;
}

export interface MonthlySales {
  month: string;
  revenue: number;
  transactions: number;
  growth: number;
}

export interface HourlyDistribution {
  hour: number;
  revenue: number;
  transactions: number;
  avgOrderValue: number;
}

export interface StoreComparison {
  storeId: string;
  storeName: string;
  revenue: number;
  transactions: number;
  customers: number;
  growth: number;
  efficiency: number;
}

export interface CategoryPerformance {
  category: string;
  revenue: number;
  items: number;
  growth: number;
}

export interface InventoryAnalytics {
  stockLevels: StockLevel[];
  movementAnalysis: MovementAnalysis[];
  reorderPredictions: ReorderPrediction[];
  costAnalysis: CostAnalysis[];
  turnoverRates: TurnoverRate[];
}

export interface StockLevel {
  item: string;
  currentStock: number;
  minThreshold: number;
  maxCapacity: number;
  daysUntilStockout: number;
  reorderPoint: number;
  status: 'healthy' | 'low' | 'critical' | 'overstock';
}

export interface MovementAnalysis {
  item: string;
  movementVelocity: number;
  seasonalityIndex: number;
  demandForecast: number;
  optimalStock: number;
}

export interface ReorderPrediction {
  item: string;
  suggestedQuantity: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  costImpact: number;
  reorderDate: string;
}

export interface CostAnalysis {
  item: string;
  averageCost: number;
  currentCost: number;
  costTrend: 'increasing' | 'decreasing' | 'stable';
  costVariance: number;
}

export interface TurnoverRate {
  item: string;
  turnoverRate: number;
  daysOnHand: number;
  efficiency: number;
}

export interface CustomerAnalytics {
  customerSegments: CustomerSegment[];
  lifetimeValue: LifetimeValue[];
  churnAnalysis: ChurnAnalysis;
  acquisitionChannels: AcquisitionChannel[];
  behaviorPatterns: BehaviorPattern[];
}

export interface CustomerSegment {
  segment: string;
  count: number;
  averageValue: number;
  frequency: number;
  description: string;
}

export interface LifetimeValue {
  segment: string;
  ltv: number;
  acquisitionCost: number;
  profitMargin: number;
  retentionRate: number;
}

export interface ChurnAnalysis {
  churnRate: number;
  atRiskCustomers: number;
  retentionOpportunities: number;
  predictedChurn: ChurnPrediction[];
}

export interface ChurnPrediction {
  customerId: string;
  customerName: string;
  churnProbability: number;
  lastVisit: string;
  totalSpent: number;
  riskFactors: string[];
}

export interface AcquisitionChannel {
  channel: string;
  customers: number;
  cost: number;
  ltv: number;
  roi: number;
}

export interface BehaviorPattern {
  pattern: string;
  frequency: number;
  revenue: number;
  customers: number;
  seasonality: number;
}

export class EnhancedAnalyticsService {
  async getOverviewMetrics(storeId: string, dateRange: { from: string; to: string }): Promise<AnalyticsMetrics> {
    try {
      const [
        transactionsData,
        productsData,
        customersData,
        inventoryData
      ] = await Promise.all([
        this.getTransactionsData(storeId, dateRange),
        this.getProductsData(storeId, dateRange),
        this.getCustomersData(storeId, dateRange),
        this.getInventoryData(storeId)
      ]);

      // Calculate metrics
      const totalRevenue = transactionsData.reduce((sum, t) => sum + t.total, 0);
      const totalTransactions = transactionsData.length;
      const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
      
      // Calculate previous period for growth comparison
      const previousPeriod = this.getPreviousPeriod(dateRange);
      const previousTransactionsData = await this.getTransactionsData(storeId, previousPeriod);
      const previousRevenue = previousTransactionsData.reduce((sum, t) => sum + t.total, 0);
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Calculate inventory metrics
      const inventoryValue = inventoryData.reduce((sum, item) => sum + (item.stock_quantity * (item.cost || 0)), 0);
      const inventoryTurnover = this.calculateInventoryTurnover(inventoryData, transactionsData);

      // Get top selling products
      const topSellingProducts = await this.getTopSellingProducts(storeId, dateRange);

      return {
        totalRevenue,
        totalTransactions,
        averageOrderValue,
        customerAcquisition: customersData.filter(c => 
          new Date(c.created_at!) >= new Date(dateRange.from)
        ).length,
        inventoryTurnover,
        profitMargin: this.calculateProfitMargin(transactionsData, productsData),
        topSellingProducts,
        revenueGrowth,
        customerRetention: await this.calculateCustomerRetention(storeId, dateRange),
        inventoryValue
      };
    } catch (error) {
      console.error('Error fetching analytics metrics:', error);
      throw error;
    }
  }

  async getSalesAnalytics(storeId: string, dateRange: { from: string; to: string }): Promise<SalesAnalytics> {
    try {
      const transactionsData = await this.getTransactionsData(storeId, dateRange);
      
      return {
        dailySales: this.generateDailySales(transactionsData, dateRange),
        monthlySales: await this.generateMonthlySales(storeId, dateRange),
        hourlyDistribution: this.generateHourlyDistribution(transactionsData),
        storeComparison: await this.generateStoreComparison(dateRange),
        categoryPerformance: await this.generateCategoryPerformance(storeId, dateRange)
      };
    } catch (error) {
      console.error('Error fetching sales analytics:', error);
      throw error;
    }
  }

  async getInventoryAnalytics(storeId: string): Promise<InventoryAnalytics> {
    try {
      const inventoryData = await this.getInventoryData(storeId);
      const movementData = await this.getInventoryMovements(storeId);

      return {
        stockLevels: this.generateStockLevels(inventoryData),
        movementAnalysis: this.generateMovementAnalysis(inventoryData, movementData),
        reorderPredictions: this.generateReorderPredictions(inventoryData, movementData),
        costAnalysis: this.generateCostAnalysis(inventoryData),
        turnoverRates: this.generateTurnoverRates(inventoryData, movementData)
      };
    } catch (error) {
      console.error('Error fetching inventory analytics:', error);
      throw error;
    }
  }

  async getCustomerAnalytics(storeId: string, dateRange: { from: string; to: string }): Promise<CustomerAnalytics> {
    try {
      const customersData = await this.getCustomersData(storeId, dateRange);
      const transactionsData = await this.getTransactionsData(storeId, dateRange);

      return {
        customerSegments: this.generateCustomerSegments(customersData, transactionsData),
        lifetimeValue: this.generateLifetimeValue(customersData, transactionsData),
        churnAnalysis: await this.generateChurnAnalysis(storeId, dateRange),
        acquisitionChannels: this.generateAcquisitionChannels(customersData),
        behaviorPatterns: this.generateBehaviorPatterns(transactionsData)
      };
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      throw error;
    }
  }

  // Private helper methods
  private async getTransactionsData(storeId: string, dateRange: { from: string; to: string }) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', `${dateRange.from}T00:00:00`)
      .lte('created_at', `${dateRange.to}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private async getProductsData(storeId: string, dateRange: { from: string; to: string }) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  private async getCustomersData(storeId: string, dateRange: { from: string; to: string }) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('store_id', storeId);

    if (error) throw error;
    return data || [];
  }

  private async getInventoryData(storeId: string) {
    const { data, error } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  private async getInventoryMovements(storeId: string) {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select(`
        *,
        inventory_stock!inner(store_id)
      `)
      .eq('inventory_stock.store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;
    return data || [];
  }

  private getPreviousPeriod(dateRange: { from: string; to: string }) {
    const start = new Date(dateRange.from);
    const end = new Date(dateRange.to);
    const duration = end.getTime() - start.getTime();
    
    return {
      from: format(new Date(start.getTime() - duration), 'yyyy-MM-dd'),
      to: format(new Date(end.getTime() - duration), 'yyyy-MM-dd')
    };
  }

  private calculateInventoryTurnover(inventoryData: any[], transactionsData: any[]): number {
    const totalInventoryCost = inventoryData.reduce((sum, item) => sum + (item.stock_quantity * (item.cost || 0)), 0);
    const totalCOGS = transactionsData.reduce((sum, t) => sum + (t.total * 0.6), 0); // Assuming 60% COGS
    
    return totalInventoryCost > 0 ? totalCOGS / totalInventoryCost : 0;
  }

  private calculateProfitMargin(transactionsData: any[], productsData: any[]): number {
    const totalRevenue = transactionsData.reduce((sum, t) => sum + t.total, 0);
    const totalCost = transactionsData.reduce((sum, t) => sum + (t.total * 0.6), 0); // Estimated COGS
    
    return totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
  }

  private async getTopSellingProducts(storeId: string, dateRange: { from: string; to: string }): Promise<ProductAnalytics[]> {
    // This would need transaction_items table or similar to get actual product sales
    // For now, return mock data based on inventory
    const products = await this.getProductsData(storeId, dateRange);
    
    return products.slice(0, 5).map(product => ({
      id: product.id,
      name: product.name,
      revenue: product.price * (product.stock_quantity || 0) * 0.1, // Mock calculation
      quantitySold: Math.floor((product.stock_quantity || 0) * 0.1),
      profitMargin: ((product.price - (product.cost || 0)) / product.price) * 100,
      growth: Math.random() * 20 - 10, // Mock growth rate
      category: product.category_id
    }));
  }

  private async calculateCustomerRetention(storeId: string, dateRange: { from: string; to: string }): Promise<number> {
    // This would need customer transaction history to calculate retention
    // For now, return estimated value
    return Math.random() * 30 + 70; // 70-100% retention rate
  }

  private generateDailySales(transactions: any[], dateRange: { from: string; to: string }): DailySales[] {
    const dailyData = new Map<string, DailySales>();
    
    // Initialize all days in range
    for (let d = new Date(dateRange.from); d <= new Date(dateRange.to); d = addDays(d, 1)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      dailyData.set(dateStr, {
        date: dateStr,
        revenue: 0,
        transactions: 0,
        customers: 0,
        averageOrderValue: 0
      });
    }

    // Fill with actual data
    transactions.forEach(transaction => {
      const date = format(new Date(transaction.created_at), 'yyyy-MM-dd');
      const existing = dailyData.get(date);
      if (existing) {
        existing.revenue += transaction.total;
        existing.transactions += 1;
        existing.customers += transaction.customer_id ? 1 : 0;
      }
    });

    // Calculate averages
    Array.from(dailyData.values()).forEach(day => {
      day.averageOrderValue = day.transactions > 0 ? day.revenue / day.transactions : 0;
    });

    return Array.from(dailyData.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  private async generateMonthlySales(storeId: string, dateRange: { from: string; to: string }): Promise<MonthlySales[]> {
    const months: MonthlySales[] = [];
    const startDate = startOfMonth(new Date(dateRange.from));
    const endDate = endOfMonth(new Date(dateRange.to));

    for (let d = startDate; d <= endDate; d = addDays(startOfMonth(addDays(d, 32)), 0)) {
      const monthStr = format(d, 'yyyy-MM');
      const monthStart = startOfMonth(d);
      const monthEnd = endOfMonth(d);

      const { data: monthTransactions } = await supabase
        .from('transactions')
        .select('total')
        .eq('store_id', storeId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      const revenue = monthTransactions?.reduce((sum, t) => sum + t.total, 0) || 0;
      const transactions = monthTransactions?.length || 0;

      // Get previous month for growth calculation
      const prevMonth = subMonths(monthStart, 1);
      const { data: prevMonthTransactions } = await supabase
        .from('transactions')
        .select('total')
        .eq('store_id', storeId)
        .gte('created_at', startOfMonth(prevMonth).toISOString())
        .lte('created_at', endOfMonth(prevMonth).toISOString());

      const prevRevenue = prevMonthTransactions?.reduce((sum, t) => sum + t.total, 0) || 0;
      const growth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

      months.push({
        month: monthStr,
        revenue,
        transactions,
        growth
      });
    }

    return months;
  }

  private generateHourlyDistribution(transactions: any[]): HourlyDistribution[] {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      revenue: 0,
      transactions: 0,
      avgOrderValue: 0
    }));

    transactions.forEach(transaction => {
      const hour = new Date(transaction.created_at).getHours();
      hourlyData[hour].revenue += transaction.total;
      hourlyData[hour].transactions += 1;
    });

    // Calculate averages
    hourlyData.forEach(hourData => {
      hourData.avgOrderValue = hourData.transactions > 0 ? hourData.revenue / hourData.transactions : 0;
    });

    return hourlyData;
  }

  private async generateStoreComparison(dateRange: { from: string; to: string }): Promise<StoreComparison[]> {
    // This would compare all stores - simplified for now
    const { data: stores } = await supabase
      .from('stores')
      .select('*')
      .eq('is_active', true);

    if (!stores) return [];

    const storeComparisons: StoreComparison[] = [];

    for (const store of stores) {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('total, customer_id')
        .eq('store_id', store.id)
        .gte('created_at', `${dateRange.from}T00:00:00`)
        .lte('created_at', `${dateRange.to}T23:59:59`);

      const revenue = transactions?.reduce((sum, t) => sum + t.total, 0) || 0;
      const transactionCount = transactions?.length || 0;
      const uniqueCustomers = new Set(transactions?.map(t => t.customer_id).filter(Boolean)).size;

      storeComparisons.push({
        storeId: store.id,
        storeName: store.name,
        revenue,
        transactions: transactionCount,
        customers: uniqueCustomers,
        growth: Math.random() * 20 - 10, // Mock growth
        efficiency: transactionCount > 0 ? revenue / transactionCount : 0
      });
    }

    return storeComparisons.sort((a, b) => b.revenue - a.revenue);
  }

  private async generateCategoryPerformance(storeId: string, dateRange: { from: string; to: string }): Promise<CategoryPerformance[]> {
    // This would need product categories and transaction items
    // Simplified implementation
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    return (categories || []).map(category => ({
      category: category.name,
      revenue: Math.random() * 10000, // Mock data
      items: Math.floor(Math.random() * 50),
      growth: Math.random() * 30 - 15
    }));
  }

  // Additional helper methods for inventory, customer analytics...
  private generateStockLevels(inventoryData: any[]): StockLevel[] {
    return inventoryData.map(item => {
      const daysUntilStockout = this.calculateDaysUntilStockout(item);
      const status = this.determineStockStatus(item, daysUntilStockout);

      return {
        item: item.item,
        currentStock: item.stock_quantity,
        minThreshold: item.minimum_threshold || 10,
        maxCapacity: item.maximum_capacity || 100,
        daysUntilStockout,
        reorderPoint: Math.max(item.minimum_threshold || 10, Math.floor(item.stock_quantity * 0.2)),
        status
      };
    });
  }

  private calculateDaysUntilStockout(item: any): number {
    // Mock calculation - would need historical consumption data
    const dailyConsumption = Math.max(1, Math.floor(item.stock_quantity / 30));
    return Math.floor(item.stock_quantity / dailyConsumption);
  }

  private determineStockStatus(item: any, daysUntilStockout: number): 'healthy' | 'low' | 'critical' | 'overstock' {
    if (item.stock_quantity <= 0) return 'critical';
    if (item.stock_quantity <= (item.minimum_threshold || 10)) return 'low';
    if (item.stock_quantity >= (item.maximum_capacity || 100) * 0.9) return 'overstock';
    return 'healthy';
  }

  private generateMovementAnalysis(inventoryData: any[], movementData: any[]): MovementAnalysis[] {
    return inventoryData.map(item => ({
      item: item.item,
      movementVelocity: this.calculateMovementVelocity(item, movementData),
      seasonalityIndex: Math.random() * 2, // Mock seasonality
      demandForecast: Math.floor(Math.random() * 100),
      optimalStock: Math.floor(item.stock_quantity * (1 + Math.random() * 0.5))
    }));
  }

  private calculateMovementVelocity(item: any, movementData: any[]): number {
    const itemMovements = movementData.filter(m => m.inventory_stock_id === item.id);
    const totalMovement = itemMovements.reduce((sum, m) => sum + Math.abs(m.quantity_change), 0);
    return totalMovement / Math.max(1, itemMovements.length);
  }

  private generateReorderPredictions(inventoryData: any[], movementData: any[]): ReorderPrediction[] {
    return inventoryData
      .filter(item => item.stock_quantity <= (item.minimum_threshold || 10) * 1.5)
      .map(item => ({
        item: item.item,
        suggestedQuantity: Math.max(50, (item.maximum_capacity || 100) - item.stock_quantity),
        urgencyLevel: this.determineUrgencyLevel(item),
        costImpact: (item.cost || 0) * Math.max(50, (item.maximum_capacity || 100) - item.stock_quantity),
        reorderDate: format(addDays(new Date(), this.calculateDaysUntilStockout(item) - 5), 'yyyy-MM-dd')
      }));
  }

  private determineUrgencyLevel(item: any): 'low' | 'medium' | 'high' | 'critical' {
    const daysUntilStockout = this.calculateDaysUntilStockout(item);
    if (daysUntilStockout <= 3) return 'critical';
    if (daysUntilStockout <= 7) return 'high';
    if (daysUntilStockout <= 14) return 'medium';
    return 'low';
  }

  private generateCostAnalysis(inventoryData: any[]): CostAnalysis[] {
    return inventoryData.map(item => ({
      item: item.item,
      averageCost: item.cost || 0,
      currentCost: item.cost || 0,
      costTrend: Math.random() > 0.5 ? 'increasing' : 'decreasing',
      costVariance: Math.random() * 20 - 10
    }));
  }

  private generateTurnoverRates(inventoryData: any[], movementData: any[]): TurnoverRate[] {
    return inventoryData.map(item => {
      const movementVelocity = this.calculateMovementVelocity(item, movementData);
      const turnoverRate = item.stock_quantity > 0 ? movementVelocity / item.stock_quantity : 0;
      
      return {
        item: item.item,
        turnoverRate,
        daysOnHand: movementVelocity > 0 ? item.stock_quantity / movementVelocity : 365,
        efficiency: Math.min(100, turnoverRate * 50)
      };
    });
  }

  private generateCustomerSegments(customersData: any[], transactionsData: any[]): CustomerSegment[] {
    return [
      { segment: 'VIP Customers', count: Math.floor(customersData.length * 0.1), averageValue: 500, frequency: 15, description: 'High-value repeat customers' },
      { segment: 'Regular Customers', count: Math.floor(customersData.length * 0.4), averageValue: 150, frequency: 8, description: 'Consistent monthly customers' },
      { segment: 'Occasional Customers', count: Math.floor(customersData.length * 0.3), averageValue: 75, frequency: 3, description: 'Infrequent purchasers' },
      { segment: 'New Customers', count: Math.floor(customersData.length * 0.2), averageValue: 50, frequency: 1, description: 'First-time or recent customers' }
    ];
  }

  private generateLifetimeValue(customersData: any[], transactionsData: any[]): LifetimeValue[] {
    return [
      { segment: 'VIP Customers', ltv: 2500, acquisitionCost: 50, profitMargin: 35, retentionRate: 95 },
      { segment: 'Regular Customers', ltv: 800, acquisitionCost: 25, profitMargin: 28, retentionRate: 80 },
      { segment: 'Occasional Customers', ltv: 300, acquisitionCost: 15, profitMargin: 22, retentionRate: 45 },
      { segment: 'New Customers', ltv: 150, acquisitionCost: 30, profitMargin: 18, retentionRate: 25 }
    ];
  }

  private async generateChurnAnalysis(storeId: string, dateRange: { from: string; to: string }): Promise<ChurnAnalysis> {
    const customersData = await this.getCustomersData(storeId, dateRange);
    
    return {
      churnRate: 12.5, // Mock churn rate
      atRiskCustomers: Math.floor(customersData.length * 0.15),
      retentionOpportunities: Math.floor(customersData.length * 0.08),
      predictedChurn: customersData.slice(0, 5).map(customer => ({
        customerId: customer.id,
        customerName: customer.name,
        churnProbability: Math.random() * 100,
        lastVisit: format(new Date(customer.updated_at!), 'yyyy-MM-dd'),
        totalSpent: Math.random() * 1000,
        riskFactors: ['Decreased frequency', 'Lower order value', 'No recent activity'].slice(0, Math.floor(Math.random() * 3) + 1)
      }))
    };
  }

  private generateAcquisitionChannels(customersData: any[]): AcquisitionChannel[] {
    return [
      { channel: 'Walk-in', customers: Math.floor(customersData.length * 0.6), cost: 5, ltv: 300, roi: 500 },
      { channel: 'Social Media', customers: Math.floor(customersData.length * 0.2), cost: 15, ltv: 250, roi: 300 },
      { channel: 'Word of Mouth', customers: Math.floor(customersData.length * 0.15), cost: 0, ltv: 400, roi: Infinity },
      { channel: 'Online Ads', customers: Math.floor(customersData.length * 0.05), cost: 25, ltv: 200, roi: 150 }
    ];
  }

  private generateBehaviorPatterns(transactionsData: any[]): BehaviorPattern[] {
    return [
      { pattern: 'Morning Rush', frequency: 25, revenue: 2500, customers: 150, seasonality: 1.2 },
      { pattern: 'Lunch Peak', frequency: 35, revenue: 4200, customers: 200, seasonality: 1.0 },
      { pattern: 'Evening Casual', frequency: 20, revenue: 1800, customers: 120, seasonality: 0.9 },
      { pattern: 'Weekend Family', frequency: 40, revenue: 5500, customers: 180, seasonality: 1.5 }
    ];
  }
}

export const enhancedAnalyticsService = new EnhancedAnalyticsService();