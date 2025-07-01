
import React from 'react';
import { RecipeTemplateIngredientInput } from '@/services/recipeManagement/types';
import { LocationBasedIngredients } from './LocationBasedIngredients';

interface RecipeTemplateIngredientsProps {
  ingredients: RecipeTemplateIngredientInput[];
  setIngredients: React.Dispatch<React.SetStateAction<RecipeTemplateIngredientInput[]>>;
}

export const RecipeTemplateIngredients: React.FC<RecipeTemplateIngredientsProps> = ({
  ingredients,
  setIngredients
}) => {
  return (
    <LocationBasedIngredients
      ingredients={ingredients}
      setIngredients={setIngredients}
    />
  );
};
