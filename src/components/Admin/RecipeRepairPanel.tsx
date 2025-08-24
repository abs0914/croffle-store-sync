import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle, WrenchIcon } from 'lucide-react';

interface RepairResult {
  recipes_fixed: number;
  ingredients_added: number;
  execution_details: any;
}

interface MappingResult {
  mappings_created: number;
  stores_processed: number;
  mapping_details: any;
}

export const RecipeRepairPanel: React.FC = () => {
  const [isFixingRecipes, setIsFixingRecipes] = useState(false);
  const [isCreatingMappings, setIsCreatingMappings] = useState(false);
  const [repairResults, setRepairResults] = useState<RepairResult | null>(null);
  const [mappingResults, setMappingResults] = useState<MappingResult | null>(null);

  const handleFixRecipes = async () => {
    setIsFixingRecipes(true);
    try {
      const { data, error } = await supabase.rpc('fix_all_incomplete_recipes');
      
      if (error) throw error;
      
      const result = data[0];
      setRepairResults(result);
      
      toast.success(
        `✅ Fixed ${result.recipes_fixed} recipes with ${result.ingredients_added} missing ingredients`,
        { duration: 5000 }
      );
    } catch (error) {
      console.error('Recipe repair error:', error);
      toast.error('Failed to fix recipes. Please try again.');
    } finally {
      setIsFixingRecipes(false);
    }
  };

  const handleCreateMappings = async () => {
    setIsCreatingMappings(true);
    try {
      const { data, error } = await supabase.rpc('create_ingredient_inventory_mappings');
      
      if (error) throw error;
      
      const result = data[0];
      setMappingResults(result);
      
      toast.success(
        `✅ Created ${result.mappings_created} ingredient-to-inventory mappings across ${result.stores_processed} stores`,
        { duration: 5000 }
      );
    } catch (error) {
      console.error('Mapping creation error:', error);
      toast.error('Failed to create mappings. Please try again.');
    } finally {
      setIsCreatingMappings(false);
    }
  };

  const handleRunFullRepair = async () => {
    await handleFixRecipes();
    await handleCreateMappings();
    toast.success('🚀 Complete recipe repair finished! All products should now work with inventory deductions.');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WrenchIcon className="h-5 w-5" />
          Recipe Repair System
        </CardTitle>
        <CardDescription>
          Fix incomplete recipes and create inventory mappings to resolve inventory deduction failures
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Quick Fix Button */}
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h3 className="font-semibold mb-2">🚀 Complete System Repair</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Fix all incomplete recipes and create inventory mappings in one go
          </p>
          <Button 
            onClick={handleRunFullRepair}
            disabled={isFixingRecipes || isCreatingMappings}
            className="w-full"
          >
            {isFixingRecipes || isCreatingMappings ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Repairing System...
              </>
            ) : (
              'Run Complete Repair'
            )}
          </Button>
        </div>

        <Separator />

        {/* Individual Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fix Recipes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Step 1: Fix Incomplete Recipes</CardTitle>
              <CardDescription>
                Copy missing ingredients from recipe templates to deployed recipes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleFixRecipes}
                disabled={isFixingRecipes}
                variant="outline"
                className="w-full"
              >
                {isFixingRecipes ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fixing Recipes...
                  </>
                ) : (
                  'Fix Missing Ingredients'
                )}
              </Button>
              
              {repairResults && (
                <div className="space-y-2 p-3 bg-green-50 rounded border">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Repair Complete</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Recipes Fixed:</span>
                      <Badge variant="secondary">{repairResults.recipes_fixed}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Ingredients Added:</span>
                      <Badge variant="secondary">{repairResults.ingredients_added}</Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Mappings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Step 2: Create Inventory Mappings</CardTitle>
              <CardDescription>
                Link recipe ingredients to inventory items for accurate deductions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleCreateMappings}
                disabled={isCreatingMappings}
                variant="outline"
                className="w-full"
              >
                {isCreatingMappings ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Mappings...
                  </>
                ) : (
                  'Create Ingredient Mappings'
                )}
              </Button>
              
              {mappingResults && (
                <div className="space-y-2 p-3 bg-green-50 rounded border">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Mappings Created</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Mappings Created:</span>
                      <Badge variant="secondary">{mappingResults.mappings_created}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Stores Processed:</span>
                      <Badge variant="secondary">{mappingResults.stores_processed}</Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Help Text */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">What this fixes:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Incomplete recipes missing ingredients from their templates</li>
                <li>Inventory deduction failures due to missing ingredient mappings</li>
                <li>Products showing "unable to deduct from inventory" errors</li>
                <li>Recipe-inventory synchronization issues</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};