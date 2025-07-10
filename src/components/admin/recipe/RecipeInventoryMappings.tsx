import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  ArrowRight, 
  Package, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface InventoryMapping {
  id: string;
  recipe_ingredient_name: string;
  inventory_item_name: string;
  conversion_factor: number;
  conversion_unit: string;
  recipe_unit: string;
  store_name: string;
  status: 'mapped' | 'unmapped' | 'conflict';
}

interface UnmappedIngredient {
  ingredient_name: string;
  recipe_count: number;
  templates: string[];
}

export const RecipeInventoryMappings: React.FC = () => {
  const [mappings, setMappings] = useState<InventoryMapping[]>([]);
  const [unmappedIngredients, setUnmappedIngredients] = useState<UnmappedIngredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState('all');

  useEffect(() => {
    loadData();
  }, [selectedStore]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load stores
      const { data: storesData } = await supabase
        .from('stores')
        .select('id, name')
        .eq('is_active', true);
      
      setStores(storesData || []);

      // Load recipe ingredients and their inventory mappings
      const { data: ingredientsData } = await supabase
        .from('recipe_template_ingredients')
        .select(`
          ingredient_name,
          unit,
          recipe_templates!inner(name, id),
          inventory_stock(
            item,
            unit,
            store_id,
            stores(name)
          )
        `);

      // Process mappings
      const mappingsMap = new Map<string, InventoryMapping>();
      const unmappedMap = new Map<string, UnmappedIngredient>();

      (ingredientsData || []).forEach((ingredient: any) => {
        const key = `${ingredient.ingredient_name}-${ingredient.unit}`;
        
        if (ingredient.inventory_stock && ingredient.inventory_stock.length > 0) {
          // Has inventory mapping
          ingredient.inventory_stock.forEach((stock: any) => {
            if (selectedStore === 'all' || stock.store_id === selectedStore) {
              const mappingKey = `${key}-${stock.store_id}`;
              mappingsMap.set(mappingKey, {
                id: mappingKey,
                recipe_ingredient_name: ingredient.ingredient_name,
                inventory_item_name: stock.item,
                conversion_factor: 1, // Default - should be calculated
                conversion_unit: stock.unit,
                recipe_unit: ingredient.unit,
                store_name: stock.stores?.name || 'Unknown',
                status: ingredient.unit === stock.unit ? 'mapped' : 'conflict'
              });
            }
          });
        } else {
          // Unmapped ingredient
          if (unmappedMap.has(ingredient.ingredient_name)) {
            const existing = unmappedMap.get(ingredient.ingredient_name)!;
            existing.recipe_count += 1;
            existing.templates.push(ingredient.recipe_templates.name);
          } else {
            unmappedMap.set(ingredient.ingredient_name, {
              ingredient_name: ingredient.ingredient_name,
              recipe_count: 1,
              templates: [ingredient.recipe_templates.name]
            });
          }
        }
      });

      setMappings(Array.from(mappingsMap.values()));
      setUnmappedIngredients(Array.from(unmappedMap.values()));
      
    } catch (error) {
      console.error('Error loading mapping data:', error);
      toast.error('Failed to load mapping data');
    } finally {
      setLoading(false);
    }
  };

  const filteredMappings = mappings.filter(mapping => {
    const matchesSearch = 
      mapping.recipe_ingredient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mapping.inventory_item_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || mapping.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'mapped': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'conflict': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'mapped': return 'default';
      case 'conflict': return 'secondary';
      default: return 'outline';
    }
  };

  const mappingStats = {
    total: mappings.length,
    mapped: mappings.filter(m => m.status === 'mapped').length,
    conflicts: mappings.filter(m => m.status === 'conflict').length,
    unmapped: unmappedIngredients.length
  };

  const mappingPercentage = mappingStats.total > 0 
    ? Math.round((mappingStats.mapped / mappingStats.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Recipe-Inventory Mappings</h2>
          <p className="text-muted-foreground">
            Map recipe ingredients to inventory items for accurate stock tracking
          </p>
        </div>
        <Button onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{mappingStats.mapped}</div>
              <p className="text-xs text-muted-foreground">Mapped Items</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{mappingStats.conflicts}</div>
              <p className="text-xs text-muted-foreground">Unit Conflicts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{mappingStats.unmapped}</div>
              <p className="text-xs text-muted-foreground">Unmapped Items</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{mappingPercentage}%</div>
              <p className="text-xs text-muted-foreground">Mapping Progress</p>
              <Progress value={mappingPercentage} className="mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search mappings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="mapped">Mapped</SelectItem>
                <SelectItem value="conflict">Conflicts</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by store" />
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
            <Button variant="outline" onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setSelectedStore('all');
            }}>
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unmapped Ingredients */}
      {unmappedIngredients.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Unmapped Ingredients ({unmappedIngredients.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unmappedIngredients.map((ingredient, index) => (
                <div key={index} className="p-3 bg-white rounded-lg border">
                  <h4 className="font-medium text-red-800">{ingredient.ingredient_name}</h4>
                  <p className="text-sm text-red-600">
                    Used in {ingredient.recipe_count} recipe{ingredient.recipe_count > 1 ? 's' : ''}
                  </p>
                  <div className="mt-2">
                    <Button size="sm" variant="outline" className="text-red-700 border-red-300">
                      Create Mapping
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mappings List */}
      <Card>
        <CardHeader>
          <CardTitle>Ingredient Mappings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredMappings.map((mapping) => (
              <div key={mapping.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  {getStatusIcon(mapping.status)}
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{mapping.recipe_ingredient_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {mapping.recipe_unit}
                    </Badge>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <span>{mapping.inventory_item_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {mapping.conversion_unit}
                    </Badge>
                  </div>
                  <Badge variant={getStatusBadgeVariant(mapping.status)}>
                    {mapping.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {mapping.store_name}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {mapping.status === 'conflict' && (
                    <Button size="sm" variant="outline">
                      Fix Conflict
                    </Button>
                  )}
                  <Button size="sm" variant="ghost">
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredMappings.length === 0 && (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No mappings found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Recipe ingredients will appear here once they are mapped to inventory items'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};