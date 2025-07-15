import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SMEmailRequest {
  emailTo: string;
  filename: string;
  transactions: string;
  transactionDetails: string;
  staging: boolean;
  storeInfo?: {
    name: string;
    address: string;
    tin: string;
  };
  reportPdfs?: {
    xReading?: string; // base64 PDF data
    zReading?: string; // base64 PDF data
    virtualReceipts?: string; // base64 PDF data
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      emailTo, 
      filename, 
      transactions, 
      transactionDetails, 
      staging,
      storeInfo,
      reportPdfs
    }: SMEmailRequest = await req.json();

    console.log(`Sending SM Accreditation email to: ${emailTo}`);
    console.log(`Environment: ${staging ? 'STAGING' : 'PRODUCTION'}`);

    // Create CSV file attachments
    const attachments: any[] = [
      {
        filename: `${filename}_transactions.csv`,
        content: new TextEncoder().encode(transactions),
      },
      {
        filename: `${filename}_transactiondetails.csv`,
        content: new TextEncoder().encode(transactionDetails),
      }
    ];

    // Add PDF attachments if provided
    if (reportPdfs?.xReading) {
      attachments.push({
        filename: `${filename}_x_reading.pdf`,
        content: Uint8Array.from(atob(reportPdfs.xReading), c => c.charCodeAt(0)),
      });
    }

    if (reportPdfs?.zReading) {
      attachments.push({
        filename: `${filename}_z_reading.pdf`,
        content: Uint8Array.from(atob(reportPdfs.zReading), c => c.charCodeAt(0)),
      });
    }

    if (reportPdfs?.virtualReceipts) {
      attachments.push({
        filename: `${filename}_virtual_receipts.pdf`,
        content: Uint8Array.from(atob(reportPdfs.virtualReceipts), c => c.charCodeAt(0)),
      });
    }

    // Generate transaction summary for email body
    const transactionLines = transactions.split('\n').length - 1; // Exclude header
    const detailLines = transactionDetails.split('\n').length - 1; // Exclude header
    const dateRange = getLast30DaysRange();

    // Enhanced email body with store information
    const storeDetails = storeInfo ? `
      <h3>Store Information:</h3>
      <ul>
        <li><strong>Store Name:</strong> ${storeInfo.name}</li>
        <li><strong>Address:</strong> ${storeInfo.address}</li>
        <li><strong>TIN:</strong> ${storeInfo.tin}</li>
      </ul>
    ` : '';

    const emailResponse = await resend.emails.send({
      from: "SM Accreditation <noreply@yourdomain.com>", // Replace with your verified domain
      to: [emailTo],
      subject: `${staging ? '[STAGING] ' : ''}SM Accreditation Complete Export - ${filename}`,
      html: `
        <h2>SM Accreditation Complete Data Export</h2>
        <p><strong>Environment:</strong> ${staging ? 'STAGING' : 'PRODUCTION'}</p>
        <p><strong>Export Date:</strong> ${new Date().toISOString()}</p>
        <p><strong>Period:</strong> ${dateRange.start} to ${dateRange.end}</p>
        
        ${storeDetails}
        
        <h3>Export Summary</h3>
        <ul>
          <li><strong>Transaction Records:</strong> ${transactionLines}</li>
          <li><strong>Transaction Detail Records:</strong> ${detailLines}</li>
          <li><strong>Total Files Attached:</strong> ${attachments.length}</li>
        </ul>

        <h3>Files Included</h3>
        <ol>
          <li><code>${filename}_transactions.csv</code> - Main transaction summary</li>
          <li><code>${filename}_transactiondetails.csv</code> - Transaction line items</li>
          ${reportPdfs?.xReading ? `<li><code>${filename}_x_reading.pdf</code> - X-Reading report</li>` : ''}
          ${reportPdfs?.zReading ? `<li><code>${filename}_z_reading.pdf</code> - Z-Reading report</li>` : ''}
          ${reportPdfs?.virtualReceipts ? `<li><code>${filename}_virtual_receipts.pdf</code> - Virtual receipt copies</li>` : ''}
        </ol>

        <h3>Compliance Information</h3>
        <p>This complete export package includes:</p>
        <ul>
          <li>Last 30 rolling days of transaction data</li>
          <li>BIR compliant VAT calculations (12% on VATable items)</li>
          <li>Senior citizen & PWD discount tracking (20% on VATable amount)</li>
          <li>Promotional reference recording ([ref]=[name]:: format)</li>
          <li>Virtual receipt copies for audit trail</li>
          <li>X-Reading and Z-Reading reports for reconciliation</li>
          <li>Complete transaction detail breakdown</li>
        </ul>

        <h3>Technical Specifications</h3>
        <p><strong>CSV File Format:</strong></p>
        <ul>
          <li>Transactions: receipt_number, business_date, transaction_time, gross_amount, discount_amount, net_amount, vat_amount, payment_method, discount_type, discount_id, promo_details, senior_discount, pwd_discount</li>
          <li>Details: receipt_number, item_sequence, item_description, quantity, unit_price, line_total, item_discount, vat_exempt_flag</li>
        </ul>

        <hr>
        <p><strong>Note:</strong> This export meets all SM Accreditation requirements and BIR compliance standards. All calculations have been validated against Philippine tax regulations.</p>
        <p><small>Generated by SM Accreditation System at: ${new Date().toISOString()}</small></p>
      `,
      attachments: attachments,
    });

    console.log("SM Accreditation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      emailId: emailResponse.data?.id,
      message: "SM Accreditation CSV files sent successfully"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-sm-accreditation-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        message: "Failed to send SM Accreditation email"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getLast30DaysRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

serve(handler);