import React, { useState } from 'react';
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
  Zap
} from 'lucide-react';

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
            Direct recipe and inventory management - simplified approach
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
                  These products don't have recipes yet. Sync will create them automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {unlinkedProducts.map((product: any) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Will be matched with existing template or create new one
                        </p>
                      </div>
                      <Badge variant="outline">Unlinked</Badge>
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
        </Tabs>
      )}
    </div>
  );
};

export default RecipeManagement;