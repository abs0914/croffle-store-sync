import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Package, AlertTriangle } from "lucide-react";
import { 
  CommissaryInventoryItem, 
  InventoryStock,
  ConversionRecipe,
  MultiIngredientConversionForm,
  ConversionIngredientForm
} from "@/types/inventoryManagement";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/format";

interface MultiIngredientConversionFormProps {
  commissaryItems: CommissaryInventoryItem[];
  storeItems: InventoryStock[];
  conversionRecipes: ConversionRecipe[];
  onSubmit: (formData: MultiIngredientConversionForm) => Promise<void>;
  loading: boolean;
}

export function MultiIngredientConversionFormComponent({
  commissaryItems,
  storeItems,
  conversionRecipes,
  onSubmit,
  loading
}: MultiIngredientConversionFormProps) {
  const [formData, setFormData] = useState<MultiIngredientConversionForm>({
    conversion_recipe_id: '',
    ingredients: [{ commissary_item_id: '', quantity: 0, available_stock: 0 }],
    inventory_stock_id: 'create_new',
    new_item_name: '',
    new_item_unit: '',
    finished_goods_quantity: 0,
    notes: ''
  });

  const [totalCost, setTotalCost] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    calculateTotalCost();
    validateForm();
  }, [formData.ingredients]);

  const calculateTotalCost = () => {
    const cost = formData.ingredients.reduce((total, ingredient) => {
      const item = commissaryItems.find(item => item.id === ingredient.commissary_item_id);
      return total + (item?.unit_cost || 0) * ingredient.quantity;
    }, 0);
    setTotalCost(cost);
  };

  const validateForm = () => {
    const errors: string[] = [];

    formData.ingredients.forEach((ingredient, index) => {
      const item = commissaryItems.find(item => item.id === ingredient.commissary_item_id);
      if (item && ingredient.quantity > item.current_stock) {
        errors.push(`Ingredient ${index + 1}: Insufficient stock. Available: ${item.current_stock} ${item.unit}`);
      }
    });

    setValidationErrors(errors);
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { commissary_item_id: '', quantity: 0, available_stock: 0 }]
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

  const updateIngredient = (index: number, field: keyof ConversionIngredientForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient, i) => {
        if (i === index) {
          if (field === 'commissary_item_id') {
            const item = commissaryItems.find(item => item.id === value);
            return {
              ...ingredient,
              [field]: value,
              available_stock: item?.current_stock || 0,
              unit_cost: item?.unit_cost || 0
            };
          }
          return { ...ingredient, [field]: value };
        }
        return ingredient;
      })
    }));
  };

  const loadRecipe = (recipeId: string) => {
    const recipe = conversionRecipes.find(r => r.id === recipeId);
    if (recipe && recipe.ingredients) {
      setFormData(prev => ({
        ...prev,
        conversion_recipe_id: recipeId,
        ingredients: recipe.ingredients!.map(ing => ({
          commissary_item_id: ing.commissary_item_id,
          quantity: ing.quantity,
          available_stock: ing.commissary_item?.current_stock || 0,
          unit_cost: ing.commissary_item?.unit_cost || 0
        })),
        new_item_name: recipe.finished_item_name,
        new_item_unit: recipe.finished_item_unit,
        finished_goods_quantity: recipe.yield_quantity
      }));
    }
  };

  const handleSubmit = async () => {
    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before submitting');
      return;
    }

    if (formData.ingredients.some(ing => !ing.commissary_item_id || ing.quantity <= 0)) {
      toast.error('Please fill in all ingredient details');
      return;
    }

    if (formData.inventory_stock_id === 'create_new' && (!formData.new_item_name || !formData.new_item_unit)) {
      toast.error('Please fill in new item details or select an existing item');
      return;
    }

    if (formData.finished_goods_quantity <= 0) {
      toast.error('Please enter a valid finished goods quantity');
      return;
    }

    // Prepare the data for submission
    const submissionData = {
      ...formData,
      inventory_stock_id: formData.inventory_stock_id === 'create_new' ? '' : formData.inventory_stock_id
    };

    await onSubmit(submissionData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Multi-Ingredient Conversion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recipe Template Selector */}
        <div className="space-y-2">
          <Label htmlFor="recipe_template">Recipe Template (Optional)</Label>
          <Select
            value={formData.conversion_recipe_id || 'no_template'}
            onValueChange={(value) => {
              if (value !== 'no_template') {
                loadRecipe(value);
              } else {
                setFormData(prev => ({ ...prev, conversion_recipe_id: '' }));
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a recipe template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no_template">No template (manual entry)</SelectItem>
              {conversionRecipes.map((recipe) => (
                <SelectItem key={recipe.id} value={recipe.id}>
                  {recipe.name} → {recipe.finished_item_name} ({recipe.yield_quantity} {recipe.finished_item_unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ingredients Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">Raw Materials</Label>
            <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
              <Plus className="h-4 w-4 mr-2" />
              Add Ingredient
            </Button>
          </div>

          {formData.ingredients.map((ingredient, index) => {
            const selectedItem = commissaryItems.find(item => item.id === ingredient.commissary_item_id);
            
            return (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
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
                      value={ingredient.commissary_item_id || 'select_item'}
                      onValueChange={(value) => {
                        if (value !== 'select_item') {
                          updateIngredient(index, 'commissary_item_id', value);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select raw material" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="select_item">Select raw material</SelectItem>
                        {commissaryItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.current_stock} {item.unit} available)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity Needed</Label>
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

                {selectedItem && (
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Available Stock:</span>
                      <span className="font-medium">{selectedItem.current_stock} {selectedItem.unit}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Unit Cost:</span>
                      <span className="font-medium">{selectedItem.unit_cost ? formatCurrency(selectedItem.unit_cost) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Cost:</span>
                      <span className="font-medium">{formatCurrency((selectedItem.unit_cost || 0) * ingredient.quantity)}</span>
                    </div>
                    {ingredient.quantity > selectedItem.current_stock && (
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        Insufficient stock available
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Total Cost Display */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Raw Material Cost:</span>
            <span className="text-lg font-bold text-blue-600">{formatCurrency(totalCost)}</span>
          </div>
        </div>

        {/* Target Product Section */}
        <div className="space-y-4">
          <Label className="text-lg font-semibold">Finished Product</Label>
          
          <div className="space-y-2">
            <Label>Target Inventory Item</Label>
            <Select
              value={formData.inventory_stock_id}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                inventory_stock_id: value,
                new_item_name: value === 'create_new' ? prev.new_item_name : '',
                new_item_unit: value === 'create_new' ? prev.new_item_unit : ''
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select existing item or create new" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="create_new">Create New Item</SelectItem>
                {storeItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.item} ({item.stock_quantity} {item.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.inventory_stock_id === 'create_new' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_item_name">New Item Name</Label>
                <Input
                  id="new_item_name"
                  value={formData.new_item_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, new_item_name: e.target.value }))}
                  placeholder="Enter item name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new_item_unit">Unit</Label>
                <Input
                  id="new_item_unit"
                  value={formData.new_item_unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, new_item_unit: e.target.value }))}
                  placeholder="e.g., portions, pieces"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="finished_quantity">Finished Goods Quantity</Label>
            <Input
              id="finished_quantity"
              type="number"
              min="0"
              step="0.1"
              value={formData.finished_goods_quantity}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                finished_goods_quantity: parseFloat(e.target.value) || 0 
              }))}
              placeholder="0"
            />
          </div>
        </div>

        {/* Notes Section */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Add any notes about this conversion..."
            rows={3}
          />
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="space-y-2">
            {validationErrors.map((error, index) => (
              <div key={index} className="flex items-center gap-2 text-red-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={loading || validationErrors.length > 0}
          className="w-full bg-croffle-accent hover:bg-croffle-accent/90"
        >
          {loading ? 'Converting...' : 'Execute Conversion'}
        </Button>
      </CardContent>
    </Card>
  );
}
