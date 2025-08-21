import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Link2, Plus, ChefHat } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  store_id: string;
}

interface RecipeTemplate {
  id: string;
  name: string;
  description?: string;
  recipe_type: string;
}

interface UnlinkedProductActionsProps {
  product: Product;
  availableTemplates: RecipeTemplate[];
  storeId: string;
  onCreateTemplate?: () => void;
  onCreateRecipe?: () => void;
}

export const UnlinkedProductActions: React.FC<UnlinkedProductActionsProps> = ({
  product,
  availableTemplates,
  storeId,
  onCreateTemplate,
  onCreateRecipe
}) => {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const queryClient = useQueryClient();

  // Find potential template matches
  const potentialMatches = availableTemplates.filter(template => 
    template.name.toLowerCase().includes(product.name.toLowerCase()) ||
    product.name.toLowerCase().includes(template.name.toLowerCase())
  );

  const handleLinkToTemplate = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    setIsLinking(true);
    try {
      // Create recipe linking product to template
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: product.name,
          store_id: storeId,
          template_id: selectedTemplate,
          is_active: true,
          serving_size: 1,
          total_cost: 0,
          cost_per_serving: 0
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      // Link product to recipe
      const { error: linkError } = await supabase
        .from('products')
        .update({ recipe_id: recipe.id })
        .eq('id', product.id);

      if (linkError) throw linkError;

      toast.success(`Product "${product.name}" linked to template successfully`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowLinkDialog(false);
    } catch (error) {
      console.error('Error linking product:', error);
      toast.error('Failed to link product to template');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowLinkDialog(true)}
          className="flex items-center gap-1"
        >
          <Link2 className="h-3 w-3" />
          Link to Template
        </Button>
        
        {onCreateTemplate && (
          <Button
            size="sm"
            variant="outline"
            onClick={onCreateTemplate}
            className="flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Create Template
          </Button>
        )}
        
        {onCreateRecipe && (
          <Button
            size="sm"
            variant="outline"
            onClick={onCreateRecipe}
            className="flex items-center gap-1"
          >
            <ChefHat className="h-3 w-3" />
            Create Recipe
          </Button>
        )}
      </div>

      {/* Show potential matches as badges */}
      {potentialMatches.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground">Potential matches:</span>
          {potentialMatches.slice(0, 3).map(template => (
            <Badge key={template.id} variant="outline" className="text-xs">
              {template.name}
            </Badge>
          ))}
          {potentialMatches.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{potentialMatches.length - 3} more
            </Badge>
          )}
        </div>
      )}

      {/* Link to Template Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Product to Template</DialogTitle>
            <DialogDescription>
              Link "{product.name}" to an existing recipe template.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Template</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                        {template.description && (
                          <span className="text-xs text-muted-foreground">
                            {template.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {potentialMatches.length > 0 && (
              <div>
                <label className="text-sm font-medium">Suggested Matches</label>
                <div className="mt-1 space-y-1">
                  {potentialMatches.map(template => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted"
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.recipe_type}</div>
                      </div>
                      <Badge variant={selectedTemplate === template.id ? "default" : "outline"}>
                        {selectedTemplate === template.id ? "Selected" : "Select"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLinkToTemplate} disabled={!selectedTemplate || isLinking}>
              {isLinking ? 'Linking...' : 'Link to Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};