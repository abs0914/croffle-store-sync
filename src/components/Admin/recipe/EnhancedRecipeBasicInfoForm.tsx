import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Plus, ImageIcon, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadRecipeImage, validateImage } from '@/services/recipeManagement/imageUploadService';

interface RecipeImage {
  url: string;
  type: 'upload' | 'url';
  id: string;
}

interface ComboRule {
  primary_component: string;
  secondary_component: string;
  price: number;
}

interface EnhancedRecipeBasicInfoFormProps {
  formData: any;
  onChange: (updates: any) => void;
  isTemplate?: boolean;
}

export function EnhancedRecipeBasicInfoForm({ 
  formData, 
  onChange, 
  isTemplate 
}: EnhancedRecipeBasicInfoFormProps) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFieldChange = (field: string, value: any) => {
    onChange(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate image using the enhanced service
    const validation = validateImage(file);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setUploadingImage(true);
    try {
      const result = await uploadRecipeImage(file, { folder: 'templates' });
      
      if (result.success && result.url) {
        const newImage: RecipeImage = {
          url: result.url,
          type: 'upload',
          id: Date.now().toString()
        };

        const currentImages: RecipeImage[] = formData.images || [];
        handleFieldChange('images', [...currentImages, newImage]);
        
        // Also set as primary image URL for backward compatibility
        if (!formData.image_url) {
          handleFieldChange('image_url', result.url);
        }
        
        toast.success('Image uploaded successfully');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  }, [formData.images, formData.image_url, handleFieldChange]);

  const handleUrlAdd = () => {
    if (!urlInput.trim()) return;

    const newImage: RecipeImage = {
      url: urlInput.trim(),
      type: 'url',
      id: Date.now().toString()
    };

    const currentImages: RecipeImage[] = formData.images || [];
    handleFieldChange('images', [...currentImages, newImage]);
    
    // Also set as primary image URL for backward compatibility
    if (!formData.image_url) {
      handleFieldChange('image_url', urlInput.trim());
    }

    setUrlInput('');
    setShowUrlInput(false);
    toast.success('Image URL added successfully');
  };

  const removeImage = (imageId: string) => {
    const currentImages: RecipeImage[] = formData.images || [];
    const updatedImages = currentImages.filter(img => img.id !== imageId);
    handleFieldChange('images', updatedImages);
    
    // Update primary image URL if removed image was the primary one
    const removedImage = currentImages.find(img => img.id === imageId);
    if (removedImage && formData.image_url === removedImage.url) {
      const nextImage = updatedImages[0];
      handleFieldChange('image_url', nextImage?.url || '');
    }
  };

  const setPrimaryImage = (imageUrl: string) => {
    handleFieldChange('image_url', imageUrl);
    toast.success('Primary image updated');
  };

  const addComboRule = () => {
    const currentRules = formData.combo_rules?.pricing_matrix || [];
    const newRule: ComboRule = {
      primary_component: '',
      secondary_component: '',
      price: 0
    };
    
    const updatedRules = {
      ...formData.combo_rules,
      pricing_matrix: [...currentRules, newRule]
    };
    handleFieldChange('combo_rules', updatedRules);
  };

  const updateComboRule = (index: number, field: keyof ComboRule, value: any) => {
    const currentRules = formData.combo_rules?.pricing_matrix || [];
    const updatedRules = [...currentRules];
    updatedRules[index] = { ...updatedRules[index], [field]: value };
    
    const updatedComboRules = {
      ...formData.combo_rules,
      pricing_matrix: updatedRules
    };
    handleFieldChange('combo_rules', updatedComboRules);
  };

  const removeComboRule = (index: number) => {
    const currentRules = formData.combo_rules?.pricing_matrix || [];
    const updatedRules = currentRules.filter((_, i) => i !== index);
    
    const updatedComboRules = {
      ...formData.combo_rules,
      pricing_matrix: updatedRules
    };
    handleFieldChange('combo_rules', updatedComboRules);
  };

  const recipeType = formData.recipe_type || 'single';
  const images: RecipeImage[] = formData.images || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recipe Type Selector */}
          <div>
            <Label htmlFor="recipe_type">Recipe Type</Label>
            <Select
              value={recipeType}
              onValueChange={(value) => handleFieldChange('recipe_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recipe type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Recipe</SelectItem>
                <SelectItem value="combo">Combo Recipe</SelectItem>
                <SelectItem value="component">Component Recipe</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-2">
              <Badge variant={recipeType === 'combo' ? 'default' : 'secondary'}>
                {recipeType === 'single' && 'Single Recipe'}
                {recipeType === 'combo' && 'Combo Recipe'}
                {recipeType === 'component' && 'Component Recipe'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">
                {isTemplate ? 'Template' : 'Recipe'} Name *
              </Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder={`Enter ${isTemplate ? 'template' : 'recipe'} name`}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category_name || ''}
                onChange={(e) => handleFieldChange('category_name', e.target.value)}
                placeholder="Enter category"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder={`Describe this ${isTemplate ? 'template' : 'recipe'}`}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="yield">Yield Quantity</Label>
              <Input
                id="yield"
                type="number"
                min="1"
                value={formData.yield_quantity || 1}
                onChange={(e) => handleFieldChange('yield_quantity', parseInt(e.target.value) || 1)}
              />
            </div>
            
            <div>
              <Label htmlFor="serving">Serving Size</Label>
              <Input
                id="serving"
                type="number"
                min="1"
                value={formData.serving_size || 1}
                onChange={(e) => handleFieldChange('serving_size', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.is_active ?? true}
              onCheckedChange={(checked) => handleFieldChange('is_active', checked)}
            />
            <Label htmlFor="active">
              Active {isTemplate ? 'Template' : 'Recipe'}
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Image Upload Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Recipe Images
            </CardTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowUrlInput(!showUrlInput)}
              >
                <Link2 className="h-4 w-4 mr-1" />
                Add URL
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={uploadingImage}
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload Image
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL Input */}
          {showUrlInput && (
            <div className="flex gap-2">
              <Input
                placeholder="Enter image URL"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUrlAdd()}
              />
              <Button type="button" onClick={handleUrlAdd} size="sm">
                Add
              </Button>
            </div>
          )}

          {/* File Upload Input */}
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploadingImage}
            className="hidden"
          />

          {/* Images Grid */}
          {images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image, index) => (
                <div key={image.id} className="relative group">
                  <img
                    src={image.url}
                    alt={`Recipe image ${index + 1}`}
                    className={`w-full h-32 object-cover rounded-lg border-2 cursor-pointer transition-all ${
                      formData.image_url === image.url 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setPrimaryImage(image.url)}
                  />
                  {formData.image_url === image.url && (
                    <Badge className="absolute top-1 left-1 text-xs">Primary</Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="absolute top-1 right-8 text-xs"
                  >
                    {image.type === 'upload' ? 'File' : 'URL'}
                  </Badge>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeImage(image.id)}
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No images added yet. Upload files or add URLs to get started.
              </p>
              {uploadingImage && (
                <p className="text-sm text-primary mt-2">Uploading...</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Combo Configuration Section */}
      {recipeType === 'combo' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Combo Configuration</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addComboRule}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Pricing Rule
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define pricing rules for different component combinations (e.g., Croffle + Espresso combinations).
            </p>
            
            {formData.combo_rules?.pricing_matrix?.length > 0 ? (
              <div className="space-y-3">
                {formData.combo_rules.pricing_matrix.map((rule: ComboRule, index: number) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                    <div className="col-span-4">
                      <Label className="text-xs">Primary Component</Label>
                      <Input
                        placeholder="e.g., Mini Croffle"
                        value={rule.primary_component}
                        onChange={(e) => updateComboRule(index, 'primary_component', e.target.value)}
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Secondary Component</Label>
                      <Input
                        placeholder="e.g., Hot Americano"
                        value={rule.secondary_component}
                        onChange={(e) => updateComboRule(index, 'secondary_component', e.target.value)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Price (₱)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="110.00"
                        value={rule.price}
                        onChange={(e) => updateComboRule(index, 'price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeComboRule(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <p>No pricing rules defined yet.</p>
                <p className="text-sm">Click "Add Pricing Rule" to create combo pricing combinations.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}