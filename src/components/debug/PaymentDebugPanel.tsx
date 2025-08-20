import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Bug, Zap, Clock } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useShift } from "@/contexts/shift";
import { supabase } from "@/integrations/supabase/client";
import { BIRValidationService } from "@/services/bir/birValidationService";
import { toast } from "sonner";

export default function PaymentDebugPanel() {
  const { currentStore } = useStore();
  const { currentShift } = useShift();
  const [debugResults, setDebugResults] = useState<any>({});
  const [isRunning, setIsRunning] = useState(false);

  const runPaymentDiagnostics = async () => {
    if (!currentStore) {
      toast.error("No store selected");
      return;
    }

    setIsRunning(true);
    const results: any = {};

    try {
      console.group('🔍 Payment System Diagnostics');
      
      // 1. Store Configuration Check
      console.log('1️⃣ Checking store configuration...');
      results.storeConfig = {
        name: currentStore.name,
        isActive: currentStore.is_active,
        isBirAccredited: currentStore.is_bir_accredited,
        hasPermitNumber: !!currentStore.permit_number,
        hasTin: !!currentStore.tin,
        hasBusinessName: !!currentStore.business_name,
        locationtype: currentStore.location_type,
        ownershipType: currentStore.ownership_type
      };

      // 2. BIR Validation Check
      console.log('2️⃣ Running BIR validation...');
      const birValidation = BIRValidationService.validateStore(currentStore);
      results.birValidation = birValidation;

      // 3. Shift Status Check
      console.log('3️⃣ Checking shift status...');
      results.shiftStatus = {
        hasActiveShift: !!currentShift,
        shiftId: currentShift?.id,
        userId: currentShift?.userId,
        storeId: currentShift?.storeId
      };

      // 4. Database Connection Test
      console.log('4️⃣ Testing database connection...');
      const { data: testQuery, error: dbError } = await supabase
        .from('stores')
        .select('id, name')
        .eq('id', currentStore.id)
        .single();

      results.databaseConnection = {
        success: !dbError,
        error: dbError?.message,
        storeFound: !!testQuery
      };

      // 5. Recent Transaction Check
      console.log('5️⃣ Checking recent transactions...');
      const { data: recentTransactions, error: txError } = await supabase
        .from('transactions')
        .select('id, receipt_number, status, created_at, payment_method')
        .eq('store_id', currentStore.id)
        .order('created_at', { ascending: false })
        .limit(5);

      results.recentTransactions = {
        count: recentTransactions?.length || 0,
        hasErrors: !!txError,
        error: txError?.message,
        lastTransaction: recentTransactions?.[0] || null
      };

      // 6. Inventory Stock Check
      console.log('6️⃣ Checking inventory status...');
      const { data: inventoryCount, error: invError } = await supabase
        .from('inventory_stock')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', currentStore.id)
        .eq('is_active', true);

      results.inventoryStatus = {
        totalItems: inventoryCount || 0,
        hasError: !!invError,
        error: invError?.message
      };

      // 7. Product Catalog Check
      console.log('7️⃣ Checking product catalog...');
      const { data: productCount, error: prodError } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', currentStore.id)
        .eq('is_active', true);

      results.productCatalog = {
        totalProducts: productCount || 0,
        hasError: !!prodError,
        error: prodError?.message
      };

      // 8. Test Payment Simulation
      console.log('8️⃣ Simulating payment validation...');
      const mockTransaction = {
        storeId: currentStore.id,
        shiftId: currentShift?.id,
        items: [{ name: 'Test Item', quantity: 1, price: 100 }],
        total: 100,
        paymentMethod: 'cash'
      };

      results.paymentSimulation = {
        hasStore: !!currentStore,
        hasShift: !!currentShift,
        validTotal: mockTransaction.total > 0,
        validItems: mockTransaction.items.length > 0
      };

      console.groupEnd();
      setDebugResults(results);

    } catch (error) {
      console.error('Diagnostic error:', error);
      results.error = error;
      setDebugResults(results);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === undefined) return <Clock className="h-4 w-4 text-gray-400" />;
    return status ? 
      <CheckCircle className="h-4 w-4 text-green-600" /> : 
      <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  const getStatusText = (status: boolean | undefined) => {
    if (status === undefined) return 'Pending';
    return status ? 'Pass' : 'Fail';
  };

  const getStatusColor = (status: boolean | undefined) => {
    if (status === undefined) return 'secondary';
    return status ? 'default' : 'destructive';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Payment System Diagnostics
          {currentStore && (
            <Badge variant="outline">{currentStore.name}</Badge>
          )}
        </CardTitle>
        <Button 
          onClick={runPaymentDiagnostics} 
          disabled={isRunning}
          className="w-fit"
        >
          {isRunning ? (
            <>
              <Zap className="mr-2 h-4 w-4 animate-pulse" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <Bug className="mr-2 h-4 w-4" />
              Run Full Diagnostic
            </>
          )}
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {Object.keys(debugResults).length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Click "Run Full Diagnostic" to check payment system health
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Store Configuration */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                Store Configuration
                {getStatusIcon(debugResults.storeConfig?.isActive)}
              </h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Active:</span>
                  <Badge variant={getStatusColor(debugResults.storeConfig?.isActive)}>
                    {getStatusText(debugResults.storeConfig?.isActive)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>BIR Accredited:</span>
                  <Badge variant={getStatusColor(debugResults.storeConfig?.isBirAccredited)}>
                    {getStatusText(debugResults.storeConfig?.isBirAccredited)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Has Permit:</span>
                  <Badge variant={getStatusColor(debugResults.storeConfig?.hasPermitNumber)}>
                    {getStatusText(debugResults.storeConfig?.hasPermitNumber)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span className="text-xs">{debugResults.storeConfig?.locationtype}</span>
                </div>
              </div>
            </div>

            {/* BIR Validation */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                BIR Validation
                {getStatusIcon(debugResults.birValidation?.isValid)}
              </h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Valid:</span>
                  <Badge variant={getStatusColor(debugResults.birValidation?.isValid)}>
                    {getStatusText(debugResults.birValidation?.isValid)}
                  </Badge>
                </div>
                {debugResults.birValidation?.errors?.length > 0 && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {debugResults.birValidation.errors.slice(0, 2).map((error: string, i: number) => (
                      <div key={i}>• {error}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Shift Status */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                Shift Status
                {getStatusIcon(debugResults.shiftStatus?.hasActiveShift)}
              </h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Active Shift:</span>
                  <Badge variant={getStatusColor(debugResults.shiftStatus?.hasActiveShift)}>
                    {getStatusText(debugResults.shiftStatus?.hasActiveShift)}
                  </Badge>
                </div>
                {debugResults.shiftStatus?.shiftId && (
                  <div className="text-xs text-muted-foreground">
                    ID: {debugResults.shiftStatus.shiftId.slice(-8)}
                  </div>
                )}
              </div>
            </div>

            {/* Database Connection */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                Database Connection
                {getStatusIcon(debugResults.databaseConnection?.success)}
              </h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Connected:</span>
                  <Badge variant={getStatusColor(debugResults.databaseConnection?.success)}>
                    {getStatusText(debugResults.databaseConnection?.success)}
                  </Badge>
                </div>
                {debugResults.databaseConnection?.error && (
                  <div className="text-xs text-red-600">
                    {debugResults.databaseConnection.error}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                Recent Transactions
                {getStatusIcon(!debugResults.recentTransactions?.hasErrors)}
              </h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Count:</span>
                  <span>{debugResults.recentTransactions?.count || 0}</span>
                </div>
                {debugResults.recentTransactions?.lastTransaction && (
                  <div className="text-xs text-muted-foreground">
                    Last: {debugResults.recentTransactions.lastTransaction.receipt_number}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Simulation */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                Payment Readiness
                {getStatusIcon(
                  debugResults.paymentSimulation?.hasStore && 
                  debugResults.paymentSimulation?.hasShift &&
                  debugResults.paymentSimulation?.validTotal
                )}
              </h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Ready:</span>
                  <Badge variant={getStatusColor(
                    debugResults.paymentSimulation?.hasStore && 
                    debugResults.paymentSimulation?.hasShift &&
                    debugResults.paymentSimulation?.validTotal
                  )}>
                    {getStatusText(
                      debugResults.paymentSimulation?.hasStore && 
                      debugResults.paymentSimulation?.hasShift &&
                      debugResults.paymentSimulation?.validTotal
                    )}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {debugResults.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-600 text-sm font-medium">Diagnostic Error:</p>
            <p className="text-red-600 text-xs">{debugResults.error.toString()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}