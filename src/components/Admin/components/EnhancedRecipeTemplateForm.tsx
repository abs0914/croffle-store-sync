
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Minus, X } from 'lucide-react';
import { toast } from 'sonner';

interface RecipeTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  category?: string;
  subcategory?: string;
}

interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
}

interface PriceVariation {
  type: 'size' | 'temperature';
  name: string;
  modifier: number;
  is_default: boolean;
}

export const EnhancedRecipeTemplateForm: React.FC<RecipeTemplateFormProps> = ({
  isOpen,
  onClose,
  category,
  subcategory
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    yield_quantity: 1,
    serving_size: 1,
    base_price: 0,
    category: category || '',
    subcategory: subcategory || ''
  });

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [priceVariations, setPriceVariations] = useState<PriceVariation[]>([]);
  const [selectedAddOnCategories, setSelectedAddOnCategories] = useState<string[]>([]);

  const addIngredient = () => {
    setIngredients([...ingredients, {
      id: `ing-${Date.now()}`,
      name: '',
      quantity: 0,
      unit: 'g',
      cost_per_unit: 0
    }]);
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  const updateIngredient = (id: string, field: string, value: any) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    ));
  };

  const addPriceVariation = () => {
    setPriceVariations([...priceVariations, {
      type: 'size',
      name: '',
      modifier: 0,
      is_default: false
    }]);
  };

  const removePriceVariation = (index: number) => {
    setPriceVariations(priceVariations.filter((_, i) => i !== index));
  };

  const updatePriceVariation = (index: number, field: string, value: any) => {
    setPriceVariations(priceVariations.map((variation, i) => 
      i === index ? { ...variation, [field]: value } : variation
    ));
  };

  const addOnCategories = [
    'classic_topping', 'classic_sauce', 'premium_topping', 
    'premium_sauce', 'biscuits'
  ];

  const toggleAddOnCategory = (category: string) => {
    setSelectedAddOnCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Recipe name is required');
      return;
    }

    const templateData = {
      ...formData,
      ingredients,
      price_variations: priceVariations,
      compatible_add_ons: selectedAddOnCategories
    };

    console.log('Creating recipe template:', templateData);
    toast.success('Recipe template created successfully');
    onClose();
  };

  const getDefaultPriceForCategory = () => {
    if (category === 'croffles') {
      if (subcategory === 'regular') return 125;
      if (subcategory === 'varieties') {
        if (formData.name.includes('Mini')) return 65;
        if (formData.name.includes('Glaze')) return 79;
        if (formData.name.includes('Overload')) return 99;
      }
    }
    return 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Create Recipe Template - {category?.charAt(0).toUpperCase() + category?.slice(1)}
            {subcategory && ` (${subcategory})`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Recipe Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Tiramisu Regular Croffle"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of the recipe..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="yield">Yield Quantity</Label>
                  <Input
                    id="yield"
                    type="number"
                    value={formData.yield_quantity}
                    onChange={(e) => setFormData({...formData, yield_quantity: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="serving">Serving Size</Label>
                  <Input
                    id="serving"
                    type="number"
                    value={formData.serving_size}
                    onChange={(e) => setFormData({...formData, serving_size: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="base_price">Base Price (₱)</Label>
                <Input
                  id="base_price"
                  type="number"
                  value={formData.base_price || getDefaultPriceForCategory()}
                  onChange={(e) => setFormData({...formData, base_price: Number(e.target.value)})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.instructions}
                onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                placeholder="Step-by-step preparation instructions..."
                rows={8}
              />
            </CardContent>
          </Card>

          {/* Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Ingredients
                <Button size="sm" onClick={addIngredient}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ingredients.map((ingredient) => (
                <div key={ingredient.id} className="flex items-center gap-2 p-2 border rounded">
                  <Input
                    placeholder="Ingredient name"
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={ingredient.quantity}
                    onChange={(e) => updateIngredient(ingredient.id, 'quantity', Number(e.target.value))}
                    className="w-20"
                  />
                  <Select value={ingredient.unit} onValueChange={(value) => updateIngredient(ingredient.id, 'unit', value)}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="l">l</SelectItem>
                      <SelectItem value="pcs">pcs</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => removeIngredient(ingredient.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Price Variations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Price Variations
                <Button size="sm" onClick={addPriceVariation}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {priceVariations.map((variation, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  <Select value={variation.type} onValueChange={(value) => updatePriceVariation(index, 'type', value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="size">Size</SelectItem>
                      <SelectItem value="temperature">Temperature</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Name"
                    value={variation.name}
                    onChange={(e) => updatePriceVariation(index, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="±₱"
                    value={variation.modifier}
                    onChange={(e) => updatePriceVariation(index, 'modifier', Number(e.target.value))}
                    className="w-20"
                  />
                  <Button size="sm" variant="outline" onClick={() => removePriceVariation(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Compatible Add-ons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Compatible Add-ons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {addOnCategories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedAddOnCategories.includes(category) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleAddOnCategory(category)}
                >
                  {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Recipe Template</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
