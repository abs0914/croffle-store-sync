
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface RecipeBasicInfoFormProps {
  formData: {
    name: string;
    description: string;
    instructions: string;
    yield_quantity: number;
    serving_size: number;
    approval_status: string;
    is_active: boolean;
  };
  onChange: (field: string, value: any) => void;
}

export function RecipeBasicInfoForm({ formData, onChange }: RecipeBasicInfoFormProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Recipe Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onChange('name', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="yield_quantity">Yield Quantity</Label>
          <Input
            id="yield_quantity"
            type="number"
            min="0.1"
            step="0.1"
            value={formData.yield_quantity}
            onChange={(e) => onChange('yield_quantity', parseFloat(e.target.value) || 1)}
          />
        </div>

        <div>
          <Label htmlFor="serving_size">Serving Size</Label>
          <Input
            id="serving_size"
            type="number"
            min="1"
            value={formData.serving_size}
            onChange={(e) => onChange('serving_size', parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="approval_status">Approval Status</Label>
          <Select
            value={formData.approval_status}
            onValueChange={(value) => onChange('approval_status', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => onChange('is_active', checked)}
          />
          <Label htmlFor="is_active">Active Recipe</Label>
        </div>
      </div>

      <div className="md:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onChange('description', e.target.value)}
          rows={3}
        />
      </div>

      <div className="md:col-span-2">
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          value={formData.instructions}
          onChange={(e) => onChange('instructions', e.target.value)}
          rows={6}
        />
      </div>
    </div>
  );
}
