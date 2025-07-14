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
      staging 
    }: SMEmailRequest = await req.json();

    console.log(`Sending SM Accreditation email to: ${emailTo}`);
    console.log(`Environment: ${staging ? 'STAGING' : 'PRODUCTION'}`);

    // Create CSV file attachments
    const transactionsFile = new TextEncoder().encode(transactions);
    const detailsFile = new TextEncoder().encode(transactionDetails);

    // Generate transaction summary for email body
    const transactionLines = transactions.split('\n').length - 1; // Exclude header
    const detailLines = transactionDetails.split('\n').length - 1; // Exclude header
    const dateRange = getLast30DaysRange();

    const emailResponse = await resend.emails.send({
      from: "POS System <pos@yourdomain.com>", // Replace with your verified domain
      to: [emailTo],
      subject: `${staging ? '[STAGING] ' : ''}SM Accreditation CSV Export - ${filename}`,
      html: `
        <h2>SM Accreditation CSV Export</h2>
        <p><strong>Environment:</strong> ${staging ? 'STAGING' : 'PRODUCTION'}</p>
        <p><strong>Export Date:</strong> ${new Date().toISOString()}</p>
        <p><strong>Period:</strong> ${dateRange.start} to ${dateRange.end}</p>
        
        <h3>Export Summary</h3>
        <ul>
          <li><strong>Transaction Records:</strong> ${transactionLines}</li>
          <li><strong>Transaction Detail Records:</strong> ${detailLines}</li>
          <li><strong>Files Attached:</strong> 2</li>
        </ul>

        <h3>Files Included</h3>
        <ol>
          <li><code>${filename}_transactions.csv</code> - Main transaction summary</li>
          <li><code>${filename}_transactiondetails.csv</code> - Transaction line items</li>
        </ol>

        <h3>File Specifications</h3>
        <p>Files comply with SM Accreditation requirements:</p>
        <ul>
          <li>Last 30 rolling days of transaction data</li>
          <li>BIR compliant VAT and discount recording</li>
          <li>Senior/PWD discount tracking</li>
          <li>Promo reference recording ([ref]=[name]::format)</li>
        </ul>

        <hr>
        <p><small>This is an automated message from the POS System SM Accreditation Scheduler.</small></p>
        <p><small>Generated at: ${new Date().toISOString()}</small></p>
      `,
      attachments: [
        {
          filename: `${filename}_transactions.csv`,
          content: transactionsFile,
        },
        {
          filename: `${filename}_transactiondetails.csv`,
          content: detailsFile,
        },
      ],
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