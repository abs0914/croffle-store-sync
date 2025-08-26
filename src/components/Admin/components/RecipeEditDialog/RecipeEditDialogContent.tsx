
import React from 'react';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RecipeBasicInfoForm } from './RecipeBasicInfoForm';
import { RecipeIngredientsForm } from './RecipeIngredientsForm';
import { RecipeEditDialogFooter } from './RecipeEditDialogFooter';

interface RecipeEditDialogContentProps {
  recipe: any;
  formData: {
    name: string;
    description: string;
    instructions: string;
    yield_quantity: number;
    serving_size: number;
    approval_status: string;
    is_active: boolean;
  };
  onFormDataChange: (field: string, value: any) => void;
  ingredients: any[];
  onIngredientsChange: (ingredients: any[]) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function RecipeEditDialogContent({
  recipe,
  formData,
  onFormDataChange,
  ingredients,
  onIngredientsChange,
  isSubmitting,
  onSubmit,
  onClose
}: RecipeEditDialogContentProps) {
  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Recipe: {recipe?.name}</DialogTitle>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-6">
        <RecipeBasicInfoForm
          formData={formData}
          onChange={onFormDataChange}
        />

        <RecipeIngredientsForm
          ingredients={ingredients}
          onChange={onIngredientsChange}
          storeId={recipe?.store_id}
        />

        <RecipeEditDialogFooter
          isSubmitting={isSubmitting}
          onClose={onClose}
        />
      </form>
    </DialogContent>
  );
}
