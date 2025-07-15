import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Send, Clock, FileText, Mail } from 'lucide-react';
import { SMSchedulerTesting, SchedulerTestResult } from '@/services/testing/smSchedulerTesting';
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          SM Scheduler & Transmission Test
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test complete workflow: CSV generation, PDF reports, email delivery, and SFTP upload
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            This will generate CSV files, create PDF reports (virtual receipts, X/Z-readings), 
            and test email transmission. SFTP upload will be tested if configured.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
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
      </CardContent>
    </Card>
  );
};