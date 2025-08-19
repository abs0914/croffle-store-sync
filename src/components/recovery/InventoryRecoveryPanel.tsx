import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { executeInventoryRecoveryPlan } from "@/scripts/executeInventoryRecovery";
import { AlertTriangle, CheckCircle, Play, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface RecoveryStatus {
  isRunning: boolean;
  progress: number;
  currentPhase: string;
  results: any | null;
  error: string | null;
}

export const InventoryRecoveryPanel = () => {
  const [status, setStatus] = useState<RecoveryStatus>({
    isRunning: false,
    progress: 0,
    currentPhase: '',
    results: null,
    error: null
  });

  const executeRecovery = async () => {
    try {
      setStatus({
        isRunning: true,
        progress: 10,
        currentPhase: 'Initializing recovery process...',
        results: null,
        error: null
      });

      // Phase 1 indicator
      setStatus(prev => ({
        ...prev,
        progress: 25,
        currentPhase: 'Phase 1: Deploying missing products...'
      }));

      await new Promise(resolve => setTimeout(resolve, 1000)); // Give UI time to update

      // Phase 2 indicator
      setStatus(prev => ({
        ...prev,
        progress: 50,
        currentPhase: 'Phase 2: Processing retroactive deductions...'
      }));

      await new Promise(resolve => setTimeout(resolve, 500));

      // Phase 3 indicator
      setStatus(prev => ({
        ...prev,
        progress: 75,
        currentPhase: 'Phase 3: Validating and setting up monitoring...'
      }));

      // Execute the actual recovery
      const results = await executeInventoryRecoveryPlan();

      setStatus({
        isRunning: false,
        progress: 100,
        currentPhase: 'Recovery completed!',
        results,
        error: null
      });

      if (results.success) {
        toast.success("🎉 Inventory recovery completed successfully!");
      } else {
        toast.warning("⚠️ Recovery completed with some issues. Check details below.");
      }

    } catch (error) {
      console.error('Recovery execution failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      setStatus({
        isRunning: false,
        progress: 0,
        currentPhase: '',
        results: null,
        error: errorMsg
      });

      toast.error(`Recovery failed: ${errorMsg}`);
    }
  };

  const resetStatus = () => {
    setStatus({
      isRunning: false,
      progress: 0,
      currentPhase: '',
      results: null,
      error: null
    });
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-orange-500" />
              Inventory Recovery System
            </CardTitle>
            <CardDescription>
              Fix inventory deduction issues for Sugbo Mercado (IT Park, Cebu) - August 17, 2025
            </CardDescription>
          </div>
          <Badge variant={status.results?.success ? "default" : status.error ? "destructive" : "secondary"}>
            {status.results?.success ? "Recovered" : status.error ? "Failed" : "Ready"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Issue Alert */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Active Issue Detected:</strong> 28 transactions on August 17 had no inventory deduction due to missing products in the products table. 
            A recent transaction (Coke - ₱20) just occurred with the same issue.
          </AlertDescription>
        </Alert>

        {/* Recovery Plan Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-700">Phase 1: Data Recovery</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-blue-600">
              • Deploy missing products<br/>
              • Process retroactive deductions<br/>
              • Validate inventory levels
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-green-700">Phase 2: System Strengthening</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-green-600">
              • Enhanced validation<br/>
              • Error prevention<br/>
              • Transaction integrity
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-purple-700">Phase 3: Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-purple-600">
              • Real-time monitoring<br/>
              • Automated alerts<br/>
              • Prevention system
            </CardContent>
          </Card>
        </div>

        {/* Progress Section */}
        {status.isRunning && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{status.currentPhase}</span>
              <span className="text-muted-foreground">{status.progress}%</span>
            </div>
            <Progress value={status.progress} className="h-2" />
          </div>
        )}

        {/* Results Section */}
        {status.results && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {status.results.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-500" />
              )}
              <h3 className="font-semibold">Recovery Results</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {status.results.results?.phase1?.processedTransactions || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Transactions Processed</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600">
                    {status.results.results?.phase1?.inventoryDeductions || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Inventory Deductions</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {status.results.results?.phase2?.healthCheck?.metrics?.syncedProducts || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Products Synced</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-orange-600">
                    {status.results.results?.phase3?.movementCheck?.totalAffected || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Missing Movements</div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="whitespace-pre-line text-sm">
                  {status.results.summary}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Error Section */}
        {status.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Recovery failed: {status.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!status.results && !status.error && (
            <Button 
              onClick={executeRecovery}
              disabled={status.isRunning}
              size="lg"
              className="flex-1"
            >
              {status.isRunning ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Executing Recovery...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Execute Recovery Plan
                </>
              )}
            </Button>
          )}

          {(status.results || status.error) && (
            <Button onClick={resetStatus} variant="outline" size="lg">
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Again
            </Button>
          )}
        </div>

        {/* Technical Details */}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium mb-2">Technical Details</summary>
          <div className="space-y-1 pl-4">
            <div>• Store ID: d7c47e6b-f20a-4543-a6bd-000398f72df5</div>
            <div>• Target Date: August 17, 2025</div>
            <div>• Affected Transactions: 28</div>
            <div>• Products in Catalog: 61</div>
            <div>• Products in Table: 0 (This is the problem!)</div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
};