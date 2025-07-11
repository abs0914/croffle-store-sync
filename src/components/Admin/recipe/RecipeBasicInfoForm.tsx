import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RecipeBasicInfoFormProps {
  formData: any;
  onChange: (updates: any) => void;
  isTemplate?: boolean;
}

export function RecipeBasicInfoForm({ formData, onChange, isTemplate }: RecipeBasicInfoFormProps) {
  const handleFieldChange = (field: string, value: any) => {
    onChange(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">
              {isTemplate ? 'Template' : 'Recipe'} Name *
            </Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder={`Enter ${isTemplate ? 'template' : 'recipe'} name`}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category_name || ''}
              onChange={(e) => handleFieldChange('category_name', e.target.value)}
              placeholder="Enter category"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder={`Describe this ${isTemplate ? 'template' : 'recipe'}`}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="yield">Yield Quantity</Label>
            <Input
              id="yield"
              type="number"
              min="1"
              value={formData.yield_quantity || 1}
              onChange={(e) => handleFieldChange('yield_quantity', parseInt(e.target.value) || 1)}
            />
          </div>
          
          <div>
            <Label htmlFor="serving">Serving Size</Label>
            <Input
              id="serving"
              type="number"
              min="1"
              value={formData.serving_size || 1}
              onChange={(e) => handleFieldChange('serving_size', parseInt(e.target.value) || 1)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="image">Image URL</Label>
          <Input
            id="image"
            value={formData.image_url || ''}
            onChange={(e) => handleFieldChange('image_url', e.target.value)}
            placeholder="Enter image URL"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="active"
            checked={formData.is_active ?? true}
            onCheckedChange={(checked) => handleFieldChange('is_active', checked)}
          />
          <Label htmlFor="active">
            Active {isTemplate ? 'Template' : 'Recipe'}
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}