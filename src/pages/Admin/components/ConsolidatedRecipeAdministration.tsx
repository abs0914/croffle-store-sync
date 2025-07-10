import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Edit, 
  Rocket, 
  Package, 
  Store,
  Filter,
  MoreHorizontal,
  FileText,
  Layers,
  Target,
  Trash2
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import { useUnifiedRecipeState, UnifiedRecipeFilters, UnifiedRecipeItem } from '@/hooks/admin/useUnifiedRecipeState';
import { UnifiedRecipeEditDialog } from '@/components/admin/recipe/UnifiedRecipeEditDialog';
import { EnhancedRecipeFilters } from '@/components/admin/recipe/EnhancedRecipeFilters';
import { RecipeTypeIndicator, RecipeComplexityIndicator } from '@/components/admin/recipe/RecipeTypeIndicator';
import { ComponentRelationshipVisualization } from '@/components/admin/recipe/ComponentRelationshipVisualization';
import { RecipeInventoryMappings } from '@/components/admin/recipe/RecipeInventoryMappings';
import { RecipeCleanupTools } from '@/components/admin/recipe/RecipeCleanupTools';
import { toast } from 'sonner';
import { RecipeTemplateDialog } from './RecipeTemplateDialog';
import { EnhancedRecipeDeploymentDialog } from '@/components/admin/recipe/EnhancedRecipeDeploymentDialog';
import { RecipeTemplateUpload } from '@/components/Admin/components/RecipeTemplateUpload';
import { TableRecipeUpload } from '@/components/admin/recipe/TableRecipeUpload';

export function ConsolidatedRecipeAdministration() {
  const {
    templates,
    recipes,
    stores,
    isLoadingTemplates,
    isLoadingRecipes,
    updateTemplate,
    updateRecipe,
    syncTemplateToRecipes,
    deleteTemplate,
    isUpdatingTemplate,
    isUpdatingRecipe,
    isSyncing
  } = useUnifiedRecipeState();

  const [filters, setFilters] = useState<UnifiedRecipeFilters>({
    search: '',
    status: 'all',
    store: 'all',
    category: 'all',
    itemType: 'all',
    recipeType: 'all'
  });

  const [selectedItem, setSelectedItem] = useState<UnifiedRecipeItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [showRelationshipView, setShowRelationshipView] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  
  // State for template dialog (for editing templates)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  // State for enhanced deployment dialog
  const [isDeploymentDialogOpen, setIsDeploymentDialogOpen] = useState(false);
  const [templateToDeploy, setTemplateToDeployment] = useState<any>(null);

  // Combine and filter data
  const allItems = [...templates, ...recipes];
  const filteredItems = allItems.filter(item => {
    // Text search
    if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    // Item type filter
    if (filters.itemType !== 'all' && item.item_type !== filters.itemType) {
      return false;
    }
    
    // Store filter (for recipes)
    if (filters.store !== 'all' && item.store_id !== filters.store) {
      return false;
    }
    
    // Recipe type filter
    if (filters.recipeType !== 'all' && item.recipe_type !== filters.recipeType) {
      return false;
    }
    
    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'active' && !item.is_active) return false;
      if (filters.status === 'inactive' && item.is_active) return false;
    }
    
    return true;
  });

  const templateItems = filteredItems.filter(item => item.item_type === 'template');
  const recipeItems = filteredItems.filter(item => item.item_type === 'recipe');

  // Metrics
  const metrics = {
    totalTemplates: templates.length,
    totalRecipes: recipes.length,
    deployedTemplates: templates.filter(t => t.deployment_count && t.deployment_count > 0).length,
    activeStores: stores.length
  };

  const handleEditItem = (item: UnifiedRecipeItem) => {
    if (item.item_type === 'template') {
      // Use new RecipeTemplateDialog for templates
      setSelectedTemplate(item);
      setIsTemplateDialogOpen(true);
    } else {
      // Use old UnifiedRecipeEditDialog for recipes
      setSelectedItem(item);
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveItem = (id: string, updates: Partial<UnifiedRecipeItem>) => {
    const item = allItems.find(i => i.id === id);
    if (!item) return;

    if (item.item_type === 'template') {
      updateTemplate({ id, updates });
    } else {
      updateRecipe({ id, updates });
    }
    
    setIsEditDialogOpen(false);
    setSelectedItem(null);
  };

  const handleSyncToRecipes = (templateId: string, updates: Partial<UnifiedRecipeItem>) => {
    syncTemplateToRecipes({ templateId, updates });
    setIsEditDialogOpen(false);
    setSelectedItem(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(templateId);
    }
  };

  const handleDeployTemplate = (template: any) => {
    console.log('🚀 Deploy template clicked:', template.name);
    setTemplateToDeployment(template);
    setIsDeploymentDialogOpen(true);
    console.log('📋 Dialog state set to open');
  };

  const renderItemCard = (item: UnifiedRecipeItem) => (
    <Card key={item.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{item.name}</h3>
            <Badge variant={item.item_type === 'template' ? 'default' : 'secondary'}>
              {item.item_type === 'template' ? 'Template' : 'Recipe'}
            </Badge>
            {!item.is_active && (
              <Badge variant="outline">Inactive</Badge>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditItem(item)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {item.item_type === 'template' && (
                <>
                  <DropdownMenuItem onClick={() => handleDeployTemplate(item)}>
                    <Rocket className="h-4 w-4 mr-2" />
                    Deploy Template
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDeleteTemplate(item.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Template
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Yield:</span> {item.yield_quantity}
          </div>
          <div>
            <span className="font-medium">Servings:</span> {item.serving_size}
          </div>
          {item.item_type === 'template' && (
            <>
              <div>
                <span className="font-medium">Cost:</span> ₱{item.total_cost?.toFixed(2) || '0.00'}
              </div>
              <div>
                <span className="font-medium">Deployments:</span> {item.deployment_count || 0}
              </div>
              <div>
                <span className="font-medium">Stores:</span> {item.deployed_stores?.length || 0}
              </div>
            </>
          )}
          {item.item_type === 'recipe' && (
            <>
              <div>
                <span className="font-medium">Store:</span> {item.store_name || 'Unknown'}
              </div>
              <div>
                <span className="font-medium">Cost:</span> ₱{item.cost_per_serving?.toFixed(2) || '0.00'}
              </div>
            </>
          )}
        </div>
        
        {item.item_type === 'template' && item.deployed_stores && item.deployed_stores.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Deployed to:</p>
            <div className="flex flex-wrap gap-1">
              {item.deployed_stores.slice(0, 3).map((store, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {store}
                </Badge>
              ))}
              {item.deployed_stores.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{item.deployed_stores.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const isLoading = isLoadingTemplates || isLoadingRecipes;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Recipe Administration</h1>
          <p className="text-muted-foreground">
            Unified management for recipe templates and deployed recipes
          </p>
        </div>
        <Button onClick={() => setIsCreateTemplateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalTemplates}</div>
              <p className="text-xs text-muted-foreground">Total Templates</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.deployedTemplates}</div>
              <p className="text-xs text-muted-foreground">Deployed Templates</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.totalRecipes}</div>
              <p className="text-xs text-muted-foreground">Active Recipes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{metrics.activeStores}</div>
              <p className="text-xs text-muted-foreground">Active Stores</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <Select
              value={filters.itemType}
              onValueChange={(value) => setFilters(prev => ({ ...prev, itemType: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Item Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="template">Templates</SelectItem>
                <SelectItem value="recipe">Recipes</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.store}
              onValueChange={(value) => setFilters(prev => ({ ...prev, store: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Store" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {stores.map(store => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={() => setFilters({
                search: '',
                status: 'all',
                store: 'all',
                category: 'all',
                itemType: 'all',
                recipeType: 'all'
              })}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Templates ({templateItems.length})
          </TabsTrigger>
          <TabsTrigger value="recipes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Recipes ({recipeItems.length})
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Bulk Upload
          </TabsTrigger>
          <TabsTrigger value="unified" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            All Items ({filteredItems.length})
          </TabsTrigger>
          <TabsTrigger value="mappings" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Mappings
          </TabsTrigger>
          <TabsTrigger value="cleanup" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Cleanup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : templateItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templateItems.map(renderItemCard)}
            </div>
          ) : (
            <div className="text-center py-12">
              <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground">Create your first recipe template to get started.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recipes" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading recipes...</div>
          ) : recipeItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipeItems.map(renderItemCard)}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No recipes found</h3>
              <p className="text-muted-foreground">Deploy templates to stores to create recipes.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecipeTemplateUpload />
            <TableRecipeUpload />
          </div>
        </TabsContent>

        <TabsContent value="unified" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading items...</div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(renderItemCard)}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No items found</h3>
              <p className="text-muted-foreground">No items match your current filters.</p>
            </div>
           )}
        </TabsContent>

        <TabsContent value="mappings" className="space-y-4">
          <RecipeInventoryMappings />
        </TabsContent>

        <TabsContent value="cleanup" className="space-y-4">
          <RecipeCleanupTools />
        </TabsContent>
      </Tabs>

      {/* Edit Dialogs */}
      
      {/* Recipe Edit Dialog (old UI for recipes) */}
      <UnifiedRecipeEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onSave={handleSaveItem}
        onSyncToRecipes={handleSyncToRecipes}
        stores={stores}
        isLoading={isUpdatingTemplate || isUpdatingRecipe || isSyncing}
      />

      {/* Template Edit Dialog (new UI for templates) */}
      <RecipeTemplateDialog
        isOpen={isTemplateDialogOpen}
        onClose={() => {
          setIsTemplateDialogOpen(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        onSuccess={() => {
          setIsTemplateDialogOpen(false);
          setSelectedTemplate(null);
          toast.success('Template updated successfully');
        }}
      />

      {/* Create Template Dialog */}
      <RecipeTemplateDialog
        isOpen={isCreateTemplateOpen}
        onClose={() => setIsCreateTemplateOpen(false)}
        onSuccess={() => {
          setIsCreateTemplateOpen(false);
          toast.success('Template created successfully');
        }}
      />

      {/* Enhanced Deployment Dialog */}
      <EnhancedRecipeDeploymentDialog
        isOpen={isDeploymentDialogOpen}
        onClose={() => {
          setIsDeploymentDialogOpen(false);
          setTemplateToDeployment(null);
        }}
        template={templateToDeploy}
        stores={stores}
        onSuccess={() => {
          setIsDeploymentDialogOpen(false);
          setTemplateToDeployment(null);
          toast.success('Recipe deployed successfully');
          // Refresh data to show new deployed recipes
          window.location.reload();
        }}
      />
    </div>
  );
}