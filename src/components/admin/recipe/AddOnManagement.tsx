import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Star, 
  Package,
  DollarSign,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AddonItem {
  id: string;
  name: string;
  category: string;
  price: number;
  is_premium: boolean;
  is_available: boolean;
  description?: string;
  display_order: number;
  addon_category_id?: string;
  image_url?: string;
}

interface AddonCategory {
  id: string;
  name: string;
  category_type: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

export const AddOnManagement: React.FC = () => {
  const [addonItems, setAddonItems] = useState<AddonItem[]>([]);
  const [addonCategories, setAddonCategories] = useState<AddonCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<AddonItem | null>(null);

  const [newItem, setNewItem] = useState({
    name: '',
    category: 'classic_topping',
    price: 0,
    is_premium: false,
    is_available: true,
    description: '',
    addon_category_id: '',
    image_url: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsResult, categoriesResult] = await Promise.all([
        supabase
          .from('product_addon_items')
          .select(`
            *,
            addon_categories!inner(name, category_type)
          `)
          .order('display_order'),
        supabase
          .from('addon_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order')
      ]);

      if (itemsResult.error) throw itemsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      setAddonItems(itemsResult.data || []);
      setAddonCategories(categoriesResult.data || []);
    } catch (error) {
      console.error('Error loading addon data:', error);
      toast.error('Failed to load addon data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.addon_category_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('product_addon_items')
        .insert([{
          ...newItem,
          display_order: addonItems.length
        }]);

      if (error) throw error;

      toast.success('Add-on item created successfully');
      setShowAddForm(false);
      setNewItem({
        name: '',
        category: 'classic_topping',
        price: 0,
        is_premium: false,
        is_available: true,
        description: '',
        addon_category_id: '',
        image_url: ''
      });
      loadData();
    } catch (error) {
      console.error('Error creating addon item:', error);
      toast.error('Failed to create addon item');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<AddonItem>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('product_addon_items')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Add-on item updated successfully');
      loadData();
    } catch (error) {
      console.error('Error updating addon item:', error);
      toast.error('Failed to update addon item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this add-on item?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('product_addon_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Add-on item deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting addon item:', error);
      toast.error('Failed to delete addon item');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = addonItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadgeVariant = (category: string) => {
    if (category.includes('premium')) return 'default';
    if (category.includes('sauce')) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Add-on Management</h2>
          <p className="text-muted-foreground">
            Manage add-on items and their pricing
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search add-ons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="classic_topping">Classic Toppings</SelectItem>
                <SelectItem value="premium_topping">Premium Toppings</SelectItem>
                <SelectItem value="classic_sauce">Classic Sauces</SelectItem>
                <SelectItem value="premium_sauce">Premium Sauces</SelectItem>
                <SelectItem value="biscuits">Biscuits</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {filteredItems.length} items
              </Badge>
              <Badge variant="secondary">
                {filteredItems.filter(item => item.is_premium).length} premium
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Item Form */}
      {showAddForm && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Add New Add-on Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Item Name</Label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Nutella, Sprinkles"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newItem.addon_category_id} onValueChange={(value) => 
                  setNewItem(prev => ({ ...prev, addon_category_id: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {addonCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Price (₱)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) => setNewItem(prev => ({ 
                    ...prev, 
                    price: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newItem.is_premium}
                  onCheckedChange={(checked) => setNewItem(prev => ({ 
                    ...prev, 
                    is_premium: checked 
                  }))}
                />
                <Label>Premium Item</Label>
              </div>
              <div className="md:col-span-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem(prev => ({ 
                    ...prev, 
                    description: e.target.value 
                  }))}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddItem} disabled={loading}>
                {loading ? 'Adding...' : 'Add Item'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <Card key={item.id} className="relative">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{item.name}</h3>
                    {item.is_premium && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <Badge variant={getCategoryBadgeVariant(item.category)} className="mb-2">
                    {item.category.replace('_', ' ')}
                  </Badge>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Price:</span>
                  <span className="text-lg font-bold text-green-600">₱{item.price.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Available:</span>
                  <Badge variant={item.is_available ? 'default' : 'destructive'}>
                    {item.is_available ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleUpdateItem(item.id, { 
                    is_available: !item.is_available 
                  })}
                >
                  {item.is_available ? 'Disable' : 'Enable'}
                </Button>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive"
                  onClick={() => handleDeleteItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No add-on items found</h3>
          <p className="text-muted-foreground">
            {searchQuery || selectedCategory !== 'all' 
              ? 'Try adjusting your filters'
              : 'Create your first add-on item to get started'
            }
          </p>
        </div>
      )}
    </div>
  );
};