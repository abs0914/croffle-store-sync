
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RecipeTemplateYieldInfoProps {
  formData: {
    yield_quantity: number;
    serving_size: number;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const RecipeTemplateYieldInfo: React.FC<RecipeTemplateYieldInfoProps> = ({
  formData,
  setFormData
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="yield_quantity">Yield Quantity</Label>
        <Input
          id="yield_quantity"
          type="number"
          min="1"
          step="0.1"
          value={formData.yield_quantity}
          onChange={(e) => setFormData(prev => ({ ...prev, yield_quantity: parseFloat(e.target.value) || 1 }))}
        />
      </div>
      
      <div>
        <Label htmlFor="serving_size">Serving Size</Label>
        <Input
          id="serving_size"
          type="number"
          min="1"
          step="0.1"
          value={formData.serving_size}
          onChange={(e) => setFormData(prev => ({ ...prev, serving_size: parseFloat(e.target.value) || 1 }))}
        />
      </div>
    </div>
  );
};
