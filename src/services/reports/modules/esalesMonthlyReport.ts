import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface ESalesMonthlyReport {
  storeId: string;
  storeName: string;
  storeAddress: string;
  tin: string;
  machineIdentificationNumber: string;
  reportingMonth: string; // YYYY-MM format
  reportingYear: number;
  reportingMonthNumber: number;
  
  // Sales breakdown per RMO 12-2012
  vatableSales: number; // Net of VAT
  vatAmount: number; // 12% VAT
  vatZeroRatedSales: number;
  vatExemptSales: number;
  otherPercentageTaxSales: number;
  grossSales: number;
  netSales: number;
  totalDiscounts: number;
  
  // Transaction tracking
  totalTransactions: number;
  firstReceiptNumber: string | null;
  lastReceiptNumber: string | null;
  
  // Submission tracking
  submissionStatus: 'draft' | 'submitted' | 'amended';
  amendmentCount: number;
  salesReportNumber: string | null;
  submittedAt: string | null;
}

export interface ESalesReportHistory {
  id: string;
  reportingMonth: string;
  submissionStatus: string;
  salesReportNumber: string | null;
  grossSales: number;
  netSales: number;
  submittedAt: string | null;
  createdAt: string;
}

/**
 * Generate eSales Monthly Report per RMO 12-2012
 */
export async function generateESalesReport(
  storeId: string,
  year: number,
  month: number
): Promise<ESalesMonthlyReport | null> {
  try {
    // Get store info and BIR config
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*, bir_store_config(*)')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      console.error('Error fetching store:', storeError);
      return null;
    }

    const birConfig = store.bir_store_config?.[0] || store.bir_store_config;
    const tin = birConfig?.tin || store.tax_id || 'N/A';
    const min = birConfig?.machine_identification_number || (store as any).machine_identification_number || 'N/A';

    // Calculate date range for the month
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    const fromDate = format(startDate, 'yyyy-MM-dd');
    const toDate = format(endDate, 'yyyy-MM-dd');
    const reportingMonth = format(startDate, 'yyyy-MM');

    // Fetch all completed transactions for the month
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', `${fromDate}T00:00:00`)
      .lte('created_at', `${toDate}T23:59:59`)
      .order('created_at', { ascending: true });

    if (txError) {
      console.error('Error fetching transactions:', txError);
      return null;
    }

    // Calculate totals
    let grossSales = 0;
    let vatableSales = 0;
    let vatAmount = 0;
    let vatExemptSales = 0;
    let vatZeroRatedSales = 0;
    let totalDiscounts = 0;
    let firstReceiptNumber: string | null = null;
    let lastReceiptNumber: string | null = null;

    if (transactions && transactions.length > 0) {
      firstReceiptNumber = transactions[0].receipt_number;
      lastReceiptNumber = transactions[transactions.length - 1].receipt_number;

      transactions.forEach(tx => {
        grossSales += Number(tx.total) || 0;
        vatableSales += Number(tx.vat_sales) || 0;
        vatAmount += Number(tx.vat_amount) || 0;
        vatExemptSales += Number(tx.vat_exempt_sales) || 0;
        vatZeroRatedSales += Number(tx.zero_rated_sales) || 0;
        totalDiscounts += Number(tx.discount_amount) || Number(tx.discount) || 0;
      });
    }

    // Net sales = Gross - Discounts
    const netSales = grossSales - totalDiscounts;

    // Check if report already exists
    const { data: existingReport } = await supabase
      .from('bir_esales_reports')
      .select('*')
      .eq('store_id', storeId)
      .eq('reporting_month', reportingMonth)
      .single();

    const existingStatus = existingReport?.submission_status as 'draft' | 'submitted' | 'amended' | undefined;

    return {
      storeId,
      storeName: store.name,
      storeAddress: store.address || '',
      tin,
      machineIdentificationNumber: min,
      reportingMonth,
      reportingYear: year,
      reportingMonthNumber: month,
      vatableSales,
      vatAmount,
      vatZeroRatedSales,
      vatExemptSales,
      otherPercentageTaxSales: 0,
      grossSales,
      netSales,
      totalDiscounts,
      totalTransactions: transactions?.length || 0,
      firstReceiptNumber,
      lastReceiptNumber,
      submissionStatus: existingStatus || 'draft',
      amendmentCount: existingReport?.amendment_count || 0,
      salesReportNumber: existingReport?.sales_report_number || null,
      submittedAt: existingReport?.submitted_at || null,
    };
  } catch (error) {
    console.error('Error generating eSales report:', error);
    return null;
  }
}

/**
 * Save eSales report to database
 */
export async function saveESalesReport(report: ESalesMonthlyReport): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('bir_esales_reports')
      .upsert({
        store_id: report.storeId,
        machine_identification_number: report.machineIdentificationNumber,
        reporting_month: report.reportingMonth,
        reporting_year: report.reportingYear,
        reporting_month_number: report.reportingMonthNumber,
        vatable_sales: report.vatableSales,
        vat_amount: report.vatAmount,
        vat_zero_rated_sales: report.vatZeroRatedSales,
        vat_exempt_sales: report.vatExemptSales,
        other_percentage_tax_sales: report.otherPercentageTaxSales,
        gross_sales: report.grossSales,
        net_sales: report.netSales,
        total_discounts: report.totalDiscounts,
        total_transactions: report.totalTransactions,
        first_receipt_number: report.firstReceiptNumber,
        last_receipt_number: report.lastReceiptNumber,
        submission_status: report.submissionStatus,
        amendment_count: report.amendmentCount,
        sales_report_number: report.salesReportNumber,
        submitted_at: report.submittedAt,
      }, {
        onConflict: 'store_id,machine_identification_number,reporting_month'
      });

    if (error) {
      console.error('Error saving eSales report:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving eSales report:', error);
    return false;
  }
}

/**
 * Get submission history for a store
 */
export async function getESalesReportHistory(storeId: string): Promise<ESalesReportHistory[]> {
  try {
    const { data, error } = await supabase
      .from('bir_esales_reports')
      .select('*')
      .eq('store_id', storeId)
      .order('reporting_month', { ascending: false });

    if (error) {
      console.error('Error fetching eSales history:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      reportingMonth: row.reporting_month,
      submissionStatus: row.submission_status,
      salesReportNumber: row.sales_report_number,
      grossSales: Number(row.gross_sales),
      netSales: Number(row.net_sales),
      submittedAt: row.submitted_at,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error('Error fetching eSales history:', error);
    return [];
  }
}

/**
 * Generate BIR eSales file format for upload
 */
export function generateESalesFileContent(report: ESalesMonthlyReport): string {
  const lines: string[] = [];
  
  // Header line per RMO 12-2012 format
  lines.push('BIR eSALES MONTHLY REPORT');
  lines.push(`Machine Identification Number: ${report.machineIdentificationNumber}`);
  lines.push(`Taxpayer Name: ${report.storeName}`);
  lines.push(`TIN: ${report.tin}`);
  lines.push(`Address: ${report.storeAddress}`);
  lines.push(`Reporting Period: ${format(new Date(report.reportingYear, report.reportingMonthNumber - 1), 'MMMM yyyy')}`);
  lines.push('');
  lines.push('SALES BREAKDOWN:');
  lines.push(`VATable Sales (Net of VAT): ${report.vatableSales.toFixed(2)}`);
  lines.push(`VAT Amount (12%): ${report.vatAmount.toFixed(2)}`);
  lines.push(`VAT Zero-Rated Sales: ${report.vatZeroRatedSales.toFixed(2)}`);
  lines.push(`VAT Exempt Sales: ${report.vatExemptSales.toFixed(2)}`);
  lines.push(`Other Percentage Tax Sales: ${report.otherPercentageTaxSales.toFixed(2)}`);
  lines.push('');
  lines.push('SUMMARY:');
  lines.push(`Gross Sales: ${report.grossSales.toFixed(2)}`);
  lines.push(`Total Discounts: ${report.totalDiscounts.toFixed(2)}`);
  lines.push(`Net Sales: ${report.netSales.toFixed(2)}`);
  lines.push(`Total Transactions: ${report.totalTransactions}`);
  lines.push('');
  lines.push('RECEIPT RANGE:');
  lines.push(`First SI No.: ${report.firstReceiptNumber || 'N/A'}`);
  lines.push(`Last SI No.: ${report.lastReceiptNumber || 'N/A'}`);
  lines.push('');
  lines.push(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);

  return lines.join('\n');
}
