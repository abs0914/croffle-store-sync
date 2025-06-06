
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus } from "lucide-react";
import { 
  CommissaryInventoryItem, 
  ConversionRecipeForm, 
  ConversionRecipeIngredientForm 
} from "@/types/inventoryManagement";
import { createConversionRecipe } from "@/services/inventoryManagement/inventoryConversionService";
import { toast } from "sonner";

interface CreateRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commissaryItems: CommissaryInventoryItem[];
  onSuccess: () => void;
  userId: string;
}

export function CreateRecipeDialog({
  open,
  onOpenChange,
  commissaryItems,
  onSuccess,
  userId
}: CreateRecipeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ConversionRecipeForm>({
    name: '',
    description: '',
    finished_item_name: '',
    finished_item_unit: '',
    yield_quantity: 1,
    instructions: '',
    ingredients: [{ commissary_item_id: '', quantity: 0 }]
  });

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { commissary_item_id: '', quantity: 0 }]
    }));
  };

  const removeIngredient = (index: number) => {
    if (formData.ingredients.length > 1) {
      setFormData(prev => ({
        ...prev,
        ingredients: prev.ingredients.filter((_, i) => i !== index)
      }));
    }
  };

  const updateIngredient = (index: number, field: keyof ConversionRecipeIngredientForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient, i) => 
        i === index ? { ...ingredient, [field]: value } : ingredient
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.finished_item_name || !formData.finished_item_unit) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.ingredients.some(ing => !ing.commissary_item_id || ing.quantity <= 0)) {
      toast.error('Please fill in all ingredient details');
      return;
    }

    setLoading(true);

    const recipe = await createConversionRecipe(formData, userId);

    setLoading(false);

    if (recipe) {
      onSuccess();
      onOpenChange(false);
      setFormData({
        name: '',
        description: '',
        finished_item_name: '',
        finished_item_unit: '',
        yield_quantity: 1,
        instructions: '',
        ingredients: [{ commissary_item_id: '', quantity: 0 }]
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Conversion Recipe Template</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Recipe Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Basic Croffle Mix"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the recipe"
              />
            </div>
          </div>

          {/* Finished Product Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="finished_item_name">Finished Item Name *</Label>
              <Input
                id="finished_item_name"
                value={formData.finished_item_name}
                onChange={(e) => setFormData(prev => ({ ...prev, finished_item_name: e.target.value }))}
                placeholder="e.g., Croffle Mix"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="finished_item_unit">Unit *</Label>
              <Input
                id="finished_item_unit"
                value={formData.finished_item_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, finished_item_unit: e.target.value }))}
                placeholder="e.g., portions, kg"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="yield_quantity">Yield Quantity *</Label>
              <Input
                id="yield_quantity"
                type="number"
                min="0"
                step="0.1"
                value={formData.yield_quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, yield_quantity: parseFloat(e.target.value) || 1 }))}
                required
              />
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Recipe Ingredients</Label>
              <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                <Plus className="h-4 w-4 mr-2" />
                Add Ingredient
              </Button>
            </div>

            {formData.ingredients.map((ingredient, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Ingredient {index + 1}</h4>
                  {formData.ingredients.length > 1 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => removeIngredient(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Raw Material</Label>
                    <Select
                      value={ingredient.commissary_item_id}
                      onValueChange={(value) => updateIngredient(index, 'commissary_item_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select raw material" />
                      </SelectTrigger>
                      <SelectContent>
                        {commissaryItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={ingredient.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Step-by-step conversion instructions..."
              rows={4}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Recipe'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
