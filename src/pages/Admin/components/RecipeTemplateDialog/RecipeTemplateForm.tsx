
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { RecipeTemplateBasicInfo } from './RecipeTemplateBasicInfo';
import { RecipeTemplateImageUpload } from './RecipeTemplateImageUpload';
import { RecipeTemplateYieldInfo } from './RecipeTemplateYieldInfo';
import { RecipeTemplateIngredients } from './RecipeTemplateIngredients';
import { RecipeTemplateInstructions } from './RecipeTemplateInstructions';
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

interface CommissaryItem {
  id: string;
  name: string;
  unit: string;
  unit_cost?: number;
}

export const RecipeTemplateForm: React.FC<RecipeTemplateFormProps> = ({
  template,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_name: '',
    instructions: '',
    yield_quantity: 1,
    serving_size: 1,
    image_url: ''
  });

  const [ingredients, setIngredients] = useState<RecipeTemplateIngredientInput[]>([]);
  const [commissaryItems, setCommissaryItems] = useState<CommissaryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([fetchCommissaryItems(), fetchCategories()]);
      
      if (template) {
        console.log('Populating form with template:', template);
        
        const templateFormData = {
          name: template.name || '',
          description: template.description || '',
          category_name: template.category_name || '',
          instructions: template.instructions || '',
          yield_quantity: Number(template.yield_quantity) || 1,
          serving_size: Number(template.serving_size) || 1,
          image_url: template.image_url || ''
        };
        
        console.log('Setting form data:', templateFormData);
        setFormData(templateFormData);
        
        if (template.ingredients && Array.isArray(template.ingredients)) {
          const mappedIngredients = template.ingredients.map((ing: any) => ({
            commissary_item_id: ing.commissary_item_id || '',
            commissary_item_name: ing.commissary_item_name || '',
            quantity: Number(ing.quantity) || 1,
            unit: ing.unit || 'g',
            cost_per_unit: Number(ing.cost_per_unit) || 0
          }));
          
          console.log('Setting ingredients:', mappedIngredients);
          setIngredients(mappedIngredients);
        } else {
          setIngredients([]);
        }
      } else {
        console.log('Resetting form for new template');
        setFormData({
          name: '',
          description: '',
          category_name: '',
          instructions: '',
          yield_quantity: 1,
          serving_size: 1,
          image_url: ''
        });
        setIngredients([]);
      }
    };
    
    initializeData();
  }, [template?.id]);

  const fetchCommissaryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('commissary_inventory')
        .select('id, name, unit, unit_cost')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCommissaryItems(data || []);
    } catch (error) {
      console.error('Error fetching commissary items:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      const uniqueCategories = [...new Set(data?.map(cat => cat.name) || [])];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Recipe name is required');
      return;
    }

    setIsLoading(true);

    try {
      const templateData: RecipeTemplateData = {
        ...formData,
        created_by: (await supabase.auth.getUser()).data.user?.id || '',
        is_active: true,
        version: template?.version || 1
      };

      let result: any;
      if (template) {
        result = await updateRecipeTemplate(template.id, templateData, ingredients);
      } else {
        result = await createRecipeTemplate(templateData, ingredients);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <RecipeTemplateBasicInfo
        formData={formData}
        setFormData={setFormData}
        categories={categories}
      />

      <RecipeTemplateImageUpload
        imageUrl={formData.image_url}
        uploadingImage={uploadingImage}
        setUploadingImage={setUploadingImage}
        onImageChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
      />

      <RecipeTemplateYieldInfo
        formData={formData}
        setFormData={setFormData}
      />

      <RecipeTemplateIngredients
        ingredients={ingredients}
        setIngredients={setIngredients}
        commissaryItems={commissaryItems}
      />

      <RecipeTemplateInstructions
        instructions={formData.instructions}
        onInstructionsChange={(instructions) => setFormData(prev => ({ ...prev, instructions }))}
      />

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : template ? 'Update Recipe' : 'Create Recipe'}
        </Button>
      </div>
    </form>
  );
};
