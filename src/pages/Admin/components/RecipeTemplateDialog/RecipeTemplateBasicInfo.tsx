
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Predefined template categories with display names
const TEMPLATE_CATEGORIES = [
  { value: 'premium', label: 'Premium' },
  { value: 'fruity', label: 'Fruity' },
  { value: 'classic', label: 'Classic' },
  { value: 'combo', label: 'Combo' },
  { value: 'mini_croffle', label: 'Mini Croffle' },
  { value: 'croffle_overload', label: 'Croffle Overload' },
  { value: 'addon', label: 'Add-ons' },
  { value: 'espresso', label: 'Espresso' },
  { value: 'beverages', label: 'Beverages' },
];

interface RecipeTemplateBasicInfoProps {
  formData: {
    name: string;
    description: string;
    category_name: string;
    base_price: number;
    suggested_markup_percentage: number;
    pos_price: number;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const RecipeTemplateBasicInfo: React.FC<RecipeTemplateBasicInfoProps> = ({
  formData,
  setFormData
}) => {
  // Find the display label for the current category value
  const getCurrentLabel = () => {
    const category = TEMPLATE_CATEGORIES.find(cat => cat.value === formData.category_name);
    return category?.label || formData.category_name;
  };
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Recipe Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter recipe name"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category_name}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category_name: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category">
                {formData.category_name && getCurrentLabel()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_CATEGORIES.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Recipe description"
          rows={3}
        />
      </div>

      {/* Pricing Section */}
      <div className="space-y-4">
        <h3 className="font-medium text-foreground">Pricing Information</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="base_price">Base Price (₱)</Label>
            <Input
              id="base_price"
              type="number"
              min="0"
              step="0.01"
              value={formData.base_price}
              onChange={(e) => {
                const basePrice = Number(e.target.value);
                const posPrice = basePrice * (1 + formData.suggested_markup_percentage / 100);
                setFormData(prev => ({ 
                  ...prev, 
                  base_price: basePrice,
                  pos_price: Number(posPrice.toFixed(2))
                }));
              }}
              placeholder="0.00"
            />
          </div>
          
          <div>
            <Label htmlFor="suggested_markup_percentage">Markup %</Label>
            <Input
              id="suggested_markup_percentage"
              type="number"
              min="0"
              max="1000"
              step="1"
              value={formData.suggested_markup_percentage}
              onChange={(e) => {
                const markup = Number(e.target.value);
                const posPrice = formData.base_price * (1 + markup / 100);
                setFormData(prev => ({ 
                  ...prev, 
                  suggested_markup_percentage: markup,
                  pos_price: Number(posPrice.toFixed(2))
                }));
              }}
              placeholder="50"
            />
          </div>
          
          <div>
            <Label htmlFor="pos_price">POS Price (₱)</Label>
            <Input
              id="pos_price"
              type="number"
              min="0"
              step="0.01"
              value={formData.pos_price}
              onChange={(e) => setFormData(prev => ({ ...prev, pos_price: Number(e.target.value) }))}
              placeholder="0.00"
              className="font-medium text-primary"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          POS Price is automatically calculated from Base Price + Markup %, but can be manually adjusted.
        </p>
      </div>
    </>
  );
};
