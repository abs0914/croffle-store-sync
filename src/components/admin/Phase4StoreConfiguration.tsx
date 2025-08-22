import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  DollarSign, 
  Package, 
  Monitor, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  Play,
  Wrench
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getStoreConfigurations,
  configurePricingProfile,
  configureCategoryDisplay,
  testPOSIntegration,
  configureAllStores,
  type StoreConfiguration,
  type ConfigurationResult 
} from '@/services/storeStandardization/storeConfigurationService';

export function Phase4StoreConfiguration() {
  const [configurations, setConfigurations] = useState<StoreConfiguration[]>([]);
  const [configResults, setConfigResults] = useState<ConfigurationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [markupPercentage, setMarkupPercentage] = useState<number>(50);
  const { toast } = useToast();

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    setIsLoading(true);
    try {
      const configs = await getStoreConfigurations();
      setConfigurations(configs);
    } catch (error) {
      console.error('Failed to load configurations:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load store configurations",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const configureStore = async (storeId: string, configType: 'pricing' | 'categories' | 'pos') => {
    const store = configurations.find(c => c.storeId === storeId);
    if (!store) return;

    try {
      let result: ConfigurationResult;
      
      switch (configType) {
        case 'pricing':
          result = await configurePricingProfile(storeId, markupPercentage);
          break;
        case 'categories':
          result = await configureCategoryDisplay(storeId);
          break;
        case 'pos':
          result = await testPOSIntegration(storeId);
          break;
        default:
          return;
      }

      toast({
        title: result.success ? "Configuration Success" : "Configuration Failed",
        description: result.success 
          ? `${configType} configured for ${store.storeName}` 
          : `Failed to configure ${configType}`,
        variant: result.success ? "default" : "destructive"
      });

      // Update results
      setConfigResults(prev => {
        const filtered = prev.filter(r => r.storeId !== storeId);
        return [...filtered, result];
      });

      // Reload configurations
      await loadConfigurations();
    } catch (error) {
      toast({
        title: "Configuration Error",
        description: `Failed to configure ${configType}`,
        variant: "destructive"
      });
    }
  };

  const configureAllStoresHandler = async () => {
    setIsConfiguring(true);
    try {
      const results = await configureAllStores();
      setConfigResults(results);
      
      const successCount = results.filter(r => r.success).length;
      toast({
        title: "Batch Configuration Complete",
        description: `${successCount}/${results.length} stores configured successfully`,
        variant: successCount === results.length ? "default" : "destructive"
      });
      
      await loadConfigurations();
    } catch (error) {
      toast({
        title: "Batch Configuration Failed",
        description: "Failed to configure all stores",
        variant: "destructive"
      });
    } finally {
      setIsConfiguring(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'partial': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'needs_setup': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      configured: "default",
      partial: "secondary",
      needs_setup: "destructive"
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </Badge>
    );
  };

  const overallProgress = configurations.length > 0 ? 
    Math.round(configurations.reduce((sum, c) => sum + c.overallScore, 0) / configurations.length) : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading store configurations...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Phase 4: Store-Specific Configuration
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure pricing profiles, inventory mappings, categories, and POS integration
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadConfigurations}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={configureAllStoresHandler}
            disabled={isConfiguring}
            className="min-w-[160px]"
          >
            {isConfiguring ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Configuring...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4 mr-2" />
                Configure All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Global Configuration Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="markup">Default Markup Percentage</Label>
              <Input
                id="markup"
                type="number"
                value={markupPercentage}
                onChange={(e) => setMarkupPercentage(Number(e.target.value))}
                min="0"
                max="200"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Applied to stores without pricing profiles
              </p>
            </div>
            <div className="flex items-end">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{overallProgress}%</div>
                <div className="text-sm text-muted-foreground">Overall Progress</div>
                <Progress value={overallProgress} className="w-32 mt-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store Configurations */}
      <div className="space-y-4">
        {configurations.map(config => (
          <Card key={config.storeId}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(config.status)}
                  <span>{config.storeName}</span>
                  {getStatusBadge(config.status)}
                  <Badge variant="outline">{config.overallScore}%</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedStore(
                      expandedStore === config.storeId ? null : config.storeId
                    )}
                  >
                    {expandedStore === config.storeId ? 'Hide' : 'Details'}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {/* Configuration Overview */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-sm font-medium">
                    {config.pricingProfile.hasProfile ? 'Configured' : 'Missing'}
                  </div>
                  <div className="text-xs text-muted-foreground">Pricing</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-sm font-medium">
                    {config.inventoryMappings.mappingRate}%
                  </div>
                  <div className="text-xs text-muted-foreground">Inventory</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Settings className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-sm font-medium">
                    {config.categoryConfiguration.hasDisplayOrder ? 'Ordered' : 'Unordered'}
                  </div>
                  <div className="text-xs text-muted-foreground">Categories</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Monitor className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="text-sm font-medium">
                    {config.posIntegration.isReady ? 'Ready' : 'Issues'}
                  </div>
                  <div className="text-xs text-muted-foreground">POS</div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedStore === config.storeId && (
                <div className="border-t pt-4">
                  <Tabs defaultValue="pricing" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="pricing">Pricing</TabsTrigger>
                      <TabsTrigger value="inventory">Inventory</TabsTrigger>
                      <TabsTrigger value="categories">Categories</TabsTrigger>
                      <TabsTrigger value="pos">POS Test</TabsTrigger>
                    </TabsList>

                    <TabsContent value="pricing" className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Pricing Profile Configuration</h4>
                          <p className="text-sm text-muted-foreground">
                            {config.pricingProfile.hasProfile ? 
                              `Current markup: ${config.pricingProfile.baseMarkup}%` :
                              'No pricing profile configured'
                            }
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => configureStore(config.storeId, 'pricing')}
                          variant={config.pricingProfile.hasProfile ? "outline" : "default"}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          {config.pricingProfile.hasProfile ? 'Update' : 'Configure'}
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="inventory" className="space-y-3">
                      <div>
                        <h4 className="font-medium">Inventory Mapping Status</h4>
                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Recipes with mappings:</span>
                            <span>{config.inventoryMappings.mappedRecipes}/{config.inventoryMappings.totalRecipes}</span>
                          </div>
                          <Progress value={config.inventoryMappings.mappingRate} />
                          <p className="text-xs text-muted-foreground">
                            {config.inventoryMappings.mappingRate >= 80 ? 
                              'Good inventory integration' :
                              'Consider improving ingredient-inventory mappings'
                            }
                          </p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="categories" className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Category Display Configuration</h4>
                          <p className="text-sm text-muted-foreground">
                            {config.categoryConfiguration.configuredCategories}/{config.categoryConfiguration.totalCategories} categories have display order
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => configureStore(config.storeId, 'categories')}
                          variant={config.categoryConfiguration.hasDisplayOrder ? "outline" : "default"}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          {config.categoryConfiguration.hasDisplayOrder ? 'Reconfigure' : 'Configure'}
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="pos" className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">POS Integration Test</h4>
                          <p className="text-sm text-muted-foreground">
                            {config.posIntegration.readyProducts}/{config.posIntegration.productCount} products ready for POS
                          </p>
                          {config.posIntegration.issues.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {config.posIntegration.issues.slice(0, 3).map((issue, idx) => (
                                <div key={idx} className="text-xs text-red-600">• {issue}</div>
                              ))}
                              {config.posIntegration.issues.length > 3 && (
                                <div className="text-xs text-muted-foreground">
                                  +{config.posIntegration.issues.length - 3} more issues
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => configureStore(config.storeId, 'pos')}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Run Test
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* Latest Configuration Results */}
              {configResults.find(r => r.storeId === config.storeId) && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-2">Latest Configuration Result</h4>
                  {(() => {
                    const result = configResults.find(r => r.storeId === config.storeId)!;
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {result.success ? 
                            <CheckCircle className="h-4 w-4 text-green-500" /> :
                            <XCircle className="h-4 w-4 text-red-500" />
                          }
                          <span className="text-sm font-medium">
                            {result.success ? 'Configuration Successful' : 'Configuration Failed'}
                          </span>
                        </div>
                        {result.configuredItems.length > 0 && (
                          <div className="text-sm">
                            <div className="font-medium text-green-700 mb-1">Configured:</div>
                            {result.configuredItems.map((item, idx) => (
                              <div key={idx} className="text-green-600 ml-2">• {item}</div>
                            ))}
                          </div>
                        )}
                        {result.errors.length > 0 && (
                          <div className="text-sm">
                            <div className="font-medium text-red-700 mb-1">Errors:</div>
                            {result.errors.map((error, idx) => (
                              <div key={idx} className="text-red-600 ml-2">• {error}</div>
                            ))}
                          </div>
                        )}
                        {result.warnings.length > 0 && (
                          <div className="text-sm">
                            <div className="font-medium text-yellow-700 mb-1">Warnings:</div>
                            {result.warnings.map((warning, idx) => (
                              <div key={idx} className="text-yellow-600 ml-2">• {warning}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {configurations.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Configuration Data</h3>
            <p className="text-muted-foreground">
              No stores found for configuration or all stores are already configured
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}