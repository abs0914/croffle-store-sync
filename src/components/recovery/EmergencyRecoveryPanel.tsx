/**
 * Emergency Recovery Panel
 * UI for recovering failed transactions
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { findFailedTransactions, recoverFailedTransactions } from "@/services/recovery/simpleRecoveryService";
import { format } from "date-fns";

interface FailedTransaction {
  id: string;
  receipt_number: string;
  store_id: string;
  total: number;
  created_at: string;
  items: Array<{
    product_id?: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface EmergencyRecoveryPanelProps {
  storeId: string;
}

export function EmergencyRecoveryPanel({ storeId }: EmergencyRecoveryPanelProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [failedTransactions, setFailedTransactions] = useState<FailedTransaction[]>([]);
  const [recoveryResult, setRecoveryResult] = useState<{
    recoveredCount: number;
    failedCount: number;
    errors: string[];
  } | null>(null);

  const handleScan = async () => {
    setIsScanning(true);
    setRecoveryResult(null);
    
    try {
      const failed = await findFailedTransactions(storeId);
      setFailedTransactions(failed);
      
      if (failed.length === 0) {
        toast.success("✅ No failed transactions found!");
      } else {
        toast.warning(`⚠️ Found ${failed.length} transactions missing inventory deductions`);
      }
    } catch (error) {
      console.error('Error scanning transactions:', error);
      toast.error("Failed to scan transactions");
    } finally {
      setIsScanning(false);
    }
  };

  const handleRecover = async () => {
    if (failedTransactions.length === 0) {
      toast.error("No failed transactions to recover");
      return;
    }

    setIsRecovering(true);
    
    try {
      const result = await recoverFailedTransactions(failedTransactions);
      setRecoveryResult(result);
      
      // Refresh the failed transactions list
      if (result.recoveredCount > 0) {
        await handleScan();
      }
    } catch (error) {
      console.error('Error recovering transactions:', error);
      toast.error("Recovery process failed");
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Emergency Transaction Recovery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This tool recovers transactions from September 11th onwards that completed successfully 
            but failed to deduct inventory due to system issues.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button 
            onClick={handleScan}
            disabled={isScanning || isRecovering}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning...' : 'Scan for Failed Transactions'}
          </Button>
          
          {failedTransactions.length > 0 && (
            <Button 
              onClick={handleRecover}
              disabled={isRecovering}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
            >
              <RefreshCw className={`h-4 w-4 ${isRecovering ? 'animate-spin' : ''}`} />
              {isRecovering ? 'Recovering...' : `Recover ${failedTransactions.length} Transactions`}
            </Button>
          )}
        </div>

        {recoveryResult && (
          <Alert className={recoveryResult.recoveredCount > 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {recoveryResult.recoveredCount > 0 ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription>
              <div className="space-y-1">
                <div>Recovery completed:</div>
                <div>✅ Recovered: {recoveryResult.recoveredCount} transactions</div>
                <div>❌ Failed: {recoveryResult.failedCount} transactions</div>
                {recoveryResult.errors.length > 0 && (
                  <div className="mt-2">
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium">View Errors</summary>
                      <div className="mt-1 space-y-1">
                        {recoveryResult.errors.map((error, index) => (
                          <div key={index} className="text-red-600">• {error}</div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {failedTransactions.length > 0 && (
          <div className="space-y-2">
            <Separator />
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-red-700">Failed Transactions Found</h4>
              <Badge variant="destructive">{failedTransactions.length} transactions</Badge>
            </div>
            
            <ScrollArea className="h-64 border rounded-md p-3">
              <div className="space-y-2">
                {failedTransactions.map((transaction) => (
                  <div key={transaction.id} className="p-3 border rounded-md bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{transaction.receipt_number}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                    <div className="text-sm">
                      <div>Total: ₱{transaction.total.toFixed(2)}</div>
                      <div>Items: {transaction.items.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {transaction.items.map(item => `${item.name} (${item.quantity}x)`).join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}