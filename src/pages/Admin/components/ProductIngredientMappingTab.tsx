import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Target, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Package,
  RefreshCw,
  Eye,
  Edit,
  Save,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductMapping {
  id: string;
  name: string;
  category: string;
  storeCount: number;
  mappingStatus: 'complete' | 'partial' | 'missing';
  ingredients: IngredientMapping[];
}

interface IngredientMapping {
  ingredientName: string;
  inventoryId: string | null;
  inventoryName: string | null;
  quantity: number;
  unit: string;
  mapped: boolean;
}

interface Store {
  id: string;
  name: string;
}

export const ProductIngredientMappingTab: React.FC = () => {
  const [products, setProducts] = useState<ProductMapping[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductMapping | null>(null);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadInventoryItems(selectedStore);
    }
  }, [selectedStore]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStores(),
        loadProductMappings()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStores(data || []);
      
      if (data && data.length > 0 && !selectedStore) {
        setSelectedStore(data[0].id);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  };

  const loadProductMappings = async () => {
    try {
      // Get all products from all stores
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          category_id,
          categories(name),
          store_id,
          stores(id, name)
        `)
        .eq('is_active', true);

      if (productsError) throw productsError;

      // Group products by name and category to show unified view
      const productMap = new Map<string, ProductMapping>();

      for (const product of productsData || []) {
        const key = `${product.name}-${product.category_id}`;
        
        if (!productMap.has(key)) {
          productMap.set(key, {
            id: product.id,
            name: product.name,
            category: product.categories?.name || 'Uncategorized',
            storeCount: 1,
            mappingStatus: 'missing',
            ingredients: []
          });
        } else {
          const existing = productMap.get(key)!;
          existing.storeCount += 1;
        }
      }

      // Load ingredient mappings for each product
      for (const [key, product] of productMap.entries()) {
        await loadProductIngredients(product);
      }

      setProducts(Array.from(productMap.values()));
    } catch (error) {
      console.error('Error loading product mappings:', error);
    }
  };

  const loadProductIngredients = async (product: ProductMapping) => {
    try {
      // Get recipes for this product
      const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select(`
          id,
          recipe_ingredients(
            ingredient_name,
            quantity,
            unit,
            inventory_stock_id,
            inventory_stock(id, item)
          )
        `)
        .eq('product_id', product.id);

      if (recipesError) throw recipesError;

      const ingredientMap = new Map<string, IngredientMapping>();

      recipes?.forEach(recipe => {
        recipe.recipe_ingredients?.forEach(ri => {
          if (!ingredientMap.has(ri.ingredient_name)) {
            ingredientMap.set(ri.ingredient_name, {
              ingredientName: ri.ingredient_name,
              inventoryId: ri.inventory_stock_id,
              inventoryName: ri.inventory_stock?.item || null,
              quantity: ri.quantity,
              unit: ri.unit,
              mapped: !!ri.inventory_stock_id
            });
          }
        });
      });

      product.ingredients = Array.from(ingredientMap.values());
      
      // Calculate mapping status
      const totalIngredients = product.ingredients.length;
      const mappedIngredients = product.ingredients.filter(i => i.mapped).length;
      
      if (mappedIngredients === 0) {
        product.mappingStatus = 'missing';
      } else if (mappedIngredients === totalIngredients) {
        product.mappingStatus = 'complete';
      } else {
        product.mappingStatus = 'partial';
      }
    } catch (error) {
      console.error(`Error loading ingredients for product ${product.name}:`, error);
    }
  };

  const loadInventoryItems = async (storeId: string) => {
    try {
      const { data, error } = await supabase
        .from('inventory_stock')
        .select('id, item, unit')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .eq('recipe_compatible', true)
        .order('item');

      if (error) throw error;
      setInventoryItems(data || []);
    } catch (error) {
      console.error('Error loading inventory items:', error);
    }
  };

  const updateIngredientMapping = async (
    productId: string,
    ingredientName: string,
    inventoryId: string | null
  ) => {
    try {
      if (!selectedStore) return;

      // Get all recipes for this product in the selected store
      const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select('id')
        .eq('product_id', productId)
        .eq('store_id', selectedStore);

      if (recipesError) throw recipesError;

      // Update recipe ingredients
      for (const recipe of recipes || []) {
        const { error: updateError } = await supabase
          .from('recipe_ingredients')
          .update({ inventory_stock_id: inventoryId })
          .eq('recipe_id', recipe.id)
          .eq('ingredient_name', ingredientName);

        if (updateError) throw updateError;

        // Also update recipe_ingredient_mappings if it exists
        if (inventoryId) {
          const { error: mappingError } = await supabase
            .from('recipe_ingredient_mappings')
            .upsert({
              recipe_id: recipe.id,
              ingredient_name: ingredientName,
              inventory_stock_id: inventoryId,
              conversion_factor: 1.0
            }, {
              onConflict: 'recipe_id,ingredient_name'
            });

          if (mappingError) console.warn('Mapping update failed:', mappingError);
        }
      }

      toast.success(`Updated mapping for ${ingredientName}`);
      await loadProductMappings();
    } catch (error) {
      console.error('Error updating ingredient mapping:', error);
      toast.error('Failed to update mapping');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Complete</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Partial</Badge>;
      default:
        return <Badge variant="destructive">Missing</Badge>;
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Product Ingredient Mapping</h3>
          <p className="text-sm text-muted-foreground">
            Manage product-to-ingredient mappings and store inventory deductions
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map(store => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={loadProductMappings} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Complete</p>
                <p className="text-2xl font-bold text-green-600">
                  {products.filter(p => p.mappingStatus === 'complete').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Partial</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {products.filter(p => p.mappingStatus === 'partial').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Missing</p>
                <p className="text-2xl font-bold text-red-600">
                  {products.filter(p => p.mappingStatus === 'missing').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products List */}
      <Card>
        <CardContent className="p-0">
          <div className="space-y-0">
            {filteredProducts.map((product, index) => (
              <div 
                key={product.id} 
                className={`p-4 hover:bg-muted/50 transition-colors ${
                  index !== filteredProducts.length - 1 ? 'border-b' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(product.mappingStatus)}
                    <div>
                      <h4 className="font-semibold">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {product.category} • {product.storeCount} store{product.storeCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(product.mappingStatus)}
                    <Badge variant="outline">
                      {product.ingredients.filter(i => i.mapped).length}/{product.ingredients.length} mapped
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingProduct(editingProduct === product.id ? null : product.id)}
                    >
                      {editingProduct === product.id ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Ingredient Details - Shown when editing */}
                {editingProduct === product.id && (
                  <div className="mt-4 space-y-3 bg-muted/30 p-4 rounded-lg">
                    <h5 className="font-medium text-sm">Ingredient Mappings</h5>
                    {product.ingredients.map((ingredient, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-background rounded border">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{ingredient.ingredientName}</div>
                          <div className="text-xs text-muted-foreground">
                            {ingredient.quantity} {ingredient.unit}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <Select
                            value={ingredient.inventoryId || ''}
                            onValueChange={(value) => 
                              updateIngredientMapping(product.id, ingredient.ingredientName, value || null)
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select inventory item" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No mapping</SelectItem>
                              {inventoryItems
                                .filter(item => 
                                  item.item.toLowerCase().includes(ingredient.ingredientName.toLowerCase()) ||
                                  ingredient.ingredientName.toLowerCase().includes(item.item.toLowerCase())
                                )
                                .map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.item} ({item.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="w-20 text-right">
                          {ingredient.mapped ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              Linked
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              None
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'No products match your search.' : 'No products available for mapping.'}
          </p>
        </div>
      )}
    </div>
  );
};