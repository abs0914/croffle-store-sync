
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { ProductBundle, ProductBundleInput } from '@/types/productBundle';
import { 
  fetchProductBundles, 
  createProductBundle, 
  updateProductBundle, 
  deleteProductBundle,
  calculateBundleComponentCost
} from '@/services/productBundle/productBundleService';
import { supabase } from '@/integrations/supabase/client';

interface CommissaryItem {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  unit_cost: number;
}

export const ProductBundleManager: React.FC = () => {
  const [bundles, setBundles] = useState<ProductBundle[]>([]);
  const [commissaryItems, setCommissaryItems] = useState<CommissaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<ProductBundle | null>(null);
  const [formData, setFormData] = useState<ProductBundleInput>({
    name: '',
    description: '',
    total_price: 0,
    unit_description: '',
    components: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bundlesData, commissaryData] = await Promise.all([
        fetchProductBundles(),
        fetchCommissaryItems()
      ]);
      setBundles(bundlesData);
      setCommissaryItems(commissaryData);
    } catch (error) {
      console.error('Error loading bundle data:', error);
      toast.error('Failed to load bundle data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCommissaryItems = async (): Promise<CommissaryItem[]> => {
    try {
      const { data, error } = await supabase
        .from('commissary_inventory')
        .select('id, name, unit, current_stock, unit_cost')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching commissary items:', error);
      return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || formData.components.length === 0) {
      toast.error('Please provide bundle name and at least one component');
      return;
    }

    try {
      let success = false;
      
      if (editingBundle) {
        success = await updateProductBundle(editingBundle.id, formData);
      } else {
        const result = await createProductBundle(formData);
        success = !!result;
      }

      if (success) {
        setIsDialogOpen(false);
        setEditingBundle(null);
        resetForm();
        loadData();
      }
    } catch (error) {
      console.error('Error saving product bundle:', error);
      toast.error('Failed to save product bundle');
    }
  };

  const handleEdit = (bundle: ProductBundle) => {
    setEditingBundle(bundle);
    setFormData({
      name: bundle.name,
      description: bundle.description || '',
      total_price: bundle.total_price,
      unit_description: bundle.unit_description || '',
      components: bundle.components?.map(comp => ({
        commissary_item_id: comp.commissary_item_id,
        quantity: comp.quantity,
        unit: comp.unit
      })) || []
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product bundle?')) {
      const success = await deleteProductBundle(id);
      if (success) {
        loadData();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      total_price: 0,
      unit_description: '',
      components: []
    });
  };

  const addComponent = () => {
    setFormData(prev => ({
      ...prev,
      components: [...prev.components, { commissary_item_id: '', quantity: 1, unit: '' }]
    }));
  };

  const removeComponent = (index: number) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }));
  };

  const updateComponent = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.map((comp, i) => 
        i === index ? { ...comp, [field]: value } : comp
      )
    }));
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
          <Package className="h-5 w-5" />
          Product Bundles
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bundle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBundle ? 'Edit Product Bundle' : 'Create Product Bundle'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Bundle Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Regular Croissant + Whipped Cream"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="total_price">Total Price</Label>
                  <Input
                    id="total_price"
                    type="number"
                    step="0.01"
                    value={formData.total_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_price: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="unit_description">Unit Description</Label>
                <Input
                  id="unit_description"
                  value={formData.unit_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_description: e.target.value }))}
                  placeholder="e.g., 1 box/70pcs. and 7 piping bag whipped cream"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional details about this bundle"
                  rows={2}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Bundle Components</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addComponent}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Component
                  </Button>
                </div>
                
                {formData.components.map((component, index) => (
                  <div key={index} className="flex gap-2 mb-2 p-3 border rounded">
                    <Select
                      value={component.commissary_item_id}
                      onValueChange={(value) => {
                        updateComponent(index, 'commissary_item_id', value);
                        const item = commissaryItems.find(item => item.id === value);
                        if (item) {
                          updateComponent(index, 'unit', item.unit);
                        }
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {commissaryItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Input
                      type="number"
                      step="0.01"
                      value={component.quantity}
                      onChange={(e) => updateComponent(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-24"
                      placeholder="Qty"
                    />
                    
                    <Input
                      value={component.unit}
                      onChange={(e) => updateComponent(index, 'unit', e.target.value)}
                      className="w-20"
                      placeholder="Unit"
                      readOnly
                    />
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeComponent(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setEditingBundle(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBundle ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {bundles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No product bundles found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bundle Name</TableHead>
                  <TableHead>Components</TableHead>
                  <TableHead>Unit Description</TableHead>
                  <TableHead>Total Price</TableHead>
                  <TableHead>Component Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bundles.map((bundle) => (
                  <TableRow key={bundle.id}>
                    <TableCell className="font-medium">{bundle.name}</TableCell>
                    <TableCell>
                      {bundle.components?.map((comp, index) => (
                        <div key={index} className="text-sm">
                          {comp.commissary_item?.name || 'Unknown'} ({comp.quantity} {comp.unit})
                        </div>
                      )) || 'No components'}
                    </TableCell>
                    <TableCell>{bundle.unit_description || '-'}</TableCell>
                    <TableCell>₱{bundle.total_price.toLocaleString()}</TableCell>
                    <TableCell>₱{calculateBundleComponentCost(bundle).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(bundle)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(bundle.id)}
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
