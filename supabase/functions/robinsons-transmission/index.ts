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
  downloadOnly?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { storeId, salesDate, isManualResend = false, transmissionType = 'auto', downloadOnly = false }: RobinsonsTransmissionRequest = await req.json();

    console.log(`🏢 Robinsons Transmission Request:`, { storeId, salesDate, transmissionType, downloadOnly });

    // Fetch store's Robinsons configuration
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      throw new Error('Store not found');
    }

    // For SFTP transmission, require full configuration
    if (!downloadOnly) {
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
    }

    const tenantId = store.robinsons_tenant_id || 'PENDING_ID';

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

    // Calculate values from transactions according to RLC checklist
    let grossSales = 0;
    let vatAmount = 0;
    let totalDiscounts = 0;
    let discountedTransactionCount = 0;
    let voidAmount = 0;
    let voidCount = 0;
    let refundAmount = 0;
    let refundCount = 0;
    let creditSales = 0; // Non-cash sales (card, e-wallet, etc.)
    let pwdDiscounts = 0;

    transactions.forEach((t: any) => {
      // Gross Sales = total including VAT (RLC requirement)
      grossSales += t.total || t.subtotal || 0;
      vatAmount += t.vat_amount || 0;
      
      // Total discounts
      const discountAmt = t.discount_amount || 0;
      totalDiscounts += discountAmt;
      if (discountAmt > 0) {
        discountedTransactionCount++;
      }

      // PWD discounts
      if (t.discount_type === 'pwd' || t.pwd_discount) {
        pwdDiscounts += t.pwd_discount || t.discount_amount || 0;
      }

      // Void transactions (status === 'voided' or 'void')
      if (t.status === 'voided' || t.status === 'void') {
        voidAmount += t.total || 0;
        voidCount++;
      }

      // Refund transactions
      if (t.status === 'refunded' || t.order_status === 'refunded') {
        refundAmount += t.total || 0;
        refundCount++;
      }

      // Credit sales (non-cash payments)
      const paymentMethod = (t.payment_method || 'cash').toLowerCase();
      if (paymentMethod !== 'cash') {
        creditSales += t.total || 0;
      }
    });

    // Calculate credit VAT (VAT portion of credit sales)
    // Assuming 12% VAT: creditVat = creditSales * 0.12 / 1.12
    const creditVat = creditSales * 0.12 / 1.12;

    // Non-VAT sales (vat_exempt + zero_rated)
    let nonVatSales = 0;
    transactions.forEach((t: any) => {
      nonVatSales += (t.vat_exempt_sales || 0) + (t.zero_rated_sales || 0);
    });

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

    // Extract previous grand total from line 17 of last transmission (Current Accumulated Grand Total)
    let previousGrandTotal = 0;
    if (lastTransmission?.file_content) {
      const lines = lastTransmission.file_content.split('\n');
      if (lines.length >= 17) {
        const line17 = lines[16]; // 0-indexed
        const valueStr = line17.substring(2); // Remove line number prefix
        previousGrandTotal = parseFloat(valueStr) / 100; // Convert from cents
      }
    }

    const currentGrandTotal = previousGrandTotal + grossSales;

    // Format helper function - RLC requires right-justified, zero-padded values
    const formatField = (lineNo: number, value: number | string, width: number, decimals?: number): string => {
      const linePrefix = lineNo.toString().padStart(2, '0');
      let formattedValue: string;
      
      if (typeof value === 'number' && decimals !== undefined) {
        // For decimal values: multiply by 10^decimals to get integer representation
        const intValue = Math.round(value * Math.pow(10, decimals));
        formattedValue = intValue.toString().padStart(width, '0');
      } else if (typeof value === 'number') {
        formattedValue = Math.round(value).toString().padStart(width, '0');
      } else {
        // For string values, pad with spaces on left for right-justification
        formattedValue = value.toString().padStart(width, ' ');
      }
      
      return `${linePrefix}${formattedValue}`;
    };

    // Format date as MM/DD/YYYY (RLC requirement for Line 18)
    const dateParts = salesDate.split('-'); // YYYY-MM-DD
    const formattedDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`; // MM/DD/YYYY

    // Generate 30-line TXT format according to RLC checklist
    const lines = [
      // Line 01: Tenant ID (width 10)
      formatField(1, tenantId, 10),
      
      // Line 02: POS Terminal No. (width 2)
      formatField(2, '01', 2),
      
      // Line 03: Gross Sales (width 16, 2 decimals)
      formatField(3, grossSales, 16, 2),
      
      // Line 04: Total Tax/VAT (width 12, 2 decimals)
      formatField(4, vatAmount, 12, 2),
      
      // Line 05: Total Amount Void/Error Correct (width 12, 2 decimals)
      formatField(5, voidAmount, 12, 2),
      
      // Line 06: No. of Void Transactions (width 6)
      formatField(6, voidCount, 6),
      
      // Line 07: Total Amount Discount (width 12, 2 decimals) - ALL discounts
      formatField(7, totalDiscounts, 12, 2),
      
      // Line 08: No. of Discounted Transactions (width 6)
      formatField(8, discountedTransactionCount, 6),
      
      // Line 09: Total Amount Refund/Return (width 12, 2 decimals)
      formatField(9, refundAmount, 12, 2),
      
      // Line 10: No. of Refunded Transactions (width 6)
      formatField(10, refundCount, 6),
      
      // Line 11: Other Negative Adjustments (width 12, 2 decimals)
      formatField(11, 0, 12, 2),
      
      // Line 12: No. of Recorded Negative Adjustments (width 6)
      formatField(12, 0, 6),
      
      // Line 13: Total Service Charge (width 12, 2 decimals)
      formatField(13, 0, 12, 2),
      
      // Line 14: Previous EOD Counter (width 5)
      formatField(14, previousEODCounter, 5),
      
      // Line 15: Previous Accumulated Grand Total (width 16, 2 decimals)
      formatField(15, previousGrandTotal, 16, 2),
      
      // Line 16: Current EOD Counter (width 5)
      formatField(16, currentEODCounter, 5),
      
      // Line 17: Current Accumulated Grand Total (width 16, 2 decimals)
      formatField(17, currentGrandTotal, 16, 2),
      
      // Line 18: Sales Transaction Date (width 10) - FORMAT: MM/DD/YYYY
      formatField(18, formattedDate, 10),
      
      // Line 19: Novelty/Promotional items (width 16, 2 decimals)
      formatField(19, 0, 16, 2),
      
      // Line 20: Misc. Sales Scrap (width 16, 2 decimals)
      formatField(20, 0, 16, 2),
      
      // Line 21: Local Tax/Government Tax (width 16, 2 decimals)
      formatField(21, 0, 16, 2),
      
      // Line 22: Total Credit Sales (width 16, 2 decimals) - non-cash sales
      formatField(22, creditSales, 16, 2),
      
      // Line 23: Total Credit Tax/Vat (width 16, 2 decimals)
      formatField(23, creditVat, 16, 2),
      
      // Line 24: Total Non-Vat Sales (width 16, 2 decimals)
      formatField(24, nonVatSales, 16, 2),
      
      // Line 25: Pharma Sales (width 16, 2 decimals)
      formatField(25, 0, 16, 2),
      
      // Line 26: Non-Pharma Sales (width 16, 2 decimals) - same as gross for non-pharma business
      formatField(26, grossSales, 16, 2),
      
      // Line 27: Person with Disability Discount (width 16, 2 decimals)
      formatField(27, pwdDiscounts, 16, 2),
      
      // Line 28: Gross Sales not subject to % rent (width 16, 2 decimals)
      formatField(28, 0, 16, 2),
      
      // Line 29: Total Amount of re-printed transactions (width 12, 2 decimals)
      formatField(29, 0, 12, 2),
      
      // Line 30: Number of re-printed transactions (width 16)
      formatField(30, 0, 16),
    ];

    const fileContent = lines.join('\n');
    const salesDateStr = salesDate.replace(/-/g, '');
    const filename = `${tenantId}_${salesDateStr}_01.txt`;

    console.log(`📄 Generated file: ${filename}`);
    console.log(`📋 File content preview:\n${fileContent}`);

    // SFTP upload logic
    let sftpSuccess = false;
    let sftpMessage = '';

    if (store.robinsons_sftp_host && store.robinsons_sftp_username) {
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
        fileContent,
        recordCount: transactions.length,
        eodCounter: currentEODCounter,
        status: sftpSuccess ? 'success' : 'pending',
        details: {
          grossSales,
          vatAmount,
          totalDiscounts,
          discountedTransactionCount,
          creditSales,
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
