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
export function EmergencyRecoveryPanel({
  storeId
}: EmergencyRecoveryPanelProps) {
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
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Emergency Recovery Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This tool helps recover failed transactions by applying missing inventory deductions.
            Use with caution - only run when you've identified failed transactions.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button 
            onClick={handleScan} 
            disabled={isScanning}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isScanning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isScanning ? 'Scanning...' : 'Scan for Failed Transactions'}
          </Button>

          {failedTransactions.length > 0 && (
            <Button 
              onClick={handleRecover} 
              disabled={isRecovering}
              variant="destructive"
              className="flex items-center gap-2"
            >
              {isRecovering ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {isRecovering ? 'Recovering...' : `Recover ${failedTransactions.length} Transactions`}
            </Button>
          )}
        </div>

        {failedTransactions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Failed Transactions Found:</h4>
            <ScrollArea className="h-32 border rounded p-2">
              {failedTransactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center py-1 text-sm">
                  <span>#{tx.receipt_number}</span>
                  <Badge variant="destructive" className="text-xs">
                    ${tx.total.toFixed(2)}
                  </Badge>
                </div>
              ))}
            </ScrollArea>
          </div>
        )}

        {recoveryResult && (
          <div className="space-y-2">
            <Separator />
            <h4 className="font-semibold">Recovery Results:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Recovered: {recoveryResult.recoveredCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>Failed: {recoveryResult.failedCount}</span>
              </div>
            </div>
            {recoveryResult.errors.length > 0 && (
              <div className="mt-2">
                <h5 className="font-medium text-destructive mb-1">Errors:</h5>
                <ScrollArea className="h-20 text-xs bg-destructive/5 p-2 rounded">
                  {recoveryResult.errors.map((error, index) => (
                    <div key={index} className="text-destructive">{error}</div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}