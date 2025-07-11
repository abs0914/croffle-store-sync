import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChefHat, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Package,
  History,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { RecipeTemplateSelector } from './recipe-execution/RecipeTemplateSelector';
import { QuantitySelector } from './recipe-execution/QuantitySelector';
import { IngredientAvailabilityCheck } from './recipe-execution/IngredientAvailabilityCheck';
import { ProductionConfirmation } from './recipe-execution/ProductionConfirmation';
import { ProductionHistory } from './recipe-execution/ProductionHistory';
import { useDirectInventoryRecipe } from '@/hooks/recipe/useDirectInventoryRecipe';
import { checkDirectIngredientAvailability, deductDirectInventoryIngredients } from '@/services/recipeManagement/directInventoryService';

interface RecipeTemplate {
  id: string;
  name: string;
  description?: string;
  yield_quantity: number;
  image_url?: string;
  category_name?: string;
  ingredients: any[];
  total_cost?: number;
  cost_per_serving?: number;
}

interface ProductionExecution {
  id: string;
  recipe_template_id: string;
  recipe_name: string;
  quantity_produced: number;
  total_cost: number;
  executed_by: string;
  executed_at: string;
  status: 'completed' | 'failed' | 'in_progress';
  store_id?: string;
  notes?: string;
}

export const DirectRecipeExecutionTab: React.FC = () => {
  const { currentStore } = useStore();
  const [selectedTemplate, setSelectedTemplate] = useState<RecipeTemplate | null>(null);
  const [productionQuantity, setProductionQuantity] = useState(1);
  const [availabilityResults, setAvailabilityResults] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [productionHistory, setProductionHistory] = useState<ProductionExecution[]>([]);
  const [activeTab, setActiveTab] = useState('execution');

  const {
    ingredients,
    setIngredients,
    totalCost,
    checkAvailability,
    useRecipe
  } = useDirectInventoryRecipe(currentStore?.id);

  useEffect(() => {
    loadProductionHistory();
  }, [currentStore]);

  const loadProductionHistory = async () => {
    if (!currentStore) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('recipe_executions')
        .select(`
          *,
          recipe_templates(name, description)
        `)
        .eq('store_id', currentStore.id)
        .order('executed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setProductionHistory((data || []) as ProductionExecution[]);
    } catch (error) {
      console.error('Error loading production history:', error);
    }
  };

  const handleTemplateSelect = async (template: RecipeTemplate) => {
    setSelectedTemplate(template);
    
    // Convert template ingredients to direct inventory format
    if (template.ingredients) {
      const convertedIngredients = template.ingredients.map(ing => ({
        ingredient_name: ing.ingredient_name,
        quantity: ing.quantity,
        unit: ing.unit,
        inventory_stock_id: ing.inventory_stock_id,
        estimated_cost_per_unit: ing.cost_per_unit || 0,
        location_type: ing.location_type || 'all',
        supports_fractional: ing.supports_fractional || false
      }));
      setIngredients(convertedIngredients);
    }
  };

  const checkIngredientAvailability = async () => {
    if (!selectedTemplate || !currentStore) return;

    try {
      const results = await checkAvailability(productionQuantity);
      setAvailabilityResults(results);
      
      if (!results.available) {
        toast.error('Insufficient ingredients for production');
      } else {
        toast.success('All ingredients available for production');
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      toast.error('Failed to check ingredient availability');
    }
  };

  const executeRecipeProduction = async () => {
    if (!selectedTemplate || !currentStore || !availabilityResults?.available) return;

    setIsExecuting(true);
    setExecutionProgress(0);

    try {
      // Step 1: Create production record (25%)
      setExecutionProgress(25);
      const { data: user } = await supabase.auth.getUser();
      
      const { data: executionRecord, error: executionError } = await (supabase as any)
        .from('recipe_executions')
        .insert({
          recipe_template_id: selectedTemplate.id,
          recipe_name: selectedTemplate.name,
          quantity_produced: productionQuantity,
          total_cost: totalCost * productionQuantity,
          executed_by: user.user?.id,
          store_id: currentStore.id,
          status: 'in_progress'
        })
        .select()
        .single();

      if (executionError) throw executionError;

      // Step 2: Deduct ingredients from inventory (50%)
      setExecutionProgress(50);
      const deductionSuccess = await useRecipe(executionRecord.id, productionQuantity);
      
      if (!deductionSuccess) {
        throw new Error('Failed to deduct ingredients from inventory');
      }

      // Step 3: Update inventory with finished products (75%)
      setExecutionProgress(75);
      await addFinishedProductsToInventory();

      // Step 4: Complete production record (100%)
      setExecutionProgress(100);
      await (supabase as any)
        .from('recipe_executions')
        .update({ status: 'completed' })
        .eq('id', executionRecord.id);

      toast.success(`Successfully produced ${productionQuantity}x ${selectedTemplate.name}`);
      
      // Reset form
      setSelectedTemplate(null);
      setProductionQuantity(1);
      setAvailabilityResults(null);
      setIngredients([]);
      
      // Refresh history
      await loadProductionHistory();
      
    } catch (error) {
      console.error('Recipe execution failed:', error);
      toast.error('Recipe execution failed');
    } finally {
      setIsExecuting(false);
      setExecutionProgress(0);
    }
  };

  const addFinishedProductsToInventory = async () => {
    if (!selectedTemplate || !currentStore) return;

    // Check if finished product exists in inventory
    const { data: existingItem } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', currentStore.id)
      .eq('item', selectedTemplate.name)
      .single();

    const finishedQuantity = selectedTemplate.yield_quantity * productionQuantity;

    if (existingItem) {
      // Update existing inventory
      await supabase
        .from('inventory_stock')
        .update({
          stock_quantity: existingItem.stock_quantity + finishedQuantity,
          serving_ready_quantity: (existingItem.serving_ready_quantity || 0) + finishedQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingItem.id);
    } else {
      // Create new inventory item
      await supabase
        .from('inventory_stock')
        .insert({
          store_id: currentStore.id,
          item: selectedTemplate.name,
          unit: 'pieces',
          stock_quantity: finishedQuantity,
          serving_ready_quantity: finishedQuantity,
          cost: selectedTemplate.cost_per_serving || 0,
          is_active: true,
          is_fractional_supported: false
        });
    }

    // Log inventory transaction
    await supabase
      .from('inventory_transactions')
      .insert({
        store_id: currentStore.id,
        product_id: existingItem?.id || '',
        transaction_type: 'recipe_production',
        quantity: finishedQuantity,
        previous_quantity: existingItem?.stock_quantity || 0,
        new_quantity: (existingItem?.stock_quantity || 0) + finishedQuantity,
        created_by: (await supabase.auth.getUser()).data.user?.id || '',
        notes: `Recipe production: ${productionQuantity}x ${selectedTemplate.name}`
      });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ChefHat className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Direct Recipe Execution</CardTitle>
              <CardDescription>
                Execute recipe templates directly with real-time inventory deduction
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="execution" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Recipe Execution
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Production History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="execution" className="space-y-6">
          {/* Step 1: Recipe Template Selection */}
          <RecipeTemplateSelector
            selectedTemplate={selectedTemplate}
            onTemplateSelect={handleTemplateSelect}
          />

          {selectedTemplate && (
            <>
              {/* Step 2: Quantity Selection */}
              <QuantitySelector
                template={selectedTemplate}
                quantity={productionQuantity}
                onQuantityChange={setProductionQuantity}
                totalCost={totalCost * productionQuantity}
              />

              {/* Step 3: Ingredient Availability Check */}
              <IngredientAvailabilityCheck
                template={selectedTemplate}
                quantity={productionQuantity}
                ingredients={ingredients}
                availabilityResults={availabilityResults}
                onCheck={checkIngredientAvailability}
              />

              {/* Step 4: Production Execution */}
              {availabilityResults?.available && (
                <ProductionConfirmation
                  template={selectedTemplate}
                  quantity={productionQuantity}
                  totalCost={totalCost * productionQuantity}
                  isExecuting={isExecuting}
                  progress={executionProgress}
                  onExecute={executeRecipeProduction}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history">
          <ProductionHistory 
            history={productionHistory}
            onRefresh={loadProductionHistory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};