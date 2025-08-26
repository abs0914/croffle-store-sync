import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  validateAllStores, 
  validateStoreData, 
  autoFixIssues,
  ValidationResult, 
  ValidationIssue 
} from '@/services/storeStandardization/dataValidationService';

export function Phase3DataValidation() {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const { toast } = useToast();

  const runValidation = async () => {
    setIsValidating(true);
    try {
      const results = await validateAllStores();
      setValidationResults(results);
      
      const passedCount = results.filter(r => r.status === 'passed').length;
      toast({
        title: "Validation Complete",
        description: `${passedCount}/${results.length} stores passed validation`,
        variant: passedCount === results.length ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Validation failed:', error);
      toast({
        title: "Validation Failed",
        description: "Failed to run store validation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const refreshStoreValidation = async (storeId: string) => {
    try {
      const result = await validateStoreData(storeId);
      setValidationResults(prev => 
        prev.map(r => r.storeId === storeId ? result : r)
      );
      toast({
        title: "Store Updated",
        description: `Validation refreshed for ${result.storeName}`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to refresh store validation",
        variant: "destructive"
      });
    }
  };

  const fixStoreIssues = async (storeId: string, storeName: string) => {
    setIsFixing(true);
    try {
      const storeResult = validationResults.find(r => r.storeId === storeId);
      if (!storeResult) return;

      const issueTypes = [...new Set(storeResult.issues.map(i => i.category))];
      const { fixed, failed } = await autoFixIssues(storeId, issueTypes);

      if (fixed > 0) {
        toast({
          title: "Issues Fixed",
          description: `Fixed ${fixed} issues for ${storeName}. ${failed.length > 0 ? `${failed.length} issues require manual attention.` : ''}`,
        });
        
        // Refresh validation for this store
        await refreshStoreValidation(storeId);
      } else {
        toast({
          title: "No Auto-fixes Available",
          description: "These issues require manual intervention.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Auto-fix Failed",
        description: "Failed to automatically fix issues",
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      passed: "default",
      warning: "secondary", 
      failed: "destructive"
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getIssueIcon = (type: string) => {
    return type === 'error' ? 
      <XCircle className="h-4 w-4 text-red-500" /> : 
      <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const overallScore = validationResults.length > 0 ? 
    Math.round(validationResults.reduce((sum, r) => 
      sum + (r.validationChecks.consistencyScore + r.validationChecks.posReadiness + r.validationChecks.inventoryIntegration) / 3, 0
    ) / validationResults.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Phase 3: Data Consistency Validation</h3>
          <p className="text-sm text-muted-foreground">
            Validate data consistency, POS readiness, recipe costs, and inventory integration
          </p>
        </div>
        <Button 
          onClick={runValidation} 
          disabled={isValidating}
          className="min-w-[120px]"
        >
          {isValidating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Validating...
            </>
          ) : (
            'Run Validation'
          )}
        </Button>
      </div>

      {/* Overall Progress */}
      {validationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Overall Validation Score
              <Badge variant={overallScore >= 90 ? "default" : overallScore >= 70 ? "secondary" : "destructive"}>
                {overallScore}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={overallScore} className="mb-4" />
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-green-600">
                  {validationResults.filter(r => r.status === 'passed').length}
                </div>
                <div className="text-muted-foreground">Passed</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-600">
                  {validationResults.filter(r => r.status === 'warning').length}
                </div>
                <div className="text-muted-foreground">Warnings</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-600">
                  {validationResults.filter(r => r.status === 'failed').length}
                </div>
                <div className="text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Store Results */}
      <div className="space-y-4">
        {validationResults.map(result => (
          <Card key={result.storeId}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <span>{result.storeName}</span>
                  {getStatusBadge(result.status)}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshStoreValidation(result.storeId)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  {result.issues.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fixStoreIssues(result.storeId, result.storeName)}
                      disabled={isFixing}
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      Auto-Fix
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedStore(
                      expandedStore === result.storeId ? null : result.storeId
                    )}
                  >
                    {expandedStore === result.storeId ? 'Hide' : 'Details'}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {/* Validation Metrics */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.validationChecks.consistencyScore}%
                  </div>
                  <div className="text-xs text-muted-foreground">Consistency</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {result.validationChecks.posReadiness}%
                  </div>
                  <div className="text-xs text-muted-foreground">POS Ready</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {result.validationChecks.recipeCostValidation ? '✓' : '✗'}
                  </div>
                  <div className="text-xs text-muted-foreground">Recipe Costs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {result.validationChecks.inventoryIntegration}%
                  </div>
                  <div className="text-xs text-muted-foreground">Inventory</div>
                </div>
              </div>

              {/* Issues Details */}
              {expandedStore === result.storeId && result.issues.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Issues Found ({result.issues.length})</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {result.issues.map((issue, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        {getIssueIcon(issue.type)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{issue.message}</div>
                          {issue.productName && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Product: {issue.productName}
                            </div>
                          )}
                          {issue.suggestedAction && (
                            <div className="text-xs text-blue-600 mt-1">
                              Suggested: {issue.suggestedAction}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {issue.category}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.issues.length === 0 && (
                <div className="text-center py-4 text-green-600">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                  <div>All validation checks passed!</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {validationResults.length === 0 && !isValidating && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Validation Data</h3>
            <p className="text-muted-foreground mb-4">
              Click "Run Validation" to check data consistency across all stores
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}