
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Package, Link } from 'lucide-react';
import { toast } from 'sonner';
import { EnhancedConversionMapping } from '@/types/productBundle';
import { ProductBundle } from '@/types/productBundle';
import { fetchProductBundles } from '@/services/productBundle/productBundleService';
import { fetchStoreInventoryForConversion } from '@/services/inventoryManagement/inventoryConversionService';
import { InventoryStock } from '@/types/inventory';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedConversionMappingManagerProps {
  storeId: string;
}

export const EnhancedConversionMappingManager: React.FC<EnhancedConversionMappingManagerProps> = ({ storeId }) => {
  const [mappings, setMappings] = useState<EnhancedConversionMapping[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryStock[]>([]);
  const [bundles, setBundles] = useState<ProductBundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<EnhancedConversionMapping | null>(null);
  const [formData, setFormData] = useState({
    inventory_stock_id: '',
    recipe_ingredient_name: '',
    recipe_ingredient_unit: '',
    conversion_factor: 1,
    notes: '',
    bundle_id: '',
    is_bundle_component: false,
    component_ratio: 1
  });

  useEffect(() => {
    loadData();
  }, [storeId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mappingsData, inventoryData, bundlesData] = await Promise.all([
        fetchEnhancedConversionMappings(storeId),
        fetchStoreInventoryForConversion(storeId),
        fetchProductBundles()
      ]);
      setMappings(mappingsData);
      setInventoryItems(inventoryData);
      setBundles(bundlesData);
    } catch (error) {
      console.error('Error loading conversion mapping data:', error);
      toast.error('Failed to load conversion mapping data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEnhancedConversionMappings = async (storeId: string): Promise<EnhancedConversionMapping[]> => {
    try {
      let query = supabase
        .from('inventory_conversion_mappings')
        .select(`
          *,
          inventory_stock:inventory_stock(
            id,
            item,
            unit,
            stock_quantity,
            fractional_stock,
            store_id
          ),
          bundle:product_bundles(
            id,
            name,
            unit_description
          )
        `)
        .eq('is_active', true)
        .order('recipe_ingredient_name');

      if (storeId) {
        query = query.eq('inventory_stock.store_id', storeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching enhanced conversion mappings:', error);
      return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.inventory_stock_id || !formData.recipe_ingredient_name || !formData.recipe_ingredient_unit || formData.conversion_factor <= 0) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }

    try {
      let success = false;
      
      if (editingMapping) {
        success = await updateEnhancedConversionMapping(editingMapping.id, formData);
      } else {
        const result = await createEnhancedConversionMapping(formData);
        success = !!result;
      }

      if (success) {
        setIsDialogOpen(false);
        setEditingMapping(null);
        resetForm();
        loadData();
      }
    } catch (error) {
      console.error('Error saving conversion mapping:', error);
      toast.error('Failed to save conversion mapping');
    }
  };

  const createEnhancedConversionMapping = async (mappingData: any) => {
    try {
      const { data, error } = await supabase
        .from('inventory_conversion_mappings')
        .insert({
          inventory_stock_id: mappingData.inventory_stock_id,
          recipe_ingredient_name: mappingData.recipe_ingredient_name,
          recipe_ingredient_unit: mappingData.recipe_ingredient_unit,
          conversion_factor: mappingData.conversion_factor,
          notes: mappingData.notes,
          bundle_id: mappingData.bundle_id || null,
          is_bundle_component: mappingData.is_bundle_component,
          component_ratio: mappingData.component_ratio,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Enhanced conversion mapping created successfully');
      return data;
    } catch (error: any) {
      console.error('Error creating enhanced conversion mapping:', error);
      if (error.code === '23505') {
        toast.error('A conversion mapping already exists for this combination');
      } else {
        toast.error('Failed to create conversion mapping');
      }
      return null;
    }
  };

  const updateEnhancedConversionMapping = async (id: string, updates: any): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('inventory_conversion_mappings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Conversion mapping updated successfully');
      return true;
    } catch (error: any) {
      console.error('Error updating conversion mapping:', error);
      toast.error('Failed to update conversion mapping');
      return false;
    }
  };

  const handleEdit = (mapping: EnhancedConversionMapping) => {
    setEditingMapping(mapping);
    setFormData({
      inventory_stock_id: mapping.inventory_stock_id,
      recipe_ingredient_name: mapping.recipe_ingredient_name,
      recipe_ingredient_unit: mapping.recipe_ingredient_unit,
      conversion_factor: mapping.conversion_factor,
      notes: mapping.notes || '',
      bundle_id: mapping.bundle_id || '',
      is_bundle_component: mapping.is_bundle_component,
      component_ratio: mapping.component_ratio
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this conversion mapping?')) {
      try {
        const { error } = await supabase
          .from('inventory_conversion_mappings')
          .update({ is_active: false })
          .eq('id', id);

        if (error) throw error;
        toast.success('Conversion mapping deleted successfully');
        loadData();
      } catch (error) {
        console.error('Error deleting conversion mapping:', error);
        toast.error('Failed to delete conversion mapping');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      inventory_stock_id: '',
      recipe_ingredient_name: '',
      recipe_ingredient_unit: '',
      conversion_factor: 1,
      notes: '',
      bundle_id: '',
      is_bundle_component: false,
      component_ratio: 1
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Enhanced Conversion Mappings
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMapping ? 'Edit Enhanced Conversion Mapping' : 'Create Enhanced Conversion Mapping'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="inventory_item">Inventory Item</Label>
                  <Select
                    value={formData.inventory_stock_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, inventory_stock_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select inventory item" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.item} ({item.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bundle">Product Bundle (Optional)</Label>
                  <Select
                    value={formData.bundle_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, bundle_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bundle (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Bundle</SelectItem>
                      {bundles.map(bundle => (
                        <SelectItem key={bundle.id} value={bundle.id}>
                          {bundle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipe_ingredient_name">Recipe Ingredient Name</Label>
                  <Input
                    id="recipe_ingredient_name"
                    value={formData.recipe_ingredient_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipe_ingredient_name: e.target.value }))}
                    placeholder="e.g., Croissant"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="recipe_ingredient_unit">Recipe Ingredient Unit</Label>
                  <Input
                    id="recipe_ingredient_unit"
                    value={formData.recipe_ingredient_unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipe_ingredient_unit: e.target.value }))}
                    placeholder="e.g., piece"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="conversion_factor">Conversion Factor</Label>
                  <Input
                    id="conversion_factor"
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={formData.conversion_factor}
                    onChange={(e) => setFormData(prev => ({ ...prev, conversion_factor: parseFloat(e.target.value) || 1 }))}
                    placeholder="e.g., 12 (if 1 box = 12 pieces)"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="component_ratio">Component Ratio</Label>
                  <Input
                    id="component_ratio"
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={formData.component_ratio}
                    onChange={(e) => setFormData(prev => ({ ...prev, component_ratio: parseFloat(e.target.value) || 1 }))}
                    placeholder="e.g., 0.5 (for half usage in bundle)"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_bundle_component"
                  checked={formData.is_bundle_component}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_bundle_component: !!checked }))}
                />
                <Label htmlFor="is_bundle_component">Is Bundle Component</Label>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this conversion"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setEditingMapping(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMapping ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {mappings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No enhanced conversion mappings found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inventory Item</TableHead>
                  <TableHead>Recipe Ingredient</TableHead>
                  <TableHead>Bundle</TableHead>
                  <TableHead>Conversion Factor</TableHead>
                  <TableHead>Component Ratio</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell>
                      {mapping.inventory_stock?.item} ({mapping.inventory_stock?.unit})
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {mapping.is_bundle_component && <Package className="h-4 w-4 text-blue-500" />}
                        {mapping.recipe_ingredient_name} ({mapping.recipe_ingredient_unit})
                      </div>
                    </TableCell>
                    <TableCell>
                      {mapping.bundle?.name || '-'}
                    </TableCell>
                    <TableCell>
                      1 {mapping.inventory_stock?.unit} = {mapping.conversion_factor} {mapping.recipe_ingredient_unit}
                    </TableCell>
                    <TableCell>{mapping.component_ratio}</TableCell>
                    <TableCell>{mapping.notes || '-'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(mapping)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(mapping.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
