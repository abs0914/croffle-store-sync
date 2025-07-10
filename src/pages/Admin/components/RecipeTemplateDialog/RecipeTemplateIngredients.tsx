
import React from 'react';
import { RecipeTemplateIngredientInput } from '@/services/recipeManagement/types';
// import { LocationBasedIngredients } from './LocationBasedIngredients';

interface RecipeTemplateIngredientsProps {
  ingredients: RecipeTemplateIngredientInput[];
  setIngredients: React.Dispatch<React.SetStateAction<RecipeTemplateIngredientInput[]>>;
}

export const RecipeTemplateIngredients: React.FC<RecipeTemplateIngredientsProps> = ({
  ingredients,
  setIngredients
}) => {
  return (
    <div className="text-center py-8 text-muted-foreground">
      Recipe template ingredients management will be available in a future update.
    </div>
  );
};
