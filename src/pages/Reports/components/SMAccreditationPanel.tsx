import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Mail, Server, Play, TestTube, Clock, CheckCircle, AlertCircle } from "lucide-react";

export function SMAccreditationPanel() {
  const { toast } = useToast();
  
  const [config, setConfig] = useState({
    enabled: false,
    emailTo: 'sia_staging@sm.com.ph',
    sftpHost: '',
    sftpUsername: '',
    staging: true
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [lastExport, setLastExport] = useState<any>(null);

  const handleTestExport = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sm-accreditation-scheduler', {
        body: { action: 'test', config }
      });

      if (error) throw error;

      toast({
        title: "Test Export Completed",
        description: `Found ${data.testResults.transactionRecords} transactions and ${data.testResults.detailRecords} details`,
      });

      setLastExport(data);
    } catch (error) {
      console.error('Test export failed:', error);
      toast({
        title: "Test Export Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunExport = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sm-accreditation-scheduler', {
        body: { action: 'run', config }
      });

      if (error) throw error;

      toast({
        title: "SM Accreditation Export Completed",
        description: `Exported ${data.stats.transactionCount} transactions. Email: ${data.stats.emailSent ? 'Sent' : 'Not configured'}`,
      });

      setLastExport(data);
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualDownload = async () => {
    setIsLoading(true);
    try {
      // Get SM City Cebu store ID first
      const { data: stores, error: storeError } = await supabase
        .from('stores')
        .select('id')
        .ilike('name', '%SM City Cebu%')
        .eq('is_active', true)
        .limit(1);

      if (storeError) throw storeError;
      if (!stores?.[0]?.id) throw new Error('SM City Cebu store not found');

      const storeId = stores[0].id;

      // Generate CSV files for manual download (SM City Cebu only)
      const { data: transactions, error: transError } = await supabase.rpc('export_transactions_csv', {
        store_id_param: storeId
      });
      const { data: details, error: detailError } = await supabase.rpc('export_transaction_details_csv', {
        store_id_param: storeId
      });

      if (transError) throw transError;
      if (detailError) throw detailError;

      // Format and download transactions CSV
      const transactionsCSV = formatCSVForDownload(transactions, [
        'receipt_number', 'business_date', 'transaction_time', 'gross_amount',
        'discount_amount', 'net_amount', 'vat_amount', 'payment_method',
        'discount_type', 'discount_id', 'promo_details', 'senior_discount', 'pwd_discount'
      ]);

      const detailsCSV = formatCSVForDownload(details, [
        'receipt_number', 'item_sequence', 'item_description', 'quantity',
        'unit_price', 'line_total', 'item_discount', 'vat_exempt_flag'
      ]);

      const filename = getFilename();
      
      // Download transactions file
      downloadCSV(transactionsCSV, `${filename}_transactions.csv`);
      
      // Download details file with slight delay
      setTimeout(() => {
        downloadCSV(detailsCSV, `${filename}_transactiondetails.csv`);
      }, 500);

      toast({
        title: "CSV Files Downloaded",
        description: `Downloaded ${filename}_transactions.csv and ${filename}_transactiondetails.csv`,
      });
    } catch (error) {
      console.error('Manual download failed:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCSVForDownload = (data: any[], headers: string[]): string => {
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
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getFilename = (): string => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    return `${month}_${year}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            SM Accreditation Export System - SM City Cebu
          </CardTitle>
          <CardDescription>
            Automated CSV export system for SM City Cebu accreditation compliance. 
            Generates transaction and detail reports for the last 30 days in BIR-compliant format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emailTo">Email Address</Label>
                <Input
                  id="emailTo"
                  value={config.emailTo}
                  onChange={(e) => setConfig({...config, emailTo: e.target.value})}
                  placeholder="sia_staging@sm.com.ph"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sftpHost">SFTP Host (Optional)</Label>
                <Input
                  id="sftpHost"
                  value={config.sftpHost}
                  onChange={(e) => setConfig({...config, sftpHost: e.target.value})}
                  placeholder="staging.sm.com.ph"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sftpUsername">SFTP Username</Label>
                <Input
                  id="sftpUsername"
                  value={config.sftpUsername}
                  onChange={(e) => setConfig({...config, sftpUsername: e.target.value})}
                  placeholder="pos_user"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="staging"
                  checked={config.staging}
                  onCheckedChange={(checked) => setConfig({...config, staging: checked})}
                />
                <Label htmlFor="staging">Staging Environment</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Actions</h3>
            
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={handleManualDownload}
                disabled={isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download CSV Files
              </Button>

              <Button 
                onClick={handleTestExport}
                disabled={isLoading}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                Test Export
              </Button>

              <Button 
                onClick={handleRunExport}
                disabled={isLoading || !config.emailTo}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Run Export & Send
              </Button>
            </div>
          </div>

          <Separator />

          {/* Status Section */}
          {lastExport && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Last Export Status</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status</span>
                      <Badge variant={lastExport.success ? "default" : "destructive"}>
                        {lastExport.success ? "Success" : "Failed"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {lastExport.stats && (
                  <>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Transactions</span>
                          <span className="text-lg font-bold">{lastExport.stats.transactionCount}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Details</span>
                          <span className="text-lg font-bold">{lastExport.stats.detailCount}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              {lastExport.testResults && (
                <div className="space-y-2">
                  <h4 className="font-medium">Test Results</h4>
                  <div className="text-sm space-y-1">
                    <div>Transaction Records: {lastExport.testResults.transactionRecords}</div>
                    <div>Detail Records: {lastExport.testResults.detailRecords}</div>
                    <div>Email Config: {lastExport.testResults.configValid ? '✓' : '✗'}</div>
                    <div>SFTP Config: {lastExport.testResults.sftpConfigured ? '✓' : '✗'}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Requirements Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">SM City Cebu Accreditation Requirements</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">File Specifications:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Filename: MM_YYYY_transactions.csv</li>
                  <li>• Filename: MM_YYYY_transactiondetails.csv</li>
                  <li>• Content: Last 30 rolling days (SM City Cebu only)</li>
                  <li>• Directory: C:\SIA (production)</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Automation:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Scheduler: Run hourly as Administrator</li>
                  <li>• Email: Auto-send to sia_staging@sm.com.ph</li>
                  <li>• SFTP: Upload to SM staging server</li>
                  <li>• Store: SM City Cebu transactions only</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}