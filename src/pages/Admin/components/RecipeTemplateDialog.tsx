
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { RecipeTemplate, RecipeTemplateIngredient } from '@/services/recipeManagement/types';
import { 
  createRecipeTemplate, 
  updateRecipeTemplate, 
  RecipeTemplateData,
  RecipeTemplateIngredientInput 
} from '@/services/recipeManagement/recipeTemplateService';

interface RecipeTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template?: any | null;
  onSuccess: () => void;
}

interface CommissaryItem {
  id: string;
  name: string;
  unit: string;
  unit_cost?: number;
}

export const RecipeTemplateDialog: React.FC<RecipeTemplateDialogProps> = ({
  isOpen,
  onClose,
  template,
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

  // Single useEffect to handle all dialog state management
  useEffect(() => {
    if (isOpen) {
      console.log('Dialog opened, initializing...');
      
      // Initialize data
      const initializeData = async () => {
        await Promise.all([fetchCommissaryItems(), fetchCategories()]);
        
        // After data is loaded, populate form if template exists
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
          
          // Handle ingredients
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
          // Reset for new template creation
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
    }
  }, [isOpen, template?.id]); // Only depend on dialog open state and template id

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `recipe-template-${Date.now()}.${fileExt}`;
      const filePath = `templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const addIngredient = () => {
    setIngredients([...ingredients, {
      commissary_item_id: '',
      commissary_item_name: '',
      quantity: 1,
      unit: 'g',
      cost_per_unit: 0
    }]);
  };

  const updateIngredient = (index: number, field: keyof RecipeTemplateIngredientInput, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'commissary_item_name' && value) {
      const item = commissaryItems.find(ci => ci.name === value);
      if (item) {
        updated[index].commissary_item_id = item.id;
        updated[index].unit = item.unit;
        updated[index].cost_per_unit = item.unit_cost || 0;
      }
    }
    
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
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

      let result;
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

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Recipe Template' : 'Create Recipe Template'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Recipe Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter recipe name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_name}
                onValueChange={(value) => setFormData({ ...formData, category_name: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Recipe description"
              rows={3}
            />
          </div>

          {/* Image Upload Section */}
          <div>
            <Label>Recipe Image</Label>
            <div className="space-y-4">
              {formData.image_url ? (
                <div className="relative">
                  <img 
                    src={formData.image_url} 
                    alt="Recipe" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={removeImage}
                    className="absolute top-2 right-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Label htmlFor="image-upload" className="cursor-pointer">
                      <span className="text-sm text-gray-600">Click to upload an image</span>
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </Label>
                  </div>
                  {uploadingImage && (
                    <p className="text-sm text-blue-600 mt-2">Uploading...</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="yield_quantity">Yield Quantity</Label>
              <Input
                id="yield_quantity"
                type="number"
                min="1"
                step="0.1"
                value={formData.yield_quantity}
                onChange={(e) => setFormData({ ...formData, yield_quantity: parseFloat(e.target.value) || 1 })}
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
                onChange={(e) => setFormData({ ...formData, serving_size: parseFloat(e.target.value) || 1 })}
              />
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ingredients</CardTitle>
              <Button type="button" onClick={addIngredient} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Ingredient
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="grid grid-cols-5 gap-2 items-end">
                  <div>
                    <Label>Commissary item</Label>
                    <Select
                      value={ingredient.commissary_item_name}
                      onValueChange={(value) => updateIngredient(index, 'commissary_item_name', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {commissaryItems.map(item => (
                          <SelectItem key={item.id} value={item.name}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={ingredient.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div>
                    <Label>Unit</Label>
                    <Select
                      value={ingredient.unit}
                      onValueChange={(value) => updateIngredient(index, 'unit', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="pieces">pieces</SelectItem>
                        <SelectItem value="liters">liters</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="boxes">boxes</SelectItem>
                        <SelectItem value="packs">packs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Cost per Unit</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ingredient.cost_per_unit || 0}
                      onChange={(e) => updateIngredient(index, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeIngredient(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {ingredients.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No ingredients added yet. Click "Add Ingredient" to get started.
                </p>
              )}
            </CardContent>
          </Card>

          <div>
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Preparation instructions"
              rows={5}
            />
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : template ? 'Update Recipe' : 'Create Recipe'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
