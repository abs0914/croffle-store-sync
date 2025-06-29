import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, 
  Plus, 
  Copy, 
  TrendingUp, 
  DollarSign, 
  Users, 
  AlertTriangle,
  BarChart3,
  Settings,
  Edit
} from 'lucide-react';
import { 
  getRecipeTemplatesWithMetrics,
  getTemplateDeploymentSummary,
  cloneRecipeTemplate,
  RecipeTemplateWithMetrics,
  TemplateDeploymentSummary
} from '@/services/recipeManagement/recipeTemplateService';
import { 
  getRecipeCostBreakdown,
  getIngredientCostAlerts,
  RecipeCostBreakdown,
  IngredientCostAlert
} from '@/services/recipeManagement/recipeCostAnalytics';
import { RecipeTemplateDialog } from '@/pages/Admin/components/RecipeTemplateDialog';
import { formatCurrency } from '@/utils/format';
import { toast } from 'sonner';

export const RecipeTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<RecipeTemplateWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<RecipeTemplateWithMetrics | null>(null);
  const [deploymentSummary, setDeploymentSummary] = useState<TemplateDeploymentSummary | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<RecipeCostBreakdown | null>(null);
  const [costAlerts, setCostAlerts] = useState<IngredientCostAlert[]>([]);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecipeTemplateWithMetrics | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesData, alertsData] = await Promise.all([
        getRecipeTemplatesWithMetrics(),
        getIngredientCostAlerts()
      ]);
      
      setTemplates(templatesData);
      setCostAlerts(alertsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load recipe templates');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = async (template: RecipeTemplateWithMetrics) => {
    setSelectedTemplate(template);
    setShowDetailsDialog(true);
    
    try {
      const [summary, cost] = await Promise.all([
        getTemplateDeploymentSummary(template.id),
        // For cost breakdown, we'd need to get a deployed recipe ID
        // For now, we'll use mock data
        Promise.resolve(null)
      ]);
      
      setDeploymentSummary(summary);
      setCostBreakdown(cost);
    } catch (error) {
      console.error('Error loading template details:', error);
    }
  };

  const handleEditTemplate = (template: RecipeTemplateWithMetrics) => {
    console.log('Opening edit dialog for template:', template);
    setEditingTemplate(template);
    setShowEditDialog(true);
  };

  const handleCloneTemplate = async (template: RecipeTemplateWithMetrics) => {
    const newName = prompt(`Enter name for cloned template:`, `${template.name} (Copy)`);
    if (!newName) return;

    const cloned = await cloneRecipeTemplate(template.id, newName);
    if (cloned) {
      await loadData();
    }
  };

  const handleEditSuccess = async () => {
    setShowEditDialog(false);
    setEditingTemplate(null);
    await loadData();
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const highPriorityAlerts = costAlerts.filter(alert => alert.severity === 'high');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Recipe Template Manager</h2>
          <p className="text-muted-foreground">
            Advanced template management with cost analytics and deployment tracking
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Cost Alerts */}
      {highPriorityAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              High Priority Cost Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {highPriorityAlerts.slice(0, 3).map((alert, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="font-medium">{alert.ingredientName}</span>
                  <Badge variant="destructive">
                    +{alert.percentageIncrease.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <Badge variant={template.deploymentCount > 0 ? "default" : "secondary"}>
                  v{template.version}
                </Badge>
              </div>
              {template.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {template.deploymentCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Deployments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(template.averageCost)}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Cost</div>
                </div>
              </div>

              {/* Profitability */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Profit Margin</span>
                <Badge variant={template.profitMargin > 50 ? "default" : "secondary"}>
                  {template.profitMargin.toFixed(1)}%
                </Badge>
              </div>

              {/* Popularity Score */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Popularity</span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">{template.popularityScore}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Details
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEditTemplate(template)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleCloneTemplate(template)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedTemplate.name}
                  <Badge>v{selectedTemplate.version}</Badge>
                </DialogTitle>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="deployments">Deployments</TabsTrigger>
                  <TabsTrigger value="cost-analysis">Cost Analysis</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                          <div className="text-2xl font-bold">{selectedTemplate.deploymentCount}</div>
                          <p className="text-xs text-muted-foreground">Deployments</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
                          <div className="text-2xl font-bold">
                            {formatCurrency(selectedTemplate.totalRevenue)}
                          </div>
                          <p className="text-xs text-muted-foreground">Total Revenue</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                          <div className="text-2xl font-bold">
                            {selectedTemplate.profitMargin.toFixed(1)}%
                          </div>
                          <p className="text-xs text-muted-foreground">Profit Margin</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                          <div className="text-2xl font-bold">{selectedTemplate.popularityScore}</div>
                          <p className="text-xs text-muted-foreground">Popularity</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Description and Instructions */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedTemplate.description || 'No description available'}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Instructions</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedTemplate.instructions || 'No instructions available'}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="deployments" className="space-y-4">
                  {deploymentSummary ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {deploymentSummary.storesDeployed}
                            </div>
                            <p className="text-xs text-muted-foreground">Stores</p>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {deploymentSummary.successfulDeployments}
                            </div>
                            <p className="text-xs text-muted-foreground">Successful</p>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold text-red-600">
                              {deploymentSummary.failedDeployments}
                            </div>
                            <p className="text-xs text-muted-foreground">Failed</p>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {deploymentSummary.averageRating.toFixed(1)}
                            </div>
                            <p className="text-xs text-muted-foreground">Avg Rating</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">Loading deployment data...</p>
                  )}
                </TabsContent>

                <TabsContent value="cost-analysis" className="space-y-4">
                  {costBreakdown ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold">
                              {formatCurrency(costBreakdown.totalCost)}
                            </div>
                            <p className="text-xs text-muted-foreground">Total Cost</p>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold">
                              {formatCurrency(costBreakdown.costPerServing)}
                            </div>
                            <p className="text-xs text-muted-foreground">Per Serving</p>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold">
                              {formatCurrency(costBreakdown.profitability.suggestedPrice)}
                            </div>
                            <p className="text-xs text-muted-foreground">Suggested Price</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Ingredient Breakdown */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Ingredient Cost Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {costBreakdown.ingredients.map((ingredient, index) => (
                              <div key={index} className="flex justify-between items-center">
                                <div>
                                  <span className="font-medium">{ingredient.name}</span>
                                  <span className="text-muted-foreground ml-2">
                                    ({ingredient.quantity} {ingredient.unit})
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">
                                    {formatCurrency(ingredient.totalCost)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {ingredient.percentageOfTotal.toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">
                      Cost analysis requires deployed recipe data
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div className="space-y-4">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setShowDetailsDialog(false);
                        handleEditTemplate(selectedTemplate);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Template
                    </Button>
                    
                    <Button variant="outline" className="w-full">
                      <Copy className="h-4 w-4 mr-2" />
                      Create New Version
                    </Button>
                    
                    <Button variant="destructive" className="w-full">
                      Archive Template
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <RecipeTemplateDialog
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};
