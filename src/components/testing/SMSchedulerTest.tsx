
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Send, Clock, FileText, Mail, Server, Database, Settings } from 'lucide-react';
import { SMSchedulerTesting, SchedulerTestResult } from '@/services/testing/smSchedulerTesting';
import { ExportHostConfiguration } from './ExportHostConfig';
import { SMExportMonitoring } from './SMExportMonitoring';
import { useToast } from '@/hooks/use-toast';

interface SchedulerTestProps {
  storeId: string;
  storeName?: string;
}

export const SMSchedulerTest: React.FC<SchedulerTestProps> = ({ 
  storeId, 
  storeName = 'Selected Store' 
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<SchedulerTestResult | null>(null);
  const [activeTab, setActiveTab] = useState('legacy');
  const { toast } = useToast();

  const schedulerTesting = new SMSchedulerTesting();

  const runSchedulerTest = async (staging: boolean = true) => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await schedulerTesting.testScheduler(storeId, storeName, staging);
      setTestResult(result);

      toast({
        title: result.success ? "Scheduler Test Passed" : "Scheduler Test Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Scheduler test error:', error);
      toast({
        title: "Test Error",
        description: "Failed to run scheduler test",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const runEndToEndTest = async (staging: boolean = true) => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await schedulerTesting.testEndToEnd(storeId, storeName, staging, false);
      setTestResult(result);

      toast({
        title: result.success ? "End-to-End Test Passed" : "End-to-End Test Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error('End-to-end test error:', error);
      toast({
        title: "Test Error",
        description: "Failed to run end-to-end test",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const runDatabaseFunctionTest = async () => {
    setTesting(true);

    try {
      const result = await schedulerTesting.testDatabaseFunctions(storeId);
      
      toast({
        title: result.transactionsWorking && result.detailsWorking ? "Database Functions Working" : "Database Functions Failed",
        description: `Transactions: ${result.transactionCount}, Details: ${result.detailCount}`,
        variant: result.transactionsWorking && result.detailsWorking ? "default" : "destructive"
      });

      setTestResult({
        success: result.transactionsWorking && result.detailsWorking,
        message: `Database functions test completed`,
        details: {
          transactionCount: result.transactionCount,
          emailSent: false,
          sftpUploaded: false,
          executionTime: 1000,
          filesGenerated: ['transactions.csv', 'transactiondetails.csv']
        }
      });
    } catch (error) {
      console.error('Database function test error:', error);
      toast({
        title: "Test Error",
        description: "Failed to run database function test",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          SM Accreditation Export System
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete SM accreditation workflow: CSV generation, local export host setup, 
          Mosaic Scheduler integration, and delivery testing
        </p>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="legacy">Legacy Testing</TabsTrigger>
            <TabsTrigger value="export-host">Export Host Setup</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="legacy" className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                <strong>Legacy Cloud Testing:</strong> This tests the current cloud-based approach. 
                For production SM accreditation, use the "Export Host Setup" tab to configure 
                local server integration.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => runSchedulerTest(true)} 
                disabled={testing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {testing ? "Testing..." : "Test Staging"}
              </Button>
              
              <Button 
                onClick={() => runSchedulerTest(false)} 
                disabled={testing}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {testing ? "Testing..." : "Test Production"}
              </Button>

              <Button 
                onClick={() => runEndToEndTest(true)} 
                disabled={testing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                {testing ? "Testing..." : "End-to-End Test"}
              </Button>

              <Button 
                onClick={runDatabaseFunctionTest} 
                disabled={testing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                {testing ? "Testing..." : "DB Functions"}
              </Button>
            </div>

            {testResult && (
              <div className="space-y-4">
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <AlertDescription>
                      <strong>{testResult.success ? "SUCCESS" : "FAILED"}</strong> - {testResult.message}
                    </AlertDescription>
                  </div>
                </Alert>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <Badge variant={testResult.details.emailSent ? "default" : "destructive"}>
                      {testResult.details.emailSent ? "Sent" : "Failed"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">Email</p>
                  </div>
                  
                  <div className="text-center">
                    <Badge variant={testResult.details.sftpUploaded ? "default" : "secondary"}>
                      {testResult.details.sftpUploaded ? "Uploaded" : "N/A"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">SFTP</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-2xl font-bold">{testResult.details.transactionCount}</p>
                    <p className="text-xs text-muted-foreground">Transactions</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-2xl font-bold">{testResult.details.filesGenerated.length}</p>
                    <p className="text-xs text-muted-foreground">Files</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Generated Files:</h4>
                  <ul className="text-sm space-y-1">
                    {testResult.details.filesGenerated.map((file, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        {file}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Execution time: {testResult.details.executionTime}ms
                </div>

                {testResult.details.error && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <strong>Error:</strong> {testResult.details.error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="export-host" className="space-y-4">
            <Alert>
              <Server className="h-4 w-4" />
              <AlertDescription>
                <strong>Production Export Host Setup:</strong> Configure your back-office server 
                to run export scripts locally and coordinate with Mosaic Scheduler for SM delivery.
              </AlertDescription>
            </Alert>

            <ExportHostConfiguration 
              storeId={storeId} 
              storeName={storeName} 
            />
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <SMExportMonitoring />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
