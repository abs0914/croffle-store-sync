import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RobinsonsTransmissionRequest {
  storeId: string;
  salesDate: string;
  isManualResend?: boolean;
  transmissionType?: 'auto' | 'manual';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { storeId, salesDate, isManualResend = false, transmissionType = 'auto' }: RobinsonsTransmissionRequest = await req.json();

    console.log(`🏢 Robinsons Transmission Request:`, { storeId, salesDate, transmissionType });

    // Fetch store's Robinsons configuration
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      throw new Error('Store not found');
    }

    // Validate Robinsons store
    if (!store.robinsons_enabled) {
      return new Response(
        JSON.stringify({ 
          error: "Robinsons transmission not enabled for this store. Please enable it in store settings.",
          success: false
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!store.robinsons_tenant_id) {
      return new Response(
        JSON.stringify({ 
          error: "Robinsons Tenant ID not configured. Please add it in store settings.",
          success: false
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all transactions for the date
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', `${salesDate}T00:00:00`)
      .lt('created_at', `${salesDate}T23:59:59`)
      .order('created_at', { ascending: true });

    if (txError) {
      throw new Error(`Error fetching transactions: ${txError.message}`);
    }

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No transactions found for this date",
          success: false
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${transactions.length} transactions for ${salesDate}`);

    // Calculate values from transactions
    let grossSales = 0;
    let vatAmount = 0;
    let vatSales = 0;
    let vatExemptSales = 0;
    let zeroRatedSales = 0;
    let totalDiscounts = 0;
    let seniorDiscounts = 0;
    let pwdDiscounts = 0;
    let cashSales = 0;
    let nonCashTotal = 0;

    transactions.forEach((t: any) => {
      grossSales += t.subtotal || t.total;
      vatAmount += t.vat_amount || 0;
      vatSales += t.vat_sales || 0;
      vatExemptSales += t.vat_exempt_sales || 0;
      zeroRatedSales += t.zero_rated_sales || 0;
      totalDiscounts += t.discount_amount || 0;
      seniorDiscounts += t.discount_type === 'senior' ? (t.senior_discount || 0) : 0;
      pwdDiscounts += t.discount_type === 'pwd' ? (t.pwd_discount || 0) : 0;

      const paymentMethod = t.payment_method?.toLowerCase() || 'cash';
      if (paymentMethod === 'cash') {
        cashSales += t.total;
      } else {
        nonCashTotal += t.total;
      }
    });

    const netSales = grossSales - vatAmount - totalDiscounts;

    // Get previous EOD counter and grand total
    const { data: lastTransmission } = await supabase
      .from('robinsons_transmission_log')
      .select('eod_counter, file_content')
      .eq('store_id', storeId)
      .eq('status', 'success')
      .order('transmission_date', { ascending: false })
      .limit(1)
      .single();

    const previousEODCounter = lastTransmission?.eod_counter || 0;
    const currentEODCounter = previousEODCounter + 1;

    // Extract previous grand total from line 28 of last transmission
    let previousGrandTotal = 0;
    if (lastTransmission?.file_content) {
      const lines = lastTransmission.file_content.split('\n');
      if (lines.length >= 28) {
        const line28 = lines[27];
        const valueStr = line28.substring(2);
        previousGrandTotal = parseFloat(valueStr) / 100;
      }
    }

    const currentGrandTotal = previousGrandTotal + netSales;

    // Format helper function
    const formatField = (lineNo: number, value: number | string, width: number, decimals?: number): string => {
      const linePrefix = lineNo.toString().padStart(2, '0');
      let formattedValue: string;
      
      if (typeof value === 'number' && decimals !== undefined) {
        const wholePart = Math.floor(value);
        const decimalPart = Math.round((value - wholePart) * Math.pow(10, decimals));
        const combinedValue = wholePart * Math.pow(10, decimals) + decimalPart;
        formattedValue = combinedValue.toString().padStart(width, '0');
      } else {
        formattedValue = value.toString().padStart(width, '0');
      }
      
      return `${linePrefix}${formattedValue}`;
    };

    // Generate 30-line TXT format
    const salesDateStr = salesDate.replace(/-/g, '');
    const beginningReceipt = transactions[0]?.receipt_number || '0000001';
    const endingReceipt = transactions[transactions.length - 1]?.receipt_number || '0000001';

    const lines = [
      formatField(1, store.robinsons_tenant_id, 10),
      formatField(2, '01', 2), // Terminal number
      formatField(3, grossSales, 16, 2),
      formatField(4, vatAmount, 12, 2),
      formatField(5, 0, 12, 2), // Void amount
      formatField(6, 0, 6), // Void count
      formatField(7, seniorDiscounts, 12, 2),
      formatField(8, pwdDiscounts, 12, 2),
      formatField(9, 0, 12, 2), // Other discounts
      formatField(10, totalDiscounts, 12, 2),
      formatField(11, vatSales, 16, 2),
      formatField(12, vatExemptSales, 16, 2),
      formatField(13, zeroRatedSales, 16, 2),
      formatField(14, netSales, 16, 2),
      formatField(15, cashSales, 12, 2),
      formatField(16, 0, 12, 2), // Charge
      formatField(17, 0, 12, 2), // Credit card
      formatField(18, 0, 12, 2), // Gift certificate
      formatField(19, 0, 12, 2), // Debit card
      formatField(20, nonCashTotal, 12, 2),
      formatField(21, transactions.length, 10),
      formatField(22, beginningReceipt, 10),
      formatField(23, endingReceipt, 10),
      formatField(24, salesDateStr, 8),
      formatField(25, previousEODCounter, 6),
      formatField(26, previousGrandTotal, 16, 2),
      formatField(27, currentEODCounter, 6),
      formatField(28, currentGrandTotal, 16, 2),
      formatField(29, 0, 8),
      formatField(30, 0, 8),
    ];

    const fileContent = lines.join('\n');
    const filename = `${store.robinsons_tenant_id}_${salesDateStr}_01.txt`;

    console.log(`📄 Generated file: ${filename}`);

    // TODO: Implement actual SFTP upload when credentials are configured
    // For now, simulate upload
    let sftpSuccess = false;
    let sftpMessage = '';

    if (store.robinsons_sftp_host && store.robinsons_sftp_username) {
      // SFTP upload would happen here
      // Since we don't have credentials yet, we'll mark as pending
      sftpSuccess = false;
      sftpMessage = 'SFTP credentials configured but password not available. Please configure SFTP password secret.';
    } else {
      sftpSuccess = false;
      sftpMessage = 'SFTP not configured. Please add SFTP credentials in store settings.';
    }

    // Log transmission
    const { error: logError } = await supabase
      .from('robinsons_transmission_log')
      .insert({
        store_id: storeId,
        transmission_date: salesDate,
        eod_counter: currentEODCounter,
        file_name: filename,
        record_count: transactions.length,
        file_content: fileContent,
        status: sftpSuccess ? 'success' : 'pending',
        sftp_response: sftpMessage,
        transmission_type: transmissionType,
        retry_count: 0,
      });

    if (logError) {
      console.error('Error logging transmission:', logError);
    }

    // Update store's EOD counter if successful
    if (sftpSuccess) {
      await supabase
        .from('stores')
        .update({ robinsons_eod_counter: currentEODCounter })
        .eq('id', storeId);
    }

    const responseMessage = sftpSuccess
      ? "Sales file successfully sent to RLC server"
      : "Sales file generated but not sent to RLC server. Please configure SFTP credentials.";

    return new Response(
      JSON.stringify({
        success: sftpSuccess,
        message: responseMessage,
        filename,
        recordCount: transactions.length,
        eodCounter: currentEODCounter,
        status: sftpSuccess ? 'success' : 'pending',
        details: {
          grossSales,
          netSales,
          transactionCount: transactions.length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Robinsons transmission error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
