
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { fetchCommissaryItemsForConversion, createConversionRecipe } from "@/services/inventoryManagement/inventoryConversionService";
import { useAuth } from "@/contexts/auth";
import { UOMSelect } from "@/components/shared/UOMSelect";

interface CreateRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface RecipeIngredient {
  commissary_item_id: string;
  quantity: number;
}

export function CreateRecipeDialog({
  open,
  onOpenChange,
  onSuccess
}: CreateRecipeDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [commissaryItems, setCommissaryItems] = useState<CommissaryInventoryItem[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    finished_item_name: '',
    finished_item_unit: '',
    yield_quantity: 1,
    instructions: ''
  });
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  useEffect(() => {
    if (open) {
      loadCommissaryItems();
      resetForm();
    }
  }, [open]);

  const loadCommissaryItems = async () => {
    const items = await fetchCommissaryItemsForConversion();
    setCommissaryItems(items);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      finished_item_name: '',
      finished_item_unit: '',
      yield_quantity: 1,
      instructions: ''
    });
    setIngredients([]);
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, { commissary_item_id: '', quantity: 1 }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    setIngredients(prev => prev.map((ingredient, i) => 
      i === index ? { ...ingredient, [field]: value } : ingredient
    ));
  };

  const getCommissaryItemById = (id: string) => {
    return commissaryItems.find(item => item.id === id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (ingredients.length === 0) {
      return;
    }

    const validIngredients = ingredients.filter(ing => ing.commissary_item_id && ing.quantity > 0);
    if (validIngredients.length === 0) {
      return;
    }

    setLoading(true);

    const success = await createConversionRecipe({
      ...formData,
      ingredients: validIngredients
    }, user.id);

    setLoading(false);

    if (success) {
      onSuccess();
      onOpenChange(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Conversion Recipe</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Recipe Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="finished_item_name">Finished Item Name *</Label>
              <Input
                id="finished_item_name"
                value={formData.finished_item_name}
                onChange={(e) => setFormData(prev => ({ ...prev, finished_item_name: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="finished_item_unit">Finished Item Unit *</Label>
              <UOMSelect
                value={formData.finished_item_unit}
                onChange={(value) => setFormData(prev => ({ ...prev, finished_item_unit: value }))}
                placeholder="Select unit"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="yield_quantity">Yield Quantity *</Label>
              <Input
                id="yield_quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.yield_quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, yield_quantity: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              rows={4}
            />
          </div>

          {/* Ingredients Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-medium">Ingredients</Label>
              <Button type="button" onClick={addIngredient} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Ingredient
              </Button>
            </div>

            <div className="space-y-3">
              {ingredients.map((ingredient, index) => {
                const commissaryItem = getCommissaryItemById(ingredient.commissary_item_id);
                return (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-1">
                      <Select
                        value={ingredient.commissary_item_id}
                        onValueChange={(value) => updateIngredient(index, 'commissary_item_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select commissary item" />
                        </SelectTrigger>
                        <SelectContent>
                          {commissaryItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{item.name}</span>
                                <Badge variant="outline" className="ml-2">
                                  {item.current_stock} {item.uom}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="w-32">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="Quantity"
                      />
                    </div>
                    
                    {commissaryItem && (
                      <div className="w-16 text-sm text-muted-foreground">
                        {commissaryItem.uom}
                      </div>
                    )}
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeIngredient(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              
              {ingredients.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No ingredients added yet. Click "Add Ingredient" to start.
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || ingredients.length === 0}>
              {loading ? 'Creating...' : 'Create Recipe'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
