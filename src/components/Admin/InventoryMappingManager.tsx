import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, AlertTriangle, CheckCircle, MapPin, Package } from 'lucide-react';
import { toast } from 'sonner';
import { 
  validateInventoryMappings,
  fixCrossStoreMappings,
  standardizeInventoryAcrossStores,
  type InventoryMappingValidation,
  type MappingFixResult
} from '@/services/recipeManagement/inventoryMappingService';

interface InventoryMappingManagerProps {
  storeId?: string;
}

export const InventoryMappingManager: React.FC<InventoryMappingManagerProps> = ({
  storeId
}) => {
  const [validation, setValidation] = useState<InventoryMappingValidation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isStandardizing, setIsStandardizing] = useState(false);
  const [fixResults, setFixResults] = useState<MappingFixResult | null>(null);

  const loadValidation = async () => {
    setIsLoading(true);
    try {
      const result = await validateInventoryMappings(storeId);
      setValidation(result);
    } catch (error) {
      console.error('Error loading validation:', error);
      toast.error('Failed to validate inventory mappings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadValidation();
  }, [storeId]);

  const handleFixMappings = async () => {
    setIsFixing(true);
    try {
      const result = await fixCrossStoreMappings(storeId);
      setFixResults(result);
      await loadValidation(); // Reload to see updated state
    } catch (error) {
      console.error('Error fixing mappings:', error);
      toast.error('Failed to fix mappings');
    } finally {
      setIsFixing(false);
    }
  };

  const handleStandardizeInventory = async () => {
    setIsStandardizing(true);
    try {
      const result = await standardizeInventoryAcrossStores();
      if (result.created > 0) {
        toast.success(`Created ${result.created} missing inventory items`);
        await loadValidation(); // Reload validation
      }
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} items failed to create`);
      }
    } catch (error) {
      console.error('Error standardizing inventory:', error);
      toast.error('Failed to standardize inventory');
    } finally {
      setIsStandardizing(false);
    }
  };

  const getStatusBadge = () => {
    if (!validation) return <Badge variant="secondary">Loading...</Badge>;
    
    if (validation.isValid) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />All Valid</Badge>;
    } else {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Issues Found</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Inventory Mapping Manager
            </CardTitle>
            <CardDescription>
              Manage cross-store inventory mappings and fix deployment issues
              {storeId && " for selected store"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button
              variant="outline"
              size="sm"
              onClick={loadValidation}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {validation && !validation.isValid && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Found {validation.crossStoreMappings.length} cross-store mappings and {validation.missingMappings.length} missing mappings that need attention.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleFixMappings}
            disabled={isFixing || !validation || validation.isValid}
            className="flex-1"
          >
            {isFixing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Fixing Mappings...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Fix Cross-Store Mappings
              </>
            )}
          </Button>

          <Button
            onClick={handleStandardizeInventory}
            disabled={isStandardizing}
            variant="outline"
            className="flex-1"
          >
            {isStandardizing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Standardizing...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Standardize Inventory
              </>
            )}
          </Button>
        </div>

        {validation && (
          <Tabs defaultValue="cross-store" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cross-store">
                Cross-Store Issues ({validation.crossStoreMappings.length})
              </TabsTrigger>
              <TabsTrigger value="missing">
                Missing Mappings ({validation.missingMappings.length})
              </TabsTrigger>
              <TabsTrigger value="results">
                Fix Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cross-store" className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Recipe ingredients mapped to inventory items from wrong stores
              </div>
              
              <ScrollArea className="h-[300px] w-full">
                <div className="space-y-2">
                  {validation.crossStoreMappings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      No cross-store mapping issues found
                    </div>
                  ) : (
                    validation.crossStoreMappings.map((mapping, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{mapping.recipeName}</div>
                            <div className="text-sm text-muted-foreground">
                              Ingredient: <span className="font-mono">{mapping.ingredientName}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Inventory: <span className="font-mono">{mapping.inventoryItemName}</span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            Wrong Store
                          </Badge>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="missing" className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Recipe ingredients without valid inventory mappings
              </div>
              
              <ScrollArea className="h-[300px] w-full">
                <div className="space-y-2">
                  {validation.missingMappings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      No missing mappings found
                    </div>
                  ) : (
                    validation.missingMappings.map((missing, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{missing.recipeName}</div>
                            <div className="text-sm text-muted-foreground">
                              Missing: <span className="font-mono">{missing.ingredientName}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            No Mapping
                          </Badge>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="results" className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Results from the last mapping fix operation
              </div>
              
              {fixResults ? (
                <ScrollArea className="h-[300px] w-full">
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <Card className="p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{fixResults.fixed}</div>
                        <div className="text-sm text-muted-foreground">Fixed</div>
                      </Card>
                      <Card className="p-3 text-center">
                        <div className="text-2xl font-bold text-red-600">{fixResults.failed}</div>
                        <div className="text-sm text-muted-foreground">Failed</div>
                      </Card>
                    </div>

                    {fixResults.details.map((detail, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{detail.ingredientName}</div>
                            {detail.error && (
                              <div className="text-sm text-red-600">{detail.error}</div>
                            )}
                          </div>
                          <Badge 
                            variant={detail.action === 'failed' ? 'destructive' : 'default'}
                            className={detail.action === 'fixed' ? 'bg-green-500' : ''}
                          >
                            {detail.action}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2" />
                  No fix results yet. Run "Fix Cross-Store Mappings" to see results.
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};