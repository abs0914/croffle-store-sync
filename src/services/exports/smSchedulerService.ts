import { SMAccreditationService } from "./smAccreditationService";
import { supabase } from "@/integrations/supabase/client";

export interface SMSchedulerConfig {
  enabled: boolean;
  emailTo: string;
  sftpHost?: string;
  sftpUsername?: string;
  sftpPassword?: string;
  staging: boolean;
  storeId: string;
  storeName?: string;
}

export class SMSchedulerService {
  private config: SMSchedulerConfig;
  private smService: SMAccreditationService;

  constructor(config: SMSchedulerConfig) {
    this.config = config;
    this.smService = new SMAccreditationService();
  }

  /**
   * Execute the hourly SM Accreditation export process
   */
  async executeHourlyExport(): Promise<{
    success: boolean;
    message: string;
    emailSent?: boolean;
    uploadSent?: boolean;
    files?: {
      transactions: string;
      details: string;
    };
  }> {
    try {
      console.log('Starting SM Accreditation hourly export...');
      
      // Generate CSV files for the specified store
      const { transactions, transactionDetails, filename } = await this.smService.generateCSVFiles(this.config.storeId, this.config.storeName);
      
      const results = {
        success: true,
        message: 'Export completed successfully',
        emailSent: false,
        uploadSent: false,
        files: {
          transactions,
          details: transactionDetails
        }
      };

      // Send email to SM staging
      if (this.config.enabled) {
        try {
          const emailResult = await this.sendEmailToSMStaging(
            transactions, 
            transactionDetails, 
            filename
          );
          results.emailSent = emailResult.success;
          
          if (!emailResult.success) {
            console.error('Email send failed:', emailResult.error);
          }
        } catch (error) {
          console.error('Email process failed:', error);
        }

        // Upload to SFTP if configured
        if (this.config.sftpHost) {
          try {
            const uploadResult = await this.uploadToSMStaging(
              transactions,
              transactionDetails,
              filename
            );
            results.uploadSent = uploadResult.success;
            
            if (!uploadResult.success) {
              console.error('SFTP upload failed:', uploadResult.error);
            }
          } catch (error) {
            console.error('SFTP upload process failed:', error);
          }
        }
      }

      // Log the export activity
      await this.logExportActivity(results);

      return results;
    } catch (error) {
      console.error('SM Accreditation export failed:', error);
      
      const errorResult = {
        success: false,
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        emailSent: false,
        uploadSent: false
      };

      await this.logExportActivity(errorResult);
      return errorResult;
    }
  }

  /**
   * Send CSV files via email to SM staging
   */
  private async sendEmailToSMStaging(
    transactions: string,
    transactionDetails: string,
    filename: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Call the email edge function
      const { data, error } = await supabase.functions.invoke('send-sm-accreditation-email', {
        body: {
          emailTo: this.config.emailTo,
          filename,
          transactions,
          transactionDetails,
          staging: this.config.staging
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error' 
      };
    }
  }

  /**
   * Upload CSV files to SM staging server via SFTP
   */
  private async uploadToSMStaging(
    transactions: string,
    transactionDetails: string,
    filename: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Call the SFTP upload edge function
      const { data, error } = await supabase.functions.invoke('upload-sm-accreditation-sftp', {
        body: {
          sftpConfig: {
            host: this.config.sftpHost,
            username: this.config.sftpUsername,
            password: this.config.sftpPassword
          },
          filename,
          transactions,
          transactionDetails,
          staging: this.config.staging
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown SFTP error' 
      };
    }
  }

  /**
   * Log export activity for audit trail
   */
  private async logExportActivity(result: any): Promise<void> {
    try {
      // Use the BIR audit logging function
      const { error } = await supabase.rpc('log_bir_audit', {
        p_store_id: '00000000-0000-0000-0000-000000000000',
        p_log_type: 'sm_accreditation',
        p_event_name: 'hourly_export',
        p_event_data: {
          success: result.success,
          message: result.message,
          email_sent: result.emailSent,
          upload_sent: result.uploadSent,
          timestamp: new Date().toISOString(),
          staging: this.config.staging
        },
        p_terminal_id: 'SYSTEM',
        p_cashier_name: 'SM_SCHEDULER'
      });
      
      if (error) {
        console.error('Failed to log export activity:', error);
      }
    } catch (error) {
      console.error('Failed to log export activity:', error);
    }
  }

  /**
   * Test the export process without sending files
   */
  async testExport(): Promise<{
    success: boolean;
    transactionCount: number;
    detailCount: number;
    sampleData: any;
  }> {
    try {
      const { transactions, transactionDetails } = await this.smService.generateCSVFiles(this.config.storeId, this.config.storeName);
      
      // Parse CSV to count rows (excluding header)
      const transactionRows = transactions.split('\n').length - 1;
      const detailRows = transactionDetails.split('\n').length - 1;
      
      return {
        success: true,
        transactionCount: Math.max(0, transactionRows),
        detailCount: Math.max(0, detailRows),
        sampleData: {
          transactionsPreview: transactions.split('\n').slice(0, 3).join('\n'),
          detailsPreview: transactionDetails.split('\n').slice(0, 3).join('\n')
        }
      };
    } catch (error) {
      console.error('Test export failed:', error);
      return {
        success: false,
        transactionCount: 0,
        detailCount: 0,
        sampleData: null
      };
    }
  }

  /**
   * Create default configuration for staging environment
   */
  static createStagingConfig(storeId: string, storeName?: string): SMSchedulerConfig {
    return {
      enabled: true,
      emailTo: 'sia_staging@sm.com.ph',
      staging: true,
      storeId,
      storeName
    };
  }

  /**
   * Create default configuration for production environment
   */
  static createProductionConfig(storeId: string, storeName?: string): SMSchedulerConfig {
    return {
      enabled: true,
      emailTo: 'sia_production@sm.com.ph',
      staging: false,
      storeId,
      storeName
    };
  }
}