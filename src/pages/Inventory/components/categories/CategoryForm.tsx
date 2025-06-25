
import React, { useState } from 'react';
import { Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface CategoryFormProps {
  category?: Category;
  onSubmit: (data: Partial<Category>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CategoryForm({ category, onSubmit, onCancel, isLoading }: CategoryFormProps) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    image_url: category?.image_url || '',
    is_active: category?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="image_url">Image URL</Label>
        <Input
          id="image_url"
          type="url"
          value={formData.image_url}
          onChange={(e) => handleChange('image_url', e.target.value)}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => handleChange('is_active', checked)}
        />
        <Label>Active</Label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : (category ? 'Update' : 'Create')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
