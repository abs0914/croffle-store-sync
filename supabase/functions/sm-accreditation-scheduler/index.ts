import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SchedulerRequest {
  action: 'run' | 'test' | 'status';
  config?: {
    enabled: boolean;
    emailTo: string;
    sftpHost?: string;
    sftpUsername?: string;
    staging: boolean;
    storeId: string;
    storeName?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, config }: SchedulerRequest = await req.json();

    console.log(`SM Accreditation Scheduler - Action: ${action}`);

    let result;
    
    switch (action) {
      case 'run':
        result = await executeScheduledExport(config);
        break;
      case 'test':
        result = await testExportProcess(config);
        break;
      case 'status':
        result = await getSchedulerStatus();
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in sm-accreditation-scheduler function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        message: "Scheduler operation failed"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function executeScheduledExport(config: any) {
  if (!config?.storeId) {
    throw new Error('Store ID is required for SM Accreditation export');
  }

  console.log(`Executing scheduled SM Accreditation export for store: ${config.storeName || config.storeId}...`);
  
  try {
    // Validate the store is an SM store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name')
      .eq('id', config.storeId)
      .or('name.ilike.%SM%,name.ilike.%Savemore%')
      .eq('is_active', true)
      .single();

    if (storeError) {
      throw new Error(`Failed to find SM store: ${storeError.message}`);
    }

    if (!store) {
      throw new Error('Store not found or is not an SM store');
    }

    console.log(`Found SM store: ${store.name} (${store.id})`);

    // Generate CSV data using the database functions for the specified store
    const [transactionsResult, detailsResult] = await Promise.all([
      supabase.rpc('export_transactions_csv', { store_id_param: config.storeId }),
      supabase.rpc('export_transaction_details_csv', { store_id_param: config.storeId })
    ]);

    if (transactionsResult.error) {
      throw new Error(`Transactions export failed: ${transactionsResult.error.message}`);
    }

    if (detailsResult.error) {
      throw new Error(`Transaction details export failed: ${detailsResult.error.message}`);
    }

    // Format CSV content
    const transactions = formatCSVData(transactionsResult.data, [
      'receipt_number', 'business_date', 'transaction_time', 'gross_amount',
      'discount_amount', 'net_amount', 'vat_amount', 'payment_method',
      'discount_type', 'discount_id', 'promo_details', 'senior_discount', 'pwd_discount'
    ]);

    const transactionDetails = formatCSVData(detailsResult.data, [
      'receipt_number', 'item_sequence', 'item_description', 'quantity',
      'unit_price', 'line_total', 'item_discount', 'vat_exempt_flag'
    ]);

    const filename = getFilename();
    
    // Send email if configured
    let emailResult = null;
    if (config && config.emailTo) {
      try {
        const emailResponse = await supabase.functions.invoke('send-sm-accreditation-email', {
          body: {
            emailTo: config.emailTo,
            filename,
            transactions,
            transactionDetails,
            staging: config.staging || false
          }
        });
        emailResult = emailResponse.data;
      } catch (error) {
        console.error('Email sending failed:', error);
        emailResult = { success: false, error: error.message };
      }
    }

    // Upload to SFTP if configured
    let sftpResult = null;
    if (config && config.sftpHost) {
      try {
        const sftpResponse = await supabase.functions.invoke('upload-sm-accreditation-sftp', {
          body: {
            sftpConfig: {
              host: config.sftpHost,
              username: config.sftpUsername,
              password: Deno.env.get("SM_SFTP_PASSWORD") // Store password securely
            },
            filename,
            transactions,
            transactionDetails,
            staging: config.staging || false
          }
        });
        sftpResult = sftpResponse.data;
      } catch (error) {
        console.error('SFTP upload failed:', error);
        sftpResult = { success: false, error: error.message };
      }
    }

    // Log the export activity
    await logExportActivity({
      success: true,
      transaction_count: transactionsResult.data?.length || 0,
      detail_count: detailsResult.data?.length || 0,
      email_sent: emailResult?.success || false,
      sftp_uploaded: sftpResult?.success || false,
      staging: config?.staging || false
    });

    return {
      success: true,
      message: `SM Accreditation export completed for ${store.name}`,
      stats: {
        storeName: store.name,
        storeId: store.id,
        transactionCount: transactionsResult.data?.length || 0,
        detailCount: detailsResult.data?.length || 0,
        emailSent: emailResult?.success || false,
        sftpUploaded: sftpResult?.success || false
      },
      filename,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    await logExportActivity({
      success: false,
      error: error.message,
      staging: config?.staging || false
    });
    throw error;
  }
}

async function testExportProcess(config: any) {
  if (!config?.storeId) {
    throw new Error('Store ID is required for SM Accreditation test');
  }

  console.log(`Testing SM Accreditation export process for store: ${config.storeName || config.storeId}...`);
  
  try {
    // Validate the store is an SM store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name')
      .eq('id', config.storeId)
      .or('name.ilike.%SM%,name.ilike.%Savemore%')
      .eq('is_active', true)
      .single();

    if (storeError) {
      throw new Error(`Failed to find SM store: ${storeError.message}`);
    }

    if (!store) {
      throw new Error('Store not found or is not an SM store');
    }

    console.log(`Testing export for SM store: ${store.name} (${store.id})`);

    const [transactionsResult, detailsResult] = await Promise.all([
      supabase.rpc('export_transactions_csv', { store_id_param: config.storeId }),
      supabase.rpc('export_transaction_details_csv', { store_id_param: config.storeId })
    ]);

    return {
      success: true,
      message: `Test completed successfully for ${store.name}`,
      testResults: {
        storeId: store.id,
        storeName: store.name,
        transactionRecords: transactionsResult.data?.length || 0,
        detailRecords: detailsResult.data?.length || 0,
        sampleTransaction: transactionsResult.data?.[0] || null,
        sampleDetail: detailsResult.data?.[0] || null,
        configValid: !!(config?.emailTo),
        sftpConfigured: !!(config?.sftpHost)
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      message: `Test failed for store ${config?.storeName || config?.storeId}`,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function getSchedulerStatus() {
  // Get recent export logs
  const { data: recentLogs } = await supabase
    .from('bir_audit_logs')
    .select('*')
    .eq('log_type', 'sm_accreditation')
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    success: true,
    status: "SM Accreditation Scheduler Status",
    recentExports: recentLogs || [],
    lastExport: recentLogs?.[0]?.created_at || null,
    timestamp: new Date().toISOString()
  };
}

function formatCSVData(data: any[], headers: string[]): string {
  if (!data || data.length === 0) {
    return headers.join(',');
  }

  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(',')
    )
  ];

  return csvRows.join('\n');
}

function getFilename(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());
  return `${month}_${year}`;
}

async function logExportActivity(data: any) {
  try {
    await supabase.from('bir_audit_logs').insert({
      store_id: '00000000-0000-0000-0000-000000000000',
      log_type: 'sm_accreditation',
      event_name: 'scheduled_export',
      event_data: data,
      terminal_id: 'SCHEDULER',
      cashier_name: 'SM_SYSTEM'
    });
  } catch (error) {
    console.error('Failed to log export activity:', error);
  }
}

serve(handler);