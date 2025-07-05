import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from "date-fns";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ReportExportOptions {
  title: string;
  dateRange: { from: string; to: string };
  storeId: string;
  storeName: string;
  data: any[];
  columns: ReportColumn[];
  summary?: ReportSummary;
  charts?: ChartData[];
}

export interface ReportColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'percentage';
  width?: number;
}

export interface ReportSummary {
  title: string;
  metrics: Array<{
    label: string;
    value: string | number;
    type: 'text' | 'number' | 'currency' | 'percentage';
  }>;
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie';
  title: string;
  data: any[];
}

export interface ComprehensiveReport {
  overview: {
    totalRevenue: number;
    totalTransactions: number;
    averageOrderValue: number;
    growthRate: number;
    topProducts: Array<{
      name: string;
      revenue: number;
      quantity: number;
    }>;
  };
  sales: {
    dailyTrends: Array<{
      date: string;
      revenue: number;
      transactions: number;
    }>;
    hourlyDistribution: Array<{
      hour: number;
      revenue: number;
      transactions: number;
    }>;
    categoryBreakdown: Array<{
      category: string;
      revenue: number;
      percentage: number;
    }>;
  };
  inventory: {
    stockLevels: Array<{
      item: string;
      currentStock: number;
      minThreshold: number;
      status: string;
      value: number;
    }>;
    movementSummary: {
      totalItems: number;
      lowStockItems: number;
      outOfStockItems: number;
      totalValue: number;
    };
    topMovingItems: Array<{
      item: string;
      movement: number;
      velocity: number;
    }>;
  };
  customers: {
    segments: Array<{
      segment: string;
      count: number;
      revenue: number;
      averageValue: number;
    }>;
    retention: {
      rate: number;
      newCustomers: number;
      returningCustomers: number;
    };
    topCustomers: Array<{
      name: string;
      totalSpent: number;
      visits: number;
      lastVisit: string;
    }>;
  };
}

export class EnhancedReportService {
  async generateComprehensiveReport(storeId: string, dateRange: { from: string; to: string }): Promise<ComprehensiveReport> {
    try {
      const [
        overviewData,
        salesData,
        inventoryData,
        customerData
      ] = await Promise.all([
        this.getOverviewData(storeId, dateRange),
        this.getSalesData(storeId, dateRange),
        this.getInventoryData(storeId),
        this.getCustomerData(storeId, dateRange)
      ]);

      return {
        overview: overviewData,
        sales: salesData,
        inventory: inventoryData,
        customers: customerData
      };
    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      throw error;
    }
  }

  async exportToPDF(options: ReportExportOptions): Promise<void> {
    try {
      const pdf = new jsPDF();
      let yPosition = 20;

      // Header
      pdf.setFontSize(20);
      pdf.text(options.title, 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.text(`Store: ${options.storeName}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Period: ${options.dateRange.from} to ${options.dateRange.to}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 20, yPosition);
      yPosition += 15;

      // Summary section
      if (options.summary) {
        pdf.setFontSize(16);
        pdf.text(options.summary.title, 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(11);
        options.summary.metrics.forEach(metric => {
          const value = this.formatValue(metric.value, metric.type);
          pdf.text(`${metric.label}: ${value}`, 20, yPosition);
          yPosition += 6;
        });
        yPosition += 10;
      }

      // Data table
      if (options.data.length > 0) {
        const tableColumns = options.columns.map(col => col.label);
        const tableRows = options.data.map(row =>
          options.columns.map(col => this.formatValue(row[col.key], col.type))
        );

        (pdf as any).autoTable({
          head: [tableColumns],
          body: tableRows,
          startY: yPosition,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [63, 81, 181] },
          alternateRowStyles: { fillColor: [245, 245, 245] }
        });
      }

      // Save the PDF
      pdf.save(`${options.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  }

  async exportToExcel(options: ReportExportOptions): Promise<void> {
    try {
      const workbook = XLSX.utils.book_new();

      // Create main data sheet
      const worksheetData = [
        // Header rows
        [options.title],
        [`Store: ${options.storeName}`],
        [`Period: ${options.dateRange.from} to ${options.dateRange.to}`],
        [`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`],
        [], // Empty row
      ];

      // Add summary if available
      if (options.summary) {
        worksheetData.push([options.summary.title]);
        options.summary.metrics.forEach(metric => {
          worksheetData.push([metric.label, this.formatValue(metric.value, metric.type)]);
        });
        worksheetData.push([]); // Empty row
      }

      // Add column headers
      worksheetData.push(options.columns.map(col => col.label));

      // Add data rows
      options.data.forEach(row => {
        worksheetData.push(options.columns.map(col => row[col.key]));
      });

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Set column widths
      const columnWidths = options.columns.map(col => ({ wch: col.width || 15 }));
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Data');

      // Create summary sheet if we have enough data
      if (options.summary) {
        const summaryData = [
          ['Metric', 'Value'],
          ...options.summary.metrics.map(metric => [
            metric.label,
            this.formatValue(metric.value, metric.type)
          ])
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      }

      // Save the file
      XLSX.writeFile(workbook, `${options.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  async generatePredictiveReport(storeId: string): Promise<any> {
    try {
      // Get historical data for prediction
      const [salesHistory, inventoryHistory, customerHistory] = await Promise.all([
        this.getSalesHistory(storeId, 90), // Last 90 days
        this.getInventoryHistory(storeId, 30), // Last 30 days
        this.getCustomerHistory(storeId, 60) // Last 60 days
      ]);

      // Generate predictions (simplified algorithms)
      const predictions = {
        sales: this.predictSales(salesHistory),
        inventory: this.predictInventoryNeeds(inventoryHistory),
        customers: this.predictCustomerBehavior(customerHistory)
      };

      return predictions;
    } catch (error) {
      console.error('Error generating predictive report:', error);
      throw error;
    }
  }

  // Private helper methods
  private async getOverviewData(storeId: string, dateRange: { from: string; to: string }) {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', `${dateRange.from}T00:00:00`)
      .lte('created_at', `${dateRange.to}T23:59:59`);

    const totalRevenue = transactions?.reduce((sum, t) => sum + t.total, 0) || 0;
    const totalTransactions = transactions?.length || 0;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Calculate growth rate (simplified)
    const previousPeriod = this.getPreviousPeriod(dateRange);
    const { data: previousTransactions } = await supabase
      .from('transactions')
      .select('total')
      .eq('store_id', storeId)
      .gte('created_at', `${previousPeriod.from}T00:00:00`)
      .lte('created_at', `${previousPeriod.to}T23:59:59`);

    const previousRevenue = previousTransactions?.reduce((sum, t) => sum + t.total, 0) || 0;
    const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Get top products (mock data for now)
    const topProducts = [
      { name: 'Product A', revenue: totalRevenue * 0.25, quantity: Math.floor(totalTransactions * 0.3) },
      { name: 'Product B', revenue: totalRevenue * 0.20, quantity: Math.floor(totalTransactions * 0.25) },
      { name: 'Product C', revenue: totalRevenue * 0.15, quantity: Math.floor(totalTransactions * 0.20) }
    ];

    return {
      totalRevenue,
      totalTransactions,
      averageOrderValue,
      growthRate,
      topProducts
    };
  }

  private async getSalesData(storeId: string, dateRange: { from: string; to: string }) {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', `${dateRange.from}T00:00:00`)
      .lte('created_at', `${dateRange.to}T23:59:59`)
      .order('created_at');

    // Generate daily trends
    const dailyTrends = this.generateDailyTrends(transactions || [], dateRange);

    // Generate hourly distribution
    const hourlyDistribution = this.generateHourlyDistribution(transactions || []);

    // Generate category breakdown (mock data)
    const categoryBreakdown = [
      { category: 'Food', revenue: (transactions?.reduce((sum, t) => sum + t.total, 0) || 0) * 0.6, percentage: 60 },
      { category: 'Beverages', revenue: (transactions?.reduce((sum, t) => sum + t.total, 0) || 0) * 0.3, percentage: 30 },
      { category: 'Snacks', revenue: (transactions?.reduce((sum, t) => sum + t.total, 0) || 0) * 0.1, percentage: 10 }
    ];

    return {
      dailyTrends,
      hourlyDistribution,
      categoryBreakdown
    };
  }

  private async getInventoryData(storeId: string) {
    const { data: inventory } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    const stockLevels = (inventory || []).map(item => ({
      item: item.item,
      currentStock: item.stock_quantity,
      minThreshold: item.minimum_threshold || 10,
      status: this.getStockStatus(item.stock_quantity, item.minimum_threshold || 10),
      value: item.stock_quantity * (item.cost || 0)
    }));

    const movementSummary = {
      totalItems: stockLevels.length,
      lowStockItems: stockLevels.filter(item => item.status === 'low').length,
      outOfStockItems: stockLevels.filter(item => item.status === 'out').length,
      totalValue: stockLevels.reduce((sum, item) => sum + item.value, 0)
    };

    const topMovingItems = stockLevels.slice(0, 10).map(item => ({
      item: item.item,
      movement: Math.random() * 100, // Mock movement data
      velocity: Math.random() * 10
    }));

    return {
      stockLevels,
      movementSummary,
      topMovingItems
    };
  }

  private async getCustomerData(storeId: string, dateRange: { from: string; to: string }) {
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .eq('store_id', storeId);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('customer_id, total, created_at')
      .eq('store_id', storeId)
      .gte('created_at', `${dateRange.from}T00:00:00`)
      .lte('created_at', `${dateRange.to}T23:59:59`);

    // Generate customer segments (simplified)
    const segments = [
      { segment: 'VIP', count: Math.floor((customers?.length || 0) * 0.1), revenue: 0, averageValue: 0 },
      { segment: 'Regular', count: Math.floor((customers?.length || 0) * 0.4), revenue: 0, averageValue: 0 },
      { segment: 'Occasional', count: Math.floor((customers?.length || 0) * 0.5), revenue: 0, averageValue: 0 }
    ];

    const totalRevenue = transactions?.reduce((sum, t) => sum + t.total, 0) || 0;
    segments[0].revenue = totalRevenue * 0.5;
    segments[1].revenue = totalRevenue * 0.3;
    segments[2].revenue = totalRevenue * 0.2;

    segments.forEach(segment => {
      segment.averageValue = segment.count > 0 ? segment.revenue / segment.count : 0;
    });

    const retention = {
      rate: 75, // Mock retention rate
      newCustomers: (customers || []).filter(c => 
        new Date(c.created_at!) >= new Date(dateRange.from)
      ).length,
      returningCustomers: Math.floor((customers?.length || 0) * 0.6)
    };

    const topCustomers = (customers || []).slice(0, 10).map(customer => ({
      name: customer.name,
      totalSpent: Math.random() * 1000,
      visits: Math.floor(Math.random() * 20) + 1,
      lastVisit: format(new Date(customer.updated_at!), 'yyyy-MM-dd')
    }));

    return {
      segments,
      retention,
      topCustomers
    };
  }

  // Helper methods for predictions
  private predictSales(salesHistory: any[]) {
    const avgDailyGrowth = 0.02; // 2% daily growth assumption
    const nextMonth = salesHistory.map((day, index) => ({
      date: format(subDays(new Date(), -index - 1), 'yyyy-MM-dd'),
      predicted: day.revenue * (1 + avgDailyGrowth)
    }));

    return {
      nextMonth,
      confidence: 0.75,
      trend: 'increasing'
    };
  }

  private predictInventoryNeeds(inventoryHistory: any[]) {
    return inventoryHistory.map(item => ({
      item: item.name,
      currentStock: item.stock,
      predictedConsumption: Math.floor(item.stock * 0.1), // 10% daily consumption
      reorderPoint: Math.floor(item.stock * 0.2),
      suggestedOrder: Math.floor(item.stock * 0.3)
    }));
  }

  private predictCustomerBehavior(customerHistory: any[]) {
    return {
      churnRisk: customerHistory.slice(0, 5).map(customer => ({
        name: customer.name,
        riskScore: Math.random() * 100,
        factors: ['Decreased frequency', 'Lower spend']
      })),
      growthOpportunities: Math.floor(customerHistory.length * 0.15),
      expectedNewCustomers: Math.floor(customerHistory.length * 0.1)
    };
  }

  // Utility methods
  private formatValue(value: string | number, type: string): string {
    if (value === null || value === undefined) return '';

    switch (type) {
      case 'currency':
        return `₱${typeof value === 'number' ? value.toLocaleString() : value}`;
      case 'percentage':
        return `${value}%`;
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value.toString();
      case 'date':
        return typeof value === 'string' ? format(new Date(value), 'MMM dd, yyyy') : value.toString();
      default:
        return value.toString();
    }
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

  private generateDailyTrends(transactions: any[], dateRange: { from: string; to: string }) {
    const dailyMap = new Map();
    
    // Initialize all days
    for (let d = new Date(dateRange.from); d <= new Date(dateRange.to); d.setDate(d.getDate() + 1)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      dailyMap.set(dateStr, { date: dateStr, revenue: 0, transactions: 0 });
    }

    // Fill with actual data
    transactions.forEach(transaction => {
      const date = format(new Date(transaction.created_at), 'yyyy-MM-dd');
      const day = dailyMap.get(date);
      if (day) {
        day.revenue += transaction.total;
        day.transactions += 1;
      }
    });

    return Array.from(dailyMap.values());
  }

  private generateHourlyDistribution(transactions: any[]) {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      revenue: 0,
      transactions: 0
    }));

    transactions.forEach(transaction => {
      const hour = new Date(transaction.created_at).getHours();
      hourlyData[hour].revenue += transaction.total;
      hourlyData[hour].transactions += 1;
    });

    return hourlyData;
  }

  private getStockStatus(currentStock: number, minThreshold: number): string {
    if (currentStock <= 0) return 'out';
    if (currentStock <= minThreshold) return 'low';
    return 'healthy';
  }

  private async getSalesHistory(storeId: string, days: number) {
    const fromDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('transactions')
      .select('total, created_at')
      .eq('store_id', storeId)
      .gte('created_at', `${fromDate}T00:00:00`)
      .order('created_at');

    return this.generateDailyTrends(data || [], { from: fromDate, to: format(new Date(), 'yyyy-MM-dd') });
  }

  private async getInventoryHistory(storeId: string, days: number) {
    const { data } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    return (data || []).map(item => ({
      name: item.item,
      stock: item.stock_quantity
    }));
  }

  private async getCustomerHistory(storeId: string, days: number) {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('store_id', storeId);

    return data || [];
  }
}

export const enhancedReportService = new EnhancedReportService();