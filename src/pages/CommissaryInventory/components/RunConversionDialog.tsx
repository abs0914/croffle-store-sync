
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { fetchConversionRecipes } from "@/services/inventoryManagement/inventoryConversionService";
import { ConversionRecipe } from "@/types/inventoryManagement";
import { executeConversion } from "@/services/conversion/conversionService";
import { ConversionRequest } from "@/types/commissary";
import { toast } from "sonner";
import { Package, ChefHat } from "lucide-react";

interface RunConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RunConversionDialog({ open, onOpenChange, onSuccess }: RunConversionDialogProps) {
  const [conversionRecipes, setConversionRecipes] = useState<ConversionRecipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [quantityToConvert, setQuantityToConvert] = useState<number>(1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadConversionRecipes();
    }
  }, [open]);

  const loadConversionRecipes = async () => {
    setLoading(true);
    try {
      const recipes = await fetchConversionRecipes();
      console.log('Loaded conversion recipes:', recipes);
      setConversionRecipes(recipes);
    } catch (error) {
      console.error('Error loading conversion recipes:', error);
      toast.error('Failed to load conversion recipes');
    } finally {
      setLoading(false);
    }
  };

  const selectedRecipe = conversionRecipes.find(r => r.id === selectedRecipeId);

  const handleExecuteConversion = async () => {
    if (!selectedRecipe) {
      toast.error('Please select a conversion recipe');
      return;
    }

    if (quantityToConvert <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setIsExecuting(true);
    try {
      // Build conversion request from selected recipe
      const conversionRequest: ConversionRequest = {
        name: `${selectedRecipe.name} - Batch ${Date.now()}`,
        description: `Converting ${quantityToConvert} batches of ${selectedRecipe.name}`,
        input_items: selectedRecipe.ingredients?.map(ingredient => ({
          commissary_item_id: ingredient.commissary_item_id,
          quantity: ingredient.quantity * quantityToConvert,
          unit: ingredient.commissary_item?.uom || 'units'
        })) || [],
        output_item: {
          name: selectedRecipe.finished_item_name,
          quantity: selectedRecipe.yield_quantity * quantityToConvert,
          uom: selectedRecipe.finished_item_unit,
          category: 'regular_croissants', // Default category
          unit_cost: 0, // Will be calculated from inputs
          sku: `CONV-${Date.now()}`,
          storage_location: 'Finished Goods'
        }
      };

      console.log('Executing conversion with request:', conversionRequest);
      const success = await executeConversion(conversionRequest);
      
      if (success) {
        onSuccess();
        onOpenChange(false);
        setSelectedRecipeId("");
        setQuantityToConvert(1);
      }
    } catch (error) {
      console.error('Error executing conversion:', error);
      toast.error('Failed to execute conversion');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Run Conversion
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-croffle-accent mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading conversion recipes...</p>
            </div>
          ) : conversionRecipes.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                No conversion recipes found. Please upload conversion recipes first.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipe">Select Conversion Recipe</Label>
                  <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a recipe to convert" />
                    </SelectTrigger>
                    <SelectContent>
                      {conversionRecipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.name} → {recipe.finished_item_name} ({recipe.yield_quantity} {recipe.finished_item_unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">Number of Batches to Convert</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantityToConvert}
                    onChange={(e) => setQuantityToConvert(Number(e.target.value))}
                    placeholder="Enter batch quantity"
                  />
                </div>
              </div>

              {selectedRecipe && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Conversion Preview</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Recipe:</strong> {selectedRecipe.name}</p>
                      <p><strong>Output:</strong> {selectedRecipe.yield_quantity * quantityToConvert} {selectedRecipe.finished_item_unit} of {selectedRecipe.finished_item_name}</p>
                      <div>
                        <strong>Required Ingredients:</strong>
                        <ul className="ml-4 mt-1 space-y-1">
                          {selectedRecipe.ingredients?.map((ingredient, index) => (
                            <li key={index}>
                              • {ingredient.quantity * quantityToConvert} {ingredient.commissary_item?.uom || 'units'} of {ingredient.commissary_item?.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={isExecuting}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleExecuteConversion}
                  disabled={!selectedRecipeId || quantityToConvert <= 0 || isExecuting}
                  className="bg-croffle-accent hover:bg-croffle-accent/90"
                >
                  {isExecuting ? 'Converting...' : 'Run Conversion'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
