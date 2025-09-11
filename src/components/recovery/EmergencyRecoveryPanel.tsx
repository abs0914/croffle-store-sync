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
  return;
}