import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { createRecipesForTransactionProducts } from "@/services/recipes/missingRecipeHandler";

/**
 * Debug tool to create missing recipes for products that caused the transaction delay
 */
export function RecipeCreationTool() {
  const [isCreating, setIsCreating] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleCreateMissingRecipes = async () => {
    setIsCreating(true);
    setResults(null);
    
    try {
      console.log('🔧 Creating missing recipes for transaction products...');
      
      const result = await createRecipesForTransactionProducts('fd45e07e-7832-4f51-b46b-7ef604359b86');
      
      setResults(result);
      
      if (result.success) {
        toast.success(`✅ Created ${result.recipesCreated} recipes successfully!`);
      } else {
        toast.error(`❌ Recipe creation failed: ${result.errors.join(', ')}`);
      }
      
    } catch (error) {
      console.error('❌ Error creating recipes:', error);
      toast.error('Failed to create recipes');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Missing Recipe Creator</CardTitle>
        <p className="text-muted-foreground">
          Create basic recipes for products that don't have them to fix inventory deduction issues
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleCreateMissingRecipes}
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? 'Creating Recipes...' : 'Create Missing Recipes'}
        </Button>
        
        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="font-medium text-green-600">✅ Success</p>
                <p>Recipes Created: {results.recipesCreated}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-yellow-600">⚠️ Issues</p>
                <p>Errors: {results.errors?.length || 0}</p>
                <p>Warnings: {results.warnings?.length || 0}</p>
              </div>
            </div>
            
            {results.errors?.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="font-medium text-red-700 mb-2">Errors:</p>
                <ul className="text-sm text-red-600 space-y-1">
                  {results.errors.map((error: string, idx: number) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {results.warnings?.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="font-medium text-yellow-700 mb-2">Warnings:</p>
                <ul className="text-sm text-yellow-600 space-y-1">
                  {results.warnings.map((warning: string, idx: number) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}