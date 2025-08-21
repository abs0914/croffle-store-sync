import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { RecipeTemplateIngredients } from './RecipeTemplateIngredients';
import {
  createRecipeTemplate,
  updateRecipeTemplate,
  RecipeTemplateData,
  RecipeTemplateIngredientInput
} from '@/services/recipeManagement/recipeTemplateService';

interface RecipeTemplateFormProps {
  template?: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecipeTemplateForm: React.FC<RecipeTemplateFormProps> = ({
  template,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: ''
  });

  const [ingredients, setIngredients] = useState<RecipeTemplateIngredientInput[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Template categories are now predefined in RecipeTemplateBasicInfo component

  // Handle template data population - separate from basic data initialization
  useEffect(() => {
    if (template && !isInitialized) {
      console.log('Populating form with template:', template);
      
      const templateFormData = {
        name: template.name || ''
      };
      
      console.log('Setting form data:', templateFormData);
      setFormData(templateFormData);
      
      if (template.ingredients && Array.isArray(template.ingredients)) {
        const mappedIngredients = template.ingredients.map((ing: any) => ({
          ingredient_name: ing.ingredient_name || ing.commissary_item_name || '',
          quantity: Number(ing.quantity) || 1,
          unit: ing.unit || 'g',
          estimated_cost_per_unit: Number(ing.cost_per_unit) || Number(ing.estimated_cost_per_unit) || 0,
          location_type: ing.location_type || 'all',
          ingredient_group_id: ing.ingredient_group_id,
          ingredient_group_name: ing.ingredient_group_name,
          is_optional: ing.is_optional,
          group_selection_type: ing.group_selection_type,
          suggested_suppliers: ing.suggested_suppliers || [],
          preparation_notes: ing.preparation_notes || ''
        }));
        
        console.log('Setting ingredients:', mappedIngredients);
        setIngredients(mappedIngredients);
      }
      
      setIsInitialized(true);
    } else if (!template && !isInitialized) {
      // For new templates, just mark as initialized
      console.log('Initializing for new template');
      setIsInitialized(true);
    }
  }, [template, isInitialized]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Recipe name is required');
      return;
    }

    if (ingredients.length === 0) {
      toast.error('At least one ingredient is required');
      return;
    }

    // Validate ingredients - filter out empty/invalid entries first
    const validIngredients = ingredients.filter(ing => 
      ing.ingredient_name && 
      ing.ingredient_name.trim() && 
      ing.quantity > 0
    );
    
    if (validIngredients.length === 0) {
      toast.error('At least one valid ingredient is required');
      return;
    }

    // Update ingredients state to only include valid ones
    setIngredients(validIngredients);

    setIsLoading(true);

    try {
      const templateData: RecipeTemplateData = {
        ...formData,
        description: '',
        category_name: 'classic',
        instructions: '',
        yield_quantity: 1,
        serving_size: 1,
        image_url: '',
        price: 0,
        created_by: (await supabase.auth.getUser()).data.user?.id || '',
        is_active: true,
        version: template?.version || 1
      };

      let result: any;
      if (template) {
        result = await updateRecipeTemplate(template.id, templateData, validIngredients);
      } else {
        result = await createRecipeTemplate(templateData, validIngredients);
      }

      if (result) {
        toast.success(template ? 'Recipe template updated successfully' : 'Recipe template created successfully');
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error saving recipe template:', error);
      toast.error('Failed to save recipe template');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render the form until it's properly initialized
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Template Name */}
          <div>
            <Label htmlFor="name">Recipe Template Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter recipe template name"
              required
            />
          </div>

          {/* Ingredients Section */}
          <RecipeTemplateIngredients
            ingredients={ingredients}
            setIngredients={setIngredients}
            storeId={undefined} // Recipe templates are store-agnostic, use commissary inventory
          />
        </div>
        
        <div className="border-t bg-card/50 px-6 py-4">
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : template ? 'Update Recipe' : 'Create Recipe'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
