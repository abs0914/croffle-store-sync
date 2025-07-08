
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { RecipeTemplateBasicInfo } from './RecipeTemplateBasicInfo';
import { RecipeTemplateImageUpload } from './RecipeTemplateImageUpload';
import { RecipeTemplateYieldInfo } from './RecipeTemplateYieldInfo';
import { RecipeTemplateInstructions } from './RecipeTemplateInstructions';
import { EnhancedIngredientBreakdown } from '@/components/Admin/components/EnhancedIngredientBreakdown';
import { useEnhancedRecipeIngredients } from '@/hooks/useEnhancedRecipeIngredients';
import {
  createRecipeTemplate,
  updateRecipeTemplate,
  RecipeTemplateData
} from '@/services/recipeManagement/recipeTemplateService';

interface EnhancedRecipeTemplateFormProps {
  template?: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EnhancedRecipeTemplateForm: React.FC<EnhancedRecipeTemplateFormProps> = ({
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

  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | undefined>(undefined);

  const { ingredients, bulkMappings, totalCost, saveIngredients } = useEnhancedRecipeIngredients(
    undefined, 
    currentTemplateId
  );

  // Initialize categories only once
  useEffect(() => {
    const initializeData = async () => {
      await fetchCategories();
    };
    
    initializeData();
  }, []);

  // Handle template data population
  useEffect(() => {
    if (template && !isInitialized) {
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
      
      setFormData(templateFormData);
      setCurrentTemplateId(template.id);
      setIsInitialized(true);
    } else if (!template && !isInitialized) {
      setIsInitialized(true);
    }
  }, [template, isInitialized]);

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

    if (ingredients.length === 0) {
      toast.error('At least one ingredient is required');
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
      let templateId: string;

      if (template) {
        result = await updateRecipeTemplate(template.id, templateData, []);
        templateId = template.id;
      } else {
        result = await createRecipeTemplate(templateData, []);
        templateId = result?.id;
      }

      if (result && templateId) {
        // Save enhanced ingredients
        const ingredientsSaved = await saveIngredients(ingredients, bulkMappings);
        
        if (ingredientsSaved) {
          toast.success(
            template 
              ? 'Enhanced recipe template updated successfully' 
              : 'Enhanced recipe template created successfully'
          );
          onSuccess();
          onClose();
        }
      }
    } catch (error) {
      console.error('Error saving enhanced recipe template:', error);
      toast.error('Failed to save enhanced recipe template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIngredientsSave = async (newIngredients: any[], newBulkMappings: any[]) => {
    return await saveIngredients(newIngredients, newBulkMappings);
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

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

      <EnhancedIngredientBreakdown
        templateId={currentTemplateId}
        onSave={handleIngredientsSave}
      />

      <RecipeTemplateInstructions
        instructions={formData.instructions}
        onInstructionsChange={(instructions) => setFormData(prev => ({ ...prev, instructions }))}
      />

      {totalCost > 0 && (
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Recipe Cost:</span>
            <span className="text-lg font-bold text-primary">₱{totalCost.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : template ? 'Update Enhanced Recipe' : 'Create Enhanced Recipe'}
        </Button>
      </div>
    </form>
  );
};
