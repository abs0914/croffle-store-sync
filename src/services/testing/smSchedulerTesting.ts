import { supabase } from "@/integrations/supabase/client";
import { SMSchedulerService, SMSchedulerConfig } from "../exports/smSchedulerService";

export interface SchedulerTestResult {
  success: boolean;
  message: string;
  details: {
    transactionCount: number;
    emailSent: boolean;
    sftpUploaded: boolean;
    executionTime: number;
    filesGenerated: string[];
    error?: string;
  };
}

export class SMSchedulerTesting {
  /**
   * Test the complete SM Scheduler workflow
   */
  async testScheduler(
    storeId: string, 
    storeName: string = 'Test Store',
    staging: boolean = true
  ): Promise<SchedulerTestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Starting SM Scheduler test for store: ${storeName} (${storeId})`);
      
      // Validate the store exists and is an SM store
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id, name')
        .eq('id', storeId)
        .single();

      if (storeError || !store) {
        throw new Error(`Store validation failed: ${storeError?.message || 'Store not found'}`);
      }

      // Create test configuration
      const config: SMSchedulerConfig = {
        enabled: true,
        emailTo: staging ? 'test-staging@example.com' : 'test-production@example.com',
        sftpHost: staging ? 'staging-sftp.sm.com.ph' : 'production-sftp.sm.com.ph',
        sftpUsername: 'test_user',
        sftpPassword: 'test_password',
        staging,
        storeId,
        storeName: store.name
      };

      // Initialize scheduler service
      const scheduler = new SMSchedulerService(config);

      // Run the test export
      const testResult = await scheduler.testExport();
      
      if (!testResult.success) {
        throw new Error('CSV generation test failed');
      }

      // Test the actual export process (without sending files)
      const exportResult = await this.testExportProcess(config);

      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        message: `SM Scheduler test completed successfully for ${store.name}`,
        details: {
          transactionCount: testResult.transactionCount,
          emailSent: exportResult.emailTested,
          sftpUploaded: exportResult.sftpTested,
          executionTime,
          filesGenerated: [
            `${this.getFilename()}_transactions.csv`,
            `${this.getFilename()}_transactiondetails.csv`
          ]
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        message: `SM Scheduler test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          transactionCount: 0,
          emailSent: false,
          sftpUploaded: false,
          executionTime,
          filesGenerated: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Test the export process via edge function
   */
  private async testExportProcess(config: SMSchedulerConfig): Promise<{
    emailTested: boolean;
    sftpTested: boolean;
  }> {
    try {
      // Test the scheduler edge function
      const { data, error } = await supabase.functions.invoke('sm-accreditation-scheduler', {
        body: {
          action: 'test',
          config
        }
      });

      if (error) {
        console.error('Edge function test failed:', error);
        return { emailTested: false, sftpTested: false };
      }

      console.log('Edge function test result:', data);
      
      return {
        emailTested: data?.testResults?.configValid || false,
        sftpTested: data?.testResults?.sftpConfigured || false
      };

    } catch (error) {
      console.error('Export process test failed:', error);
      return { emailTested: false, sftpTested: false };
    }
  }

  /**
   * Test database functions directly
   */
  async testDatabaseFunctions(storeId: string): Promise<{
    transactionsWorking: boolean;
    detailsWorking: boolean;
    transactionCount: number;
    detailCount: number;
    sampleData?: any;
  }> {
    try {
      // Test the database functions
      const [transactionsResult, detailsResult] = await Promise.all([
        supabase.rpc('export_transactions_csv', { store_id_param: storeId }),
        supabase.rpc('export_transaction_details_csv', { store_id_param: storeId })
      ]);

      return {
        transactionsWorking: !transactionsResult.error,
        detailsWorking: !detailsResult.error,
        transactionCount: transactionsResult.data?.length || 0,
        detailCount: detailsResult.data?.length || 0,
        sampleData: {
          sampleTransaction: transactionsResult.data?.[0] || null,
          sampleDetail: detailsResult.data?.[0] || null
        }
      };

    } catch (error) {
      console.error('Database function test failed:', error);
      return {
        transactionsWorking: false,
        detailsWorking: false,
        transactionCount: 0,
        detailCount: 0
      };
    }
  }

  /**
   * Test complete end-to-end workflow
   */
  async testEndToEnd(
    storeId: string,
    storeName: string,
    staging: boolean = true,
    actuallyEmail: boolean = false
  ): Promise<SchedulerTestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Starting end-to-end SM Scheduler test for store: ${storeName}`);
      
      const config: SMSchedulerConfig = {
        enabled: actuallyEmail,
        emailTo: staging ? 'test-staging@sm.com.ph' : 'test-production@sm.com.ph',
        sftpHost: staging ? 'staging-sftp.sm.com.ph' : undefined,
        sftpUsername: 'test_user',
        staging,
        storeId,
        storeName
      };

      // Test database functions first
      const dbTest = await this.testDatabaseFunctions(storeId);
      
      if (!dbTest.transactionsWorking || !dbTest.detailsWorking) {
        throw new Error('Database functions are not working correctly');
      }

      // If requested, test actual email/SFTP
      let emailResult = { success: false };
      let sftpResult = { success: false };
      
      if (actuallyEmail) {
        const scheduler = new SMSchedulerService(config);
        const fullResult = await scheduler.executeHourlyExport();
        
        emailResult = { success: fullResult.emailSent || false };
        sftpResult = { success: fullResult.uploadSent || false };
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        message: `End-to-end test completed for ${storeName}`,
        details: {
          transactionCount: dbTest.transactionCount,
          emailSent: emailResult.success,
          sftpUploaded: sftpResult.success,
          executionTime,
          filesGenerated: [
            `${this.getFilename()}_transactions.csv`,
            `${this.getFilename()}_transactiondetails.csv`
          ]
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        message: `End-to-end test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          transactionCount: 0,
          emailSent: false,
          sftpUploaded: false,
          executionTime,
          filesGenerated: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private getFilename(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    return `${month}_${year}`;
  }
}