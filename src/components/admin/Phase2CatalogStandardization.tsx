import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertTriangle, Loader2, Package, ShoppingCart, FolderTree } from 'lucide-react';
import { toast } from 'sonner';
import { 
  auditProductCatalogs,
  executePhase2Standardization,
  getSugboMercadoBaseline,
  type ProductCatalogAudit,
  type CatalogStandardizationResult 
} from '@/services/storeStandardization/catalogStandardizationService';

export const Phase2CatalogStandardization: React.FC = () => {
  const [auditResults, setAuditResults] = useState<ProductCatalogAudit[]>([]);
  const [standardizationResults, setStandardizationResults] = useState<CatalogStandardizationResult[]>([]);
  const [sugboBaseline, setSugboBaseline] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isStandardizing, setIsStandardizing] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadBaseline();
  }, []);

  const loadBaseline = async () => {
    try {
      setIsLoading(true);
      const baseline = await getSugboMercadoBaseline();
      setSugboBaseline(baseline);
    } catch (error) {
      console.error('Error loading baseline:', error);
      toast.error('Failed to load baseline data');
    } finally {
      setIsLoading(false);
    }
  };

  const runCatalogAudit = async () => {
    try {
      setIsAuditing(true);
      setCurrentPhase('Auditing product catalogs across all stores...');
      setProgress(20);

      const audits = await auditProductCatalogs();
      setAuditResults(audits);
      
      setProgress(100);
      setCurrentPhase('Audit completed');
      toast.success('Catalog audit completed successfully');

    } catch (error) {
      console.error('Error during audit:', error);
      toast.error('Audit failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsAuditing(false);
      setTimeout(() => {
        setCurrentPhase('');
        setProgress(0);
      }, 2000);
    }
  };

  const executeStandardization = async () => {
    try {
      setIsStandardizing(true);
      setProgress(0);
      setCurrentPhase('Phase 2: Standardizing product catalogs...');

      setProgress(20);
      const results = await executePhase2Standardization();
      setStandardizationResults(results);

      setProgress(80);
      setCurrentPhase('Refreshing audit data...');
      
      // Refresh audit after standardization
      const updatedAudits = await auditProductCatalogs();
      setAuditResults(updatedAudits);

      setProgress(100);
      setCurrentPhase('Phase 2 Complete!');

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        toast.success(`Successfully standardized ${successCount} store catalogs`);
      }
      if (failedCount > 0) {
        toast.error(`Failed to standardize ${failedCount} stores`);
      }

    } catch (error) {
      console.error('Error during standardization:', error);
      toast.error('Standardization failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsStandardizing(false);
      setTimeout(() => {
        setCurrentPhase('');
        setProgress(0);
      }, 3000);
    }
  };

  const getCompletionStatus = (audit: ProductCatalogAudit) => {
    const completionPercentage = sugboBaseline ? 
      Math.round((audit.availableProducts / sugboBaseline.products.length) * 100) : 0;
    
    if (completionPercentage >= 95) return { status: 'complete', color: 'bg-green-100 text-green-800' };
    if (completionPercentage >= 80) return { status: 'good', color: 'bg-blue-100 text-blue-800' };
    if (completionPercentage >= 60) return { status: 'fair', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'needs-work', color: 'bg-red-100 text-red-800' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading baseline data...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Phase 2: Product Catalog Standardization
          </CardTitle>
          <CardDescription>
            Standardize product catalogs and categories across all stores using Sugbo Mercado as the baseline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Baseline Summary */}
          {sugboBaseline && (
            <Alert>
              <ShoppingCart className="h-4 w-4" />
              <AlertDescription>
                <strong>Baseline (Sugbo Mercado):</strong> {sugboBaseline.products.length} products, {sugboBaseline.categories.length} categories
                <br />
                All other stores will be standardized to match this structure while preserving Sugbo Mercado unchanged.
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Indicator */}
          {(isAuditing || isStandardizing) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{currentPhase}</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={runCatalogAudit}
              disabled={isAuditing || isStandardizing}
              variant="outline"
            >
              {isAuditing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Auditing...
                </>
              ) : (
                <>
                  <FolderTree className="h-4 w-4 mr-2" />
                  Run Catalog Audit
                </>
              )}
            </Button>
            
            <Button 
              onClick={executeStandardization}
              disabled={isAuditing || isStandardizing}
            >
              {isStandardizing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Standardizing...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Execute Phase 2 Standardization
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="audit">Audit Results</TabsTrigger>
          <TabsTrigger value="standardization">Standardization Results</TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Product Catalog Audit</CardTitle>
              <CardDescription>
                Completeness analysis for each store compared to Sugbo Mercado baseline
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditResults.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No audit data available. Click "Run Catalog Audit" to analyze stores.
                </p>
              ) : (
                <div className="space-y-4">
                  {auditResults.map((audit) => {
                    const status = getCompletionStatus(audit);
                    const completionPercentage = sugboBaseline ? 
                      Math.round((audit.availableProducts / sugboBaseline.products.length) * 100) : 0;
                    
                    return (
                      <div key={audit.storeId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{audit.storeName}</h4>
                          <Badge className={status.color}>
                            {completionPercentage}% Complete
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Products:</span>
                            <div className="font-medium">{audit.availableProducts}/{sugboBaseline?.products.length || 0}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">With Recipes:</span>
                            <div className="font-medium">{audit.productsWithRecipes}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Categories:</span>
                            <div className="font-medium">{audit.categoryCount}/{sugboBaseline?.categories.length || 0}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Issues:</span>
                            <div className="font-medium text-orange-600">{audit.inconsistencies.length}</div>
                          </div>
                        </div>

                        {audit.missingProducts.length > 0 && (
                          <div className="mt-3 text-sm">
                            <span className="text-muted-foreground">Missing products:</span>
                            <div className="text-orange-600">{audit.missingProducts.length} missing</div>
                          </div>
                        )}

                        {audit.inconsistencies.length > 0 && (
                          <div className="mt-2">
                            <div className="text-sm text-orange-600">
                              {audit.inconsistencies.join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standardization">
          <Card>
            <CardHeader>
              <CardTitle>Standardization Results</CardTitle>
              <CardDescription>
                Results from the latest Phase 2 execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              {standardizationResults.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No standardization results available. Execute Phase 2 to see results.
                </p>
              ) : (
                <div className="space-y-3">
                  {standardizationResults.map((result) => (
                    <div key={result.storeId} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <h4 className="font-medium flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                          {result.storeName}
                        </h4>
                        {result.success ? (
                          <div className="text-sm text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                            <span>+{result.addedProducts} products</span>
                            <span>~{result.updatedProducts} updated</span>
                            <span>+{result.addedCategories} categories</span>
                            <span>{result.fixedLinks} links fixed</span>
                          </div>
                        ) : (
                          <div className="text-sm text-red-600 mt-1">
                            {result.errors.slice(0, 2).map((error, idx) => (
                              <div key={idx}>{error}</div>
                            ))}
                            {result.errors.length > 2 && (
                              <div>...and {result.errors.length - 2} more errors</div>
                            )}
                          </div>
                        )}
                      </div>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "Success" : "Failed"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};