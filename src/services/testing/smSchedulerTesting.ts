import { supabase } from '@/integrations/supabase/client';
import { SMAccreditationService } from '@/services/exports/smAccreditationService';
import { SMSchedulerService, SMSchedulerConfig } from '@/services/exports/smSchedulerService';
import { generateVirtualReceipts } from '@/services/reports/receiptPdfGenerator';
import { generateXReadingPdf, generateZReadingPdf } from '@/services/reports/reportPdfGenerator';
import { fetchXReading } from '@/services/reports/modules/xReadingReport';
import { fetchZReading } from '@/services/reports/modules/zReadingReport';

export interface SchedulerTestResult {
  success: boolean;
  message: string;
  details: {
    emailSent: boolean;
    sftpUploaded: boolean;
    transactionCount: number;
    detailCount: number;
    filesGenerated: string[];
    executionTime: number;
    error?: string;
  };
}

export interface TransmissionStatus {
  lastTransmission?: Date;
  emailDelivered: boolean;
  sftpUploaded: boolean;
  recentLogs: Array<{
    timestamp: Date;
    action: string;
    status: string;
    details: string;
  }>;
}

export class SMSchedulerTesting {
  private smService: SMAccreditationService;

  constructor() {
    this.smService = new SMAccreditationService();
  }

  async testScheduler(storeId: string, storeName?: string, staging: boolean = true): Promise<SchedulerTestResult> {
    const startTime = Date.now();
    
    try {
      // Create scheduler configuration
      const config: SMSchedulerConfig = staging 
        ? SMSchedulerService.createStagingConfig(storeId, storeName)
        : SMSchedulerService.createProductionConfig(storeId, storeName);
      
      // Override email for testing
      if (staging) {
        config.emailTo = 'test@example.com'; // Replace with actual test email
      }

      const scheduler = new SMSchedulerService(config);
      
      // Generate CSV files
      console.log('Generating CSV files for scheduler test...');
      const csvFiles = await this.smService.generateCSVFiles(storeId, storeName);
      
      // Generate virtual receipts and reports
      console.log('Generating virtual receipts and reports...');
      const virtualReceiptsPdf = await this.generateVirtualReceiptsPdf(storeId);
      const xReadingPdf = await this.generateXReadingPdf(storeId);
      const zReadingPdf = await this.generateZReadingPdf(storeId);
      
      // Convert PDFs to base64 for email transmission
      const reportPdfs = {
        virtualReceipts: virtualReceiptsPdf ? this.extractBase64FromDataUri(virtualReceiptsPdf) : undefined,
        xReading: xReadingPdf ? this.extractBase64FromDataUri(xReadingPdf) : undefined,
        zReading: zReadingPdf ? this.extractBase64FromDataUri(zReadingPdf) : undefined,
      };

      // Get store information
      const storeInfo = await this.getStoreInfo(storeId);

      // Test email transmission with enhanced data
      console.log('Testing email transmission...');
      const emailResult = await this.testEmailTransmission(
        config.emailTo,
        csvFiles.filename,
        csvFiles.transactions,
        csvFiles.transactionDetails,
        staging,
        storeInfo,
        reportPdfs
      );

      // Test SFTP transmission (if configured)
      let sftpResult = { success: true, error: undefined };
      if (config.sftpHost && config.sftpUsername) {
        console.log('Testing SFTP transmission...');
        sftpResult = await this.testSftpTransmission(
          csvFiles.transactions,
          csvFiles.transactionDetails,
          csvFiles.filename
        );
      }

      const executionTime = Date.now() - startTime;
      const transactionLines = csvFiles.transactions.split('\n').length - 1;
      const detailLines = csvFiles.transactionDetails.split('\n').length - 1;

      const filesGenerated = [
        `${csvFiles.filename}_transactions.csv`,
        `${csvFiles.filename}_transactiondetails.csv`
      ];

      if (reportPdfs.virtualReceipts) filesGenerated.push(`${csvFiles.filename}_virtual_receipts.pdf`);
      if (reportPdfs.xReading) filesGenerated.push(`${csvFiles.filename}_x_reading.pdf`);
      if (reportPdfs.zReading) filesGenerated.push(`${csvFiles.filename}_z_reading.pdf`);

      return {
        success: emailResult.success && sftpResult.success,
        message: emailResult.success && sftpResult.success 
          ? 'Scheduler test completed successfully' 
          : 'Scheduler test completed with some failures',
        details: {
          emailSent: emailResult.success,
          sftpUploaded: sftpResult.success,
          transactionCount: transactionLines,
          detailCount: detailLines,
          filesGenerated,
          executionTime,
          error: !emailResult.success ? emailResult.error : sftpResult.error
        }
      };

    } catch (error) {
      console.error('Scheduler test failed:', error);
      
      return {
        success: false,
        message: 'Scheduler test failed',
        details: {
          emailSent: false,
          sftpUploaded: false,
          transactionCount: 0,
          detailCount: 0,
          filesGenerated: [],
          executionTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async getTransmissionStatus(storeId: string): Promise<TransmissionStatus> {
    try {
      // Query recent transmission logs (this would need a proper logging table)
      const { data: logs } = await supabase
        .from('sm_export_logs')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(10);

      const recentLogs = (logs || []).map(log => ({
        timestamp: new Date(log.created_at),
        action: log.action || 'Export',
        status: log.success ? 'Success' : 'Failed',
        details: log.details || 'No details available'
      }));

      const lastLog = logs?.[0];
      
      return {
        lastTransmission: lastLog ? new Date(lastLog.created_at) : undefined,
        emailDelivered: lastLog?.email_sent || false,
        sftpUploaded: lastLog?.upload_sent || false,
        recentLogs
      };
    } catch (error) {
      console.error('Error getting transmission status:', error);
      return {
        emailDelivered: false,
        sftpUploaded: false,
        recentLogs: []
      };
    }
  }

  private async testEmailTransmission(
    emailTo: string,
    filename: string,
    transactions: string,
    transactionDetails: string,
    staging: boolean,
    storeInfo?: any,
    reportPdfs?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-sm-accreditation-email', {
        body: {
          emailTo,
          filename,
          transactions,
          transactionDetails,
          staging,
          storeInfo,
          reportPdfs
        }
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Email transmission test failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Email transmission failed' 
      };
    }
  }

  private async testSftpTransmission(
    transactions: string,
    transactionDetails: string,
    filename: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('upload-sm-accreditation-sftp', {
        body: {
          transactions,
          transactionDetails,
          filename
        }
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('SFTP transmission test failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'SFTP transmission failed' 
      };
    }
  }

  private async generateVirtualReceiptsPdf(storeId: string): Promise<string | null> {
    try {
      // Get recent transactions for virtual receipts
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_items (
            *,
            products (name)
          )
        `)
        .eq('store_id', storeId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50); // Last 50 transactions for receipts

      if (!transactions || transactions.length === 0) {
        return null;
      }

      // Transform transaction data for receipt generation
      const receiptData = transactions.map(transaction => ({
        ...transaction,
        details: transaction.transaction_items?.map((item: any) => ({
          description: item.products?.name || item.item_name || 'Unknown Item',
          quantity: item.quantity,
          unitPrice: item.unit_price,
          lineTotal: item.total_price,
          itemDiscount: item.discount || 0,
          vatExemptFlag: item.vat_exempt || false
        })) || []
      }));

      return generateVirtualReceipts(receiptData);
    } catch (error) {
      console.error('Error generating virtual receipts PDF:', error);
      return null;
    }
  }

  private async generateXReadingPdf(storeId: string): Promise<string | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const xReadingData = await fetchXReading(storeId, today);
      
      if (xReadingData) {
        return generateXReadingPdf(xReadingData);
      }
      
      return null;
    } catch (error) {
      console.error('Error generating X-Reading PDF:', error);
      return null;
    }
  }

  private async generateZReadingPdf(storeId: string): Promise<string | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const zReadingData = await fetchZReading(storeId, today);
      
      if (zReadingData) {
        return generateZReadingPdf(zReadingData);
      }
      
      return null;
    } catch (error) {
      console.error('Error generating Z-Reading PDF:', error);
      return null;
    }
  }

  private async getStoreInfo(storeId: string) {
    try {
      const { data: store } = await supabase
        .from('stores')
        .select('name, address, tin')
        .eq('id', storeId)
        .single();

      return store ? {
        name: store.name,
        address: store.address || '123 Main Street, City, Province',
        tin: store.tin || '123-456-789-000'
      } : undefined;
    } catch (error) {
      console.error('Error getting store info:', error);
      return undefined;
    }
  }

  private extractBase64FromDataUri(dataUri: string): string {
    // Extract base64 data from data URI (data:application/pdf;base64,...)
    const base64Index = dataUri.indexOf('base64,');
    if (base64Index !== -1) {
      return dataUri.substring(base64Index + 7);
    }
    return dataUri;
  }
}