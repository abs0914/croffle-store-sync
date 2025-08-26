import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';
import { ProductCatalogConsistencyReport } from '@/services/productCatalog/enhancedProductCatalogService';

interface ConsistencyMonitorProps {
  report: ProductCatalogConsistencyReport | null;
  lastValidation: Date | null;
  isValidating: boolean;
  isSyncing: boolean;
  onValidate: () => void;
  onSync: () => void;
}

export function ConsistencyMonitor({
  report,
  lastValidation,
  isValidating,
  isSyncing,
  onValidate,
  onSync
}: ConsistencyMonitorProps) {
  const getStatusColor = () => {
    if (!report) return 'secondary';
    return report.totalIssues === 0 ? 'default' : 'destructive';
  };

  const getStatusIcon = () => {
    if (!report) return <RefreshCw className="h-4 w-4" />;
    return report.totalIssues === 0 ? 
      <CheckCircle className="h-4 w-4 text-green-600" /> : 
      <AlertTriangle className="h-4 w-4 text-amber-600" />;
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h3 className="font-medium">Catalog Health</h3>
          <Badge variant={getStatusColor()}>
            {report ? (report.totalIssues === 0 ? 'Healthy' : `${report.totalIssues} Issues`) : 'Unknown'}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onValidate}
            disabled={isValidating}
          >
            {isValidating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Validate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <RotateCcw className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Sync
          </Button>
        </div>
      </div>

      {lastValidation && (
        <p className="text-sm text-muted-foreground">
          Last validated: {lastValidation.toLocaleString()}
        </p>
      )}

      {report && report.totalIssues > 0 && (
        <div className="space-y-2">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Found consistency issues that may affect catalog functionality
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            {report.zeroPriceItems > 0 && (
              <div className="flex justify-between">
                <span>Zero-price items:</span>
                <Badge variant="destructive">{report.zeroPriceItems}</Badge>
              </div>
            )}
            {report.missingRecipes > 0 && (
              <div className="flex justify-between">
                <span>Missing recipes:</span>
                <Badge variant="destructive">{report.missingRecipes}</Badge>
              </div>
            )}
            {report.syncMismatches > 0 && (
              <div className="flex justify-between">
                <span>Sync mismatches:</span>
                <Badge variant="destructive">{report.syncMismatches}</Badge>
              </div>
            )}
            {report.missingCategories > 0 && (
              <div className="flex justify-between">
                <span>Missing categories:</span>
                <Badge variant="destructive">{report.missingCategories}</Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {report && report.totalIssues === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Product catalog is healthy with no consistency issues detected
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
}