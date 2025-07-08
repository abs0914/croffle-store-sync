
import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { RecipeEditDialogContent } from './RecipeEditDialogContent';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecipeEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: any | null;
  onSuccess: () => void;
}

export function RecipeEditDialog({ isOpen, onClose, recipe, onSuccess }: RecipeEditDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    yield_quantity: 1,
    serving_size: 1,
    approval_status: 'approved',
    is_active: true
  });
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (recipe && isOpen) {
      loadRecipeData();
    }
  }, [recipe, isOpen]);

  const loadRecipeData = async () => {
    if (!recipe) return;

    // Set basic form data
    setFormData({
      name: recipe.name || '',
      description: recipe.description || '',
      instructions: recipe.instructions || '',
      yield_quantity: recipe.yield_quantity || 1,
      serving_size: recipe.serving_size || 1,
      approval_status: recipe.approval_status || 'approved',
      is_active: recipe.is_active !== false
    });

    // Load ingredients
    await loadIngredients();
  };

  const loadIngredients = async () => {
    if (!recipe) return;

    try {
      let ingredientsData: any[] = [];

      // Try to load from existing recipe ingredients first
      const { data: recipeIngredients } = await supabase
        .from('recipe_ingredients')
        .select(`
          *,
          inventory_stock(item, unit, cost)
        `)
        .eq('recipe_id', recipe.id);

      if (recipeIngredients && recipeIngredients.length > 0) {
        ingredientsData = recipeIngredients.map((ing: any) => ({
          id: ing.id,
          ingredient_name: ing.inventory_stock?.item || 'Unknown Item',
          quantity: ing.quantity || 0,
          unit: ing.unit || 'kg',
          cost_per_unit: ing.cost_per_unit || ing.inventory_stock?.cost || 0,
          notes: ing.notes || '',
          inventory_stock_id: ing.inventory_stock_id,
          isNew: false
        }));
      } else if (recipe.template_id) {
        // If no recipe ingredients, try loading from template
        const { data: templateIngredients } = await supabase
          .from('recipe_template_ingredients')
          .select('*')
          .eq('recipe_template_id', recipe.template_id);

        if (templateIngredients) {
          ingredientsData = templateIngredients.map((ing: any) => ({
            id: `template-${ing.id}`,
            ingredient_name: ing.ingredient_name || ing.commissary_item_name || '',
            quantity: ing.quantity || 0,
            unit: ing.unit || 'kg',
            cost_per_unit: ing.cost_per_unit || 0,
            notes: '',
            inventory_stock_id: '',
            commissary_item_id: ing.commissary_item_id,
            isNew: true
          }));
        }
      }

      setIngredients(ingredientsData);
    } catch (error) {
      console.error('Error loading ingredients:', error);
      toast.error('Failed to load recipe ingredients');
    }
  };

  const handleFormDataChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipe) return;

    setIsSubmitting(true);
    try {
      // Update recipe basic info
      const { error: recipeError } = await supabase
        .from('recipes')
        .update({
          name: formData.name,
          description: formData.description,
          instructions: formData.instructions,
          yield_quantity: formData.yield_quantity,
          serving_size: formData.serving_size,
          approval_status: formData.approval_status,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', recipe.id);

      if (recipeError) throw recipeError;

      // Handle ingredients
      await saveIngredients();

      toast.success('Recipe updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating recipe:', error);
      toast.error('Failed to update recipe');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveIngredients = async () => {
    if (!recipe) return;

    // Delete existing ingredients
    await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', recipe.id);

    // Insert new ingredients
    if (ingredients.length > 0) {
      const ingredientsToInsert = ingredients
        .filter(ing => ing.ingredient_name && ing.quantity > 0)
        .map(ing => ({
          recipe_id: recipe.id,
          inventory_stock_id: ing.inventory_stock_id || null,
          quantity: ing.quantity,
          unit: ing.unit,
          cost_per_unit: ing.cost_per_unit || 0,
          notes: ing.notes || null
        }));

      if (ingredientsToInsert.length > 0) {
        const { error } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientsToInsert);

        if (error) throw error;
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <RecipeEditDialogContent
        recipe={recipe}
        formData={formData}
        onFormDataChange={handleFormDataChange}
        ingredients={ingredients}
        onIngredientsChange={setIngredients}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onClose={onClose}
      />
    </Dialog>
  );
}
