import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ChefHat, 
  Package, 
  Link2, 
  RefreshCw, 
  CheckCircle2,
  AlertCircle,
  Zap,
  Edit,
  Eye,
  Plus,
  Trash2
} from 'lucide-react';
import { RecipeEditDialog } from '@/components/recipe/RecipeEditDialog';
import { RecipeTemplateEditDialog } from '@/components/recipe/RecipeTemplateEditDialog';
import { DeleteRecipeDialog } from '@/components/recipe/DeleteRecipeDialog';
import { DeleteRecipeTemplateDialog } from '@/pages/Admin/components/DeleteRecipeTemplateDialog';
import { RecipeFilters } from '@/components/recipe/RecipeFilters';
import { UnlinkedProductActions } from '@/components/recipe/UnlinkedProductActions';

interface Product {
  id: string;
  name: string;
  store_id: string;
  recipe_id?: string;
  is_active: boolean;
}

interface RecipeTemplate {
  id: string;
  name: string;
  is_active: boolean;
}

const RecipeManagement: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [deleteRecipeDialogOpen, setDeleteRecipeDialogOpen] = useState(false);
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  // Filter states
  const [recipeSearchTerm, setRecipeSearchTerm] = useState('');
  const [recipeCategory, setRecipeCategory] = useState('');
  const [recipeType, setRecipeType] = useState('');
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [templateType, setTemplateType] = useState('');
  
  const queryClient = useQueryClient();

  // Fetch stores
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('*').eq('is_active', true);
      return data || [];
    }
  });

  // Fetch products for selected store
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products', selectedStore],
    queryFn: async () => {
      if (!selectedStore) return [];
      const { data } = await supabase
        .from('products')
        .select(`
          id, name, store_id, recipe_id, is_active,
          recipes (
            id, name,
            recipe_templates (id, name)
          )
        `)
        .eq('store_id', selectedStore);
      return data || [];
    },
    enabled: !!selectedStore
  });

  // Fetch recipe templates
  const { data: templates = [] } = useQuery({
    queryKey: ['recipe_templates'],
    queryFn: async () => {
      const { data } = await supabase
        .from('recipe_templates')
        .select('*')
        .eq('is_active', true);
      return data || [];
    }
  });

  // Fetch individual recipes for selected store
  const { data: storeRecipes = [] } = useQuery({
    queryKey: ['store_recipes', selectedStore],
    queryFn: async () => {
      if (!selectedStore) return [];
      const { data } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_templates(name, recipe_type, category_name)
        `)
        .eq('store_id', selectedStore)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!selectedStore
  });

  // Direct sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStore) throw new Error('No store selected');
      
      let linked = 0;
      let created = 0;
      
      for (const product of products) {
        // Skip if already has recipe
        if (product.recipe_id) continue;
        
        // Find matching template (exact match first, then partial)
        let template = templates.find(t => 
          t.name.toLowerCase() === product.name.toLowerCase()
        );
        
        if (!template) {
          template = templates.find(t => 
            t.name.toLowerCase().includes(product.name.toLowerCase()) ||
            product.name.toLowerCase().includes(t.name.toLowerCase())
          );
        }
        
        if (template) {
          // Create recipe linking product to template
          const { data: recipe } = await supabase
            .from('recipes')
            .insert({
              name: product.name,
              store_id: selectedStore,
              template_id: template.id,
              is_active: true,
              serving_size: 1,
              total_cost: 0,
              cost_per_serving: 0
            })
            .select()
            .single();
          
          if (recipe) {
            // Link product to recipe
            await supabase
              .from('products')
              .update({ recipe_id: recipe.id })
              .eq('id', product.id);
            
            linked++;
          }
        } else {
          // Create basic template for unmatched products
          const { data: newTemplate } = await supabase
            .from('recipe_templates')
            .insert({
              name: product.name,
              description: `Auto-generated template for ${product.name}`,
              instructions: 'Add preparation instructions',
              estimated_cost: 0,
              serving_size: 1,
              prep_time_minutes: 0,
              recipe_type: 'simple',
              is_active: true
            })
            .select()
            .single();
          
          if (newTemplate) {
            // Create recipe
            const { data: recipe } = await supabase
              .from('recipes')
              .insert({
                name: product.name,
                store_id: selectedStore,
                template_id: newTemplate.id,
                is_active: true,
                serving_size: 1,
                total_cost: 0,
                cost_per_serving: 0
              })
              .select()
              .single();
            
            if (recipe) {
              // Link product to recipe
              await supabase
                .from('products')
                .update({ recipe_id: recipe.id })
                .eq('id', product.id);
              
              created++;
            }
          }
        }
      }
      
      return { linked, created };
    },
    onSuccess: (result) => {
      toast.success(`Sync complete! Linked: ${result.linked}, Created: ${result.created}`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    }
  });

  const unlinkedProducts = products.filter(p => !p.recipe_id);
  const linkedProducts = products.filter(p => p.recipe_id);

  // Filter logic
  const filteredRecipes = useMemo(() => {
    return storeRecipes.filter(recipe => {
      const matchesSearch = !recipeSearchTerm || 
        recipe.name.toLowerCase().includes(recipeSearchTerm.toLowerCase());
      const matchesCategory = !recipeCategory || 
        recipe.recipe_templates?.category_name === recipeCategory;
      const matchesType = !recipeType || 
        recipe.recipe_templates?.recipe_type === recipeType;
      
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [storeRecipes, recipeSearchTerm, recipeCategory, recipeType]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = !templateSearchTerm || 
        template.name.toLowerCase().includes(templateSearchTerm.toLowerCase());
      const matchesCategory = !templateCategory || 
        template.category_name === templateCategory;
      const matchesType = !templateType || 
        template.recipe_type === templateType;
      
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [templates, templateSearchTerm, templateCategory, templateType]);

  // Get unique categories and types for filters
  const availableRecipeCategories = useMemo(() => {
    const categories = new Set(storeRecipes
      .map(r => r.recipe_templates?.category_name)
      .filter(Boolean));
    return Array.from(categories);
  }, [storeRecipes]);

  const availableRecipeTypes = useMemo(() => {
    const types = new Set(storeRecipes
      .map(r => r.recipe_templates?.recipe_type)
      .filter(Boolean));
    return Array.from(types);
  }, [storeRecipes]);

  const availableTemplateCategories = useMemo(() => {
    const categories = new Set(templates
      .map(t => t.category_name)
      .filter(Boolean));
    return Array.from(categories);
  }, [templates]);

  const availableTemplateTypes = useMemo(() => {
    const types = new Set(templates
      .map(t => t.recipe_type)
      .filter(Boolean));
    return Array.from(types);
  }, [templates]);

  // Clear filters functions
  const clearRecipeFilters = () => {
    setRecipeSearchTerm('');
    setRecipeCategory('');
    setRecipeType('');
  };

  const clearTemplateFilters = () => {
    setTemplateSearchTerm('');
    setTemplateCategory('');
    setTemplateType('');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ChefHat className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Recipe Management</h1>
          <p className="text-muted-foreground">
            Comprehensive recipe and template management with filtering and actions
          </p>
        </div>
      </div>

      {/* Store Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Store Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md bg-background"
            >
              <option value="">Select a store...</option>
              {stores.map((store: any) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            
            {selectedStore && (
              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || productsLoading}
                className="flex items-center gap-2"
              >
                {syncMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Sync All Recipes
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedStore && (
        <Tabs defaultValue="status" className="space-y-4">
          <TabsList>
            <TabsTrigger value="status">Status Overview</TabsTrigger>
            <TabsTrigger value="unlinked">Unlinked Products</TabsTrigger>
            <TabsTrigger value="linked">Linked Products</TabsTrigger>
            <TabsTrigger value="recipes">Individual Recipes</TabsTrigger>
            <TabsTrigger value="templates">Recipe Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{linkedProducts.length}</p>
                      <p className="text-sm text-muted-foreground">Linked Products</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-8 w-8 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold">{unlinkedProducts.length}</p>
                      <p className="text-sm text-muted-foreground">Needs Linking</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Package className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{templates.length}</p>
                      <p className="text-sm text-muted-foreground">Available Templates</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {unlinkedProducts.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {unlinkedProducts.length} products need recipe linking. Click "Sync All Recipes" to automatically match and create recipes.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="unlinked" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Products Needing Recipe Links
                </CardTitle>
                <CardDescription>
                  These products don't have recipes yet. You can link them to templates or create new recipes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {unlinkedProducts.map((product: any) => (
                    <div key={product.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Not linked to any recipe yet
                          </p>
                        </div>
                        <Badge variant="outline">Unlinked</Badge>
                      </div>
                      
                      <UnlinkedProductActions
                        product={product}
                        availableTemplates={templates}
                        storeId={selectedStore}
                        onCreateTemplate={() => {
                          setSelectedTemplate({ name: product.name });
                          setTemplateDialogOpen(true);
                        }}
                        onCreateRecipe={() => {
                          setSelectedRecipe({ name: product.name, store_id: selectedStore });
                          setRecipeDialogOpen(true);
                        }}
                      />
                    </div>
                  ))}
                  {unlinkedProducts.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      All products are linked to recipes!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="linked" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Successfully Linked Products
                </CardTitle>
                <CardDescription>
                  These products have recipes and are ready for inventory operations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {linkedProducts.map((product: any) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Template: {(product as any).recipes?.recipe_templates?.name || 'Unknown'}
                        </p>
                      </div>
                      <Badge variant="default">Linked</Badge>
                    </div>
                  ))}
                  {linkedProducts.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No linked products yet. Run sync to create recipe links.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recipes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5" />
                    Individual Recipe Management
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedRecipe(null);
                      setRecipeDialogOpen(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Recipe
                  </Button>
                </CardTitle>
                <CardDescription>
                  Edit specific recipes for this store. Changes here won't affect other stores.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <RecipeFilters
                  searchTerm={recipeSearchTerm}
                  onSearchChange={setRecipeSearchTerm}
                  selectedCategory={recipeCategory}
                  onCategoryChange={setRecipeCategory}
                  selectedType={recipeType}
                  onTypeChange={setRecipeType}
                  availableCategories={availableRecipeCategories}
                  availableTypes={availableRecipeTypes}
                  totalCount={storeRecipes.length}
                  filteredCount={filteredRecipes.length}
                  onClearFilters={clearRecipeFilters}
                />
                
                <div className="space-y-2">
                  {filteredRecipes.map((recipe: any) => (
                    <div key={recipe.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{recipe.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Cost: ₱{recipe.cost_per_serving?.toFixed(2) || '0.00'} per serving | 
                          Template: {recipe.recipe_templates?.name || 'Custom'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedRecipe(recipe);
                            setRecipeDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedRecipe({...recipe, readOnly: true});
                            setRecipeDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRecipe(recipe);
                            setDeleteRecipeDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredRecipes.length === 0 && storeRecipes.length > 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No recipes match your current filters.
                    </p>
                  )}
                  {storeRecipes.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No recipes available. Link some products first using the sync function.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Recipe Templates
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedTemplate(null);
                      setTemplateDialogOpen(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Template
                  </Button>
                </CardTitle>
                <CardDescription>
                  Global recipe templates that can be deployed to any store.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <RecipeFilters
                  searchTerm={templateSearchTerm}
                  onSearchChange={setTemplateSearchTerm}
                  selectedCategory={templateCategory}
                  onCategoryChange={setTemplateCategory}
                  selectedType={templateType}
                  onTypeChange={setTemplateType}
                  availableCategories={availableTemplateCategories}
                  availableTypes={availableTemplateTypes}
                  totalCount={templates.length}
                  filteredCount={filteredTemplates.length}
                  onClearFilters={clearTemplateFilters}
                />
                
                <div className="space-y-2">
                  {filteredTemplates.map((template: any) => (
                    <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{template.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {template.recipe_type}
                          </Badge>
                          {template.category_name && (
                            <Badge variant="secondary" className="text-xs">
                              {template.category_name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {template.description || 'No description'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setTemplateDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedTemplate({...template, deployToStore: selectedStore});
                            setTemplateDialogOpen(true);
                          }}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Deploy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setDeleteTemplateDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredTemplates.length === 0 && templates.length > 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No templates match your current filters.
                    </p>
                  )}
                  {templates.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No recipe templates available. Create some templates first.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      <RecipeEditDialog
        isOpen={recipeDialogOpen}
        onClose={() => {
          setRecipeDialogOpen(false);
          setSelectedRecipe(null);
        }}
        recipe={selectedRecipe}
        storeId={selectedStore}
      />

      <RecipeTemplateEditDialog
        isOpen={templateDialogOpen}
        onClose={() => {
          setTemplateDialogOpen(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
      />

      <DeleteRecipeDialog
        isOpen={deleteRecipeDialogOpen}
        onClose={() => {
          setDeleteRecipeDialogOpen(false);
          setSelectedRecipe(null);
        }}
        recipe={selectedRecipe}
      />

      <DeleteRecipeTemplateDialog
        isOpen={deleteTemplateDialogOpen}
        onClose={() => {
          setDeleteTemplateDialogOpen(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        onConfirm={async () => {
          if (!selectedTemplate) return;
          
          try {
            // Delete template ingredients first
            await supabase
              .from('recipe_template_ingredients')
              .delete()
              .eq('recipe_template_id', selectedTemplate.id);

            // Delete the template
            const { error } = await supabase
              .from('recipe_templates')
              .delete()
              .eq('id', selectedTemplate.id);

            if (error) throw error;

            toast.success(`Template "${selectedTemplate.name}" deleted successfully`);
            queryClient.invalidateQueries({ queryKey: ['recipe_templates'] });
            setDeleteTemplateDialogOpen(false);
            setSelectedTemplate(null);
          } catch (error) {
            console.error('Error deleting template:', error);
            toast.error('Failed to delete template');
          }
        }}
      />
    </div>
  );
};

export default RecipeManagement;