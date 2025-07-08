import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { 
  updateAllProductsAvailability,
  AvailabilityCheckResult,
  setupAutomaticAvailabilityMonitoring
} from '@/services/productCatalog/automaticAvailabilityService';
import { toast } from 'sonner';

interface AvailabilityMonitorProps {
  storeId: string;
  className?: string;
}

export const AvailabilityMonitor: React.FC<AvailabilityMonitorProps> = ({
  storeId,
  className = ""
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [results, setResults] = useState<AvailabilityCheckResult[]>([]);
  const [stats, setStats] = useState({
    totalChecked: 0,
    totalUpdated: 0,
    available: 0,
    outOfStock: 0,
    lowStock: 0
  });

  // Set up automatic monitoring
  useEffect(() => {
    if (!storeId) return;

    const cleanup = setupAutomaticAvailabilityMonitoring(storeId);
    return cleanup;
  }, [storeId]);

  const handleManualCheck = async () => {
    if (!storeId) return;

    setIsChecking(true);
    try {
      const result = await updateAllProductsAvailability(storeId, false);
      
      setResults(result.results);
      setLastCheck(new Date());
      
      // Calculate stats
      const available = result.results.filter(r => r.canMake).length;
      const outOfStock = result.results.filter(r => !r.canMake).length;
      const lowStock = result.results.filter(r => r.canMake && r.maxQuantity < 10).length;
      
      setStats({
        totalChecked: result.totalChecked,
        totalUpdated: result.totalUpdated,
        available,
        outOfStock,
        lowStock
      });

      if (result.totalUpdated > 0) {
        toast.success(`Updated ${result.totalUpdated} products`);
      } else {
        toast.info('All products are up to date');
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      toast.error('Failed to check product availability');
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (result: AvailabilityCheckResult) => {
    if (result.canMake) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusBadge = (result: AvailabilityCheckResult) => {
    if (result.canMake) {
      if (result.maxQuantity < 10) {
        return <Badge variant="secondary">Low Stock</Badge>;
      }
      return <Badge variant="default">Available</Badge>;
    } else {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Availability Monitor
            </CardTitle>
            <Button
              onClick={handleManualCheck}
              disabled={isChecking}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking...' : 'Check Now'}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Stats Summary */}
          {stats.totalChecked > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
                <div className="text-sm text-muted-foreground">Out of Stock</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
                <div className="text-sm text-muted-foreground">Low Stock</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalUpdated}</div>
                <div className="text-sm text-muted-foreground">Updated</div>
              </div>
            </div>
          )}

          {/* Last Check Info */}
          {lastCheck && (
            <div className="text-sm text-muted-foreground">
              Last checked: {lastCheck.toLocaleString()}
            </div>
          )}

          {/* Results List */}
          {results.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <h4 className="font-semibold text-sm">Recent Changes:</h4>
              {results
                .filter(r => r.currentStatus !== r.suggestedStatus)
                .slice(0, 10)
                .map((result) => (
                  <div
                    key={result.productId}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result)}
                      <span className="font-medium text-sm">{result.productName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(result)}
                      {result.maxQuantity < Infinity && (
                        <span className="text-xs text-muted-foreground">
                          Max: {result.maxQuantity}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Auto-monitoring indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Auto-checking every 5 minutes</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AvailabilityMonitor;
