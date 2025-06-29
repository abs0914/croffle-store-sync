
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConversionMapping, ConversionMappingInput } from '@/types/conversionMapping';
import { 
  fetchConversionMappings, 
  createConversionMapping, 
  updateConversionMapping, 
  deleteConversionMapping 
} from '@/services/inventory/conversionMappingService';
import { fetchStoreInventoryForConversion } from '@/services/inventoryManagement/inventoryConversionService';
import { InventoryStock } from '@/types/inventory';

interface ConversionMappingManagerProps {
  storeId: string;
}

export const ConversionMappingManager: React.FC<ConversionMappingManagerProps> = ({ storeId }) => {
  const [mappings, setMappings] = useState<ConversionMapping[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ConversionMapping | null>(null);
  const [formData, setFormData] = useState<ConversionMappingInput>({
    inventory_stock_id: '',
    recipe_ingredient_name: '',
    recipe_ingredient_unit: '',
    conversion_factor: 1,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [storeId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mappingsData, inventoryData] = await Promise.all([
        fetchConversionMappings(storeId),
        fetchStoreInventoryForConversion(storeId)
      ]);
      setMappings(mappingsData);
      setInventoryItems(inventoryData);
    } catch (error) {
      console.error('Error loading conversion mapping data:', error);
      toast.error('Failed to load conversion mapping data');
    } finally {
      setIsLoading(false);
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
        success = await updateConversionMapping(editingMapping.id, formData);
      } else {
        const result = await createConversionMapping(formData);
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

  const handleEdit = (mapping: ConversionMapping) => {
    setEditingMapping(mapping);
    setFormData({
      inventory_stock_id: mapping.inventory_stock_id,
      recipe_ingredient_name: mapping.recipe_ingredient_name,
      recipe_ingredient_unit: mapping.recipe_ingredient_unit,
      conversion_factor: mapping.conversion_factor,
      notes: mapping.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this conversion mapping?')) {
      const success = await deleteConversionMapping(id);
      if (success) {
        loadData();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      inventory_stock_id: '',
      recipe_ingredient_name: '',
      recipe_ingredient_unit: '',
      conversion_factor: 1,
      notes: ''
    });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingMapping(null);
    resetForm();
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
        <CardTitle>Conversion Mappings</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMapping ? 'Edit Conversion Mapping' : 'Create Conversion Mapping'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Button type="button" variant="outline" onClick={handleDialogClose}>
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
            No conversion mappings found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inventory Item</TableHead>
                  <TableHead>Recipe Ingredient</TableHead>
                  <TableHead>Conversion Factor</TableHead>
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
                      {mapping.recipe_ingredient_name} ({mapping.recipe_ingredient_unit})
                    </TableCell>
                    <TableCell>
                      1 {mapping.inventory_stock?.unit} = {mapping.conversion_factor} {mapping.recipe_ingredient_unit}
                    </TableCell>
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
