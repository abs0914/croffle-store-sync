import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Download, FileText, Mail, AlertTriangle, TestTube } from 'lucide-react';
import { SMAccreditationService } from '@/services/exports/smAccreditationService';
import { SMAccreditationTesting } from '@/services/testing/smAccreditationTesting';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ManualCSVDownloaderProps {
  storeId: string;
  storeName?: string;
}

export const ManualCSVDownloader: React.FC<ManualCSVDownloaderProps> = ({ 
  storeId, 
  storeName = 'Selected Store' 
}) => {
  const [downloading, setDownloading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const { toast } = useToast();

  const smService = new SMAccreditationService();

  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      const { transactions, transactionDetails, filename } = await smService.generateCSVFiles(storeId, storeName);
      
      // Download transactions CSV
      const transactionsBlob = new Blob([transactions], { type: 'text/csv' });
      const transactionsUrl = URL.createObjectURL(transactionsBlob);
      const transactionsLink = document.createElement('a');
      transactionsLink.href = transactionsUrl;
      transactionsLink.download = `${filename}_transactions.csv`;
      document.body.appendChild(transactionsLink);
      transactionsLink.click();
      document.body.removeChild(transactionsLink);
      URL.revokeObjectURL(transactionsUrl);

      // Download transaction details CSV
      const detailsBlob = new Blob([transactionDetails], { type: 'text/csv' });
      const detailsUrl = URL.createObjectURL(detailsBlob);
      const detailsLink = document.createElement('a');
      detailsLink.href = detailsUrl;
      detailsLink.download = `${filename}_transactiondetails.csv`;
      document.body.appendChild(detailsLink);
      detailsLink.click();
      document.body.removeChild(detailsLink);
      URL.revokeObjectURL(detailsUrl);

      toast({
        title: "Download Complete",
        description: `Downloaded ${filename}_transactions.csv and ${filename}_transactiondetails.csv`,
      });
    } catch (error) {
      console.error('Error downloading CSV files:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download CSV files. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      // Get store information
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (storeError) throw storeError;

      // Generate CSV files
      const { transactions, transactionDetails, filename } = await smService.generateCSVFiles(storeId, storeName);
      
      // Send email via edge function
      const { data, error } = await supabase.functions.invoke('send-sm-accreditation-email', {
        body: {
          emailTo: 'admin@example.com', // You might want to make this configurable
          filename,
          transactions,
          transactionDetails,
          staging: true, // Set to false for production
          storeInfo: {
            name: store.business_name || store.name,
            address: `${store.address}, ${store.city}, ${store.state} ${store.zip_code}`,
            tin: store.tin || 'N/A'
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `SM Accreditation files sent successfully to admin@example.com`,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Email Failed",
        description: "Failed to send email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Manual CSV Download & Email
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Download or email CSV files for store: <strong>{storeName}</strong>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This will generate CSV files from the last 30 days of actual transaction data for the selected store.
            Files will be in SM Accreditation format with proper BIR compliance.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Files Generated</h4>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>MM_yyyy_transactions.csv - Transaction summary</li>
              <li>MM_yyyy_transactiondetails.csv - Transaction line items</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Data Period</h4>
            <p className="text-sm text-muted-foreground">
              Last 30 rolling days from today
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={handleDownloadCSV} 
            disabled={downloading}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Generating..." : "Download CSV Files"}
          </Button>

          <Button 
            onClick={handleSendEmail} 
            disabled={sendingEmail}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            {sendingEmail ? "Sending..." : "Send via Email"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};