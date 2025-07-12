
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
    </>
  );
};
