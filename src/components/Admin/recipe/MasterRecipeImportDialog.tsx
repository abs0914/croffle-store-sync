import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Database,
  Zap,
  Package,
  TrendingUp,
  Trash2,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { 
  MasterRecipeImportService, 
  MasterRecipeData, 
  IngredientMapping, 
  MasterRecipeImportResult 
} from '@/services/recipeManagement/masterRecipeImportService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parseExcelFile, downloadExcelTemplate } from '@/utils/excelParser';

interface MasterRecipeImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ImportStage = 'upload' | 'preview' | 'mapping' | 'importing' | 'complete';

export const MasterRecipeImportDialog: React.FC<MasterRecipeImportDialogProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [stage, setStage] = useState<ImportStage>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [masterRecipes, setMasterRecipes] = useState<MasterRecipeData[]>([]);
  const [ingredientMappings, setIngredientMappings] = useState<IngredientMapping[]>([]);
  const [importResult, setImportResult] = useState<MasterRecipeImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [inventoryCoverage, setInventoryCoverage] = useState<any>(null);
  const [isClearing, setIsClearing] = useState(false);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }, []);

  const handleFileUpload = useCallback(async () => {
    if (!file) return;

    try {
      setProgress(10);

      let recipes: MasterRecipeData[];

      // Check file type and parse accordingly
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Parse Excel file
        const excelData = await parseExcelFile(file);
        setProgress(30);

        // Convert Excel data to master recipe format
        recipes = excelData.recipes.map((recipe: any) => ({
          name: recipe.name,
          description: recipe.description || `${recipe.category_name} recipe template`,
          category_name: recipe.category_name,
          instructions: recipe.instructions || 'Instructions to be added',
          yield_quantity: recipe.yield_quantity || 1,
          serving_size: recipe.serving_size || 1,
          ingredients: recipe.ingredients.map((ing: any) => ({
            ingredient_name: ing.ingredient_name,
            quantity: ing.quantity,
            unit: ing.unit,
            cost_per_unit: ing.cost_per_unit || 0
          }))
        }));
      } else {
        // Parse CSV file
        const csvContent = await file.text();
        setProgress(30);
        recipes = await MasterRecipeImportService.parseCSVContent(csvContent);
      }
      
      setProgress(50);
      const validationErrors = MasterRecipeImportService.validateMasterRecipeFormat(recipes);
      
      if (validationErrors.length > 0) {
        toast.error(`Validation failed: ${validationErrors[0]}`);
        setProgress(0);
        return;
      }

      setProgress(70);
      setMasterRecipes(recipes);
      
      // Get all unique ingredients
      const allIngredients = Array.from(
        new Set(recipes.flatMap(r => r.ingredients.map(i => i.ingredient_name)))
      );
      
      setProgress(90);
      const mappings = await MasterRecipeImportService.generateIngredientMappings(allIngredients);
      setIngredientMappings(mappings);

      // Get inventory coverage
      const coverage = await MasterRecipeImportService.getInventoryCoverageReport();
      setInventoryCoverage(coverage);
      
      setProgress(100);
      setStage('preview');
      
      toast.success(`Parsed ${recipes.length} recipes with ${allIngredients.length} ingredients`);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error(`Failed to parse file: ${error}`);
      setProgress(0);
    }
  }, [file]);

  const handleImport = useCallback(async () => {
    if (!masterRecipes.length) return;

    try {
      setStage('importing');
      setProgress(0);

      const result = await MasterRecipeImportService.importMasterRecipes(
        masterRecipes,
        ingredientMappings
      );

      setImportResult(result);
      setStage('complete');

      if (result.success) {
        toast.success(`Import completed! Created ${result.templatesCreated} templates`);
        onSuccess?.();
      } else {
        toast.error('Import completed with errors');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Import failed: ${error}`);
      setStage('preview');
    }
  }, [masterRecipes, ingredientMappings, onSuccess]);

  const handleClose = useCallback(() => {
    setStage('upload');
    setFile(null);
    setMasterRecipes([]);
    setIngredientMappings([]);
    setImportResult(null);
    setProgress(0);
    setInventoryCoverage(null);
    setIsClearing(false);
    onClose();
  }, [onClose]);

  const handleClearAllTemplates = useCallback(async () => {
    if (!window.confirm('⚠️ This will delete ALL existing recipe templates, their ingredients, and any recipes that depend on them. This action cannot be undone. Are you sure?')) {
      return;
    }

    setIsClearing(true);
    try {
      // Step 1: Get all recipe IDs that reference templates
      const { data: recipesWithTemplates, error: fetchError } = await supabase
        .from('recipes')
        .select('id')
        .not('template_id', 'is', null);

      if (fetchError) {
        throw new Error(`Failed to fetch recipes with templates: ${fetchError.message}`);
      }

      const recipeIds = recipesWithTemplates?.map(r => r.id) || [];

      // Step 2: Delete recipe ingredients for those recipes
      if (recipeIds.length > 0) {
        const { error: recipeIngredientsError } = await supabase
          .from('recipe_ingredients')
          .delete()
          .in('recipe_id', recipeIds);

        if (recipeIngredientsError) {
          throw new Error(`Failed to delete recipe ingredients: ${recipeIngredientsError.message}`);
        }
      }

      // Step 3: Delete recipes that reference templates
      const { error: recipesError } = await supabase
        .from('recipes')
        .delete()
        .not('template_id', 'is', null);

      if (recipesError) {
        throw new Error(`Failed to delete recipes: ${recipesError.message}`);
      }

      // Step 4: Delete all recipe template ingredients
      const { error: templateIngredientsError } = await supabase
        .from('recipe_template_ingredients')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (templateIngredientsError) {
        throw new Error(`Failed to delete template ingredients: ${templateIngredientsError.message}`);
      }

      // Step 5: Delete all recipe templates
      const { error: templatesError } = await supabase
        .from('recipe_templates')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (templatesError) {
        throw new Error(`Failed to delete templates: ${templatesError.message}`);
      }

      toast.success('All recipe templates, recipes, and ingredients have been cleared successfully');
      onSuccess?.(); // Refresh the parent component
    } catch (error: any) {
      console.error('Clear templates error:', error);
      toast.error(`Failed to clear templates: ${error.message || 'Unknown error'}`);
    } finally {
      setIsClearing(false);
    }
  }, [onSuccess]);

  const renderUploadStage = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Import Master Recipe Templates</h3>
        <p className="text-muted-foreground">
          Upload your master recipe CSV or Excel file to create standardized recipe templates
        </p>
      </div>

      {/* Template Download Buttons */}
      <div className="flex gap-2 justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={downloadExcelTemplate}
          className="flex items-center gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Download Excel Template
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            // Download CSV template (you can implement this if needed)
            toast.info('CSV template download coming soon. Use Excel template for now.');
          }}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Download CSV Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">File Format Requirements</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Supported formats:</strong> CSV (.csv), Excel (.xlsx, .xls)</p>
          <p><strong>Required columns:</strong> recipe_name, ingredient_name, quantity, unit</p>
          <p><strong>Essential for POS/Catalog:</strong> ingredient_category, suggested_price, combo_main, combo_add_on</p>
          <p><strong>Optional columns:</strong> recipe_category, cost_per_unit, description, instructions</p>
          <p><strong>Units:</strong> Must match standardized units (ml, grams, piece, portion, Scoop, serving)</p>
          <p><strong>Structure:</strong> One row per ingredient, recipe info repeated for each ingredient</p>
        </CardContent>
      </Card>

      <div className="border-2 border-dashed border-border rounded-lg p-6">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
          id="master-recipe-file"
        />
        <label htmlFor="master-recipe-file" className="cursor-pointer">
          <div className="text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">
              {file ? file.name : 'Click to upload CSV or Excel file'}
            </p>
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
        </label>
      </div>

      {progress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Processing...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      <div className="flex gap-2">
        <Button 
          variant="destructive" 
          onClick={handleClearAllTemplates} 
          disabled={isClearing}
          className="flex-1"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isClearing ? 'Clearing...' : 'Clear All Templates'}
        </Button>
        <Button variant="outline" onClick={handleClose} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={handleFileUpload} 
          disabled={!file || progress > 0} 
          className="flex-1"
        >
          {progress > 0 ? 'Processing...' : 'Parse & Preview'}
        </Button>
      </div>
    </div>
  );

  const renderPreviewStage = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Import Preview</h3>
        <p className="text-muted-foreground">
          Review recipes and ingredient mappings before importing
        </p>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="recipes">Recipes ({masterRecipes.length})</TabsTrigger>
          <TabsTrigger value="mappings">Mappings</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recipes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{masterRecipes.length}</div>
                <p className="text-xs text-muted-foreground">Templates to create</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ingredients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {Array.from(new Set(masterRecipes.flatMap(r => r.ingredients.map(i => i.ingredient_name)))).length}
                </div>
                <p className="text-xs text-muted-foreground">Unique ingredients</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Mapped</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{ingredientMappings.length}</div>
                <p className="text-xs text-muted-foreground">Auto-mapped to inventory</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {inventoryCoverage ? Math.round((inventoryCoverage.recipeCompatible / inventoryCoverage.totalItems) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Inventory compatible</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recipes" className="space-y-4">
          <div className="max-h-64 overflow-y-auto space-y-2">
            {masterRecipes.map((recipe, index) => (
              <Card key={index} className="p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{recipe.name}</h4>
                    <p className="text-sm text-muted-foreground">{recipe.category_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {recipe.ingredients.length} ingredients • Yield: {recipe.yield_quantity}
                    </p>
                  </div>
                  <Badge variant="outline">{recipe.category_name}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mappings" className="space-y-4">
          <div className="max-h-64 overflow-y-auto space-y-2">
            {ingredientMappings.map((mapping, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div className="flex-1">
                  <span className="font-medium">{mapping.masterIngredientName}</span>
                  <span className="mx-2">→</span>
                  <span className="text-muted-foreground">{mapping.storeItemName}</span>
                </div>
                <Badge 
                  variant={mapping.confidence === 'exact' ? 'default' : 
                          mapping.confidence === 'partial' ? 'secondary' : 'outline'}
                >
                  {mapping.confidence}
                </Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="coverage" className="space-y-4">
          {inventoryCoverage && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Inventory Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Items:</span>
                    <span className="font-medium">{inventoryCoverage.totalItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recipe Compatible:</span>
                    <span className="font-medium text-green-600">{inventoryCoverage.recipeCompatible}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coverage Rate:</span>
                    <span className="font-medium">
                      {Math.round((inventoryCoverage.recipeCompatible / inventoryCoverage.totalItems) * 100)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {Object.keys(inventoryCoverage.incompatibleReasons).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Incompatible Items</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                  {Object.entries(inventoryCoverage.incompatibleReasons).map(([reason, count]) => (
                    <div key={reason} className="flex justify-between">
                      <span>{reason}:</span>
                      <span className="font-medium">{count as number}</span>
                    </div>
                  ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStage('upload')} className="flex-1">
          Back
        </Button>
        <Button onClick={handleImport} className="flex-1">
          <Zap className="h-4 w-4 mr-2" />
          Import {masterRecipes.length} Templates
        </Button>
      </div>
    </div>
  );

  const renderImportingStage = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
        <Package className="h-6 w-6 text-blue-600 animate-pulse" />
      </div>
      <h3 className="text-lg font-semibold">Importing Master Templates</h3>
      <p className="text-muted-foreground">
        Creating recipe templates and mapping ingredients to inventory...
      </p>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
    </div>
  );

  const renderCompleteStage = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className={`mx-auto w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
          importResult?.success ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {importResult?.success ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600" />
          )}
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {importResult?.success ? 'Import Completed!' : 'Import Failed'}
        </h3>
      </div>

      {importResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Templates Created</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {importResult.templatesCreated}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ingredients Mapped</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {importResult.ingredientsMapped}
                </div>
              </CardContent>
            </Card>
          </div>

          {importResult.unmappedIngredients.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{importResult.unmappedIngredients.length} unmapped ingredients:</strong>
                <div className="mt-2 text-xs max-h-32 overflow-y-auto">
                  {importResult.unmappedIngredients.slice(0, 10).map((item, index) => (
                    <div key={index}>• {item}</div>
                  ))}
                  {importResult.unmappedIngredients.length > 10 && (
                    <div>... and {importResult.unmappedIngredients.length - 10} more</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {importResult.errors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Errors occurred:</strong>
                <div className="mt-2 text-xs max-h-32 overflow-y-auto">
                  {importResult.errors.slice(0, 5).map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <Button onClick={handleClose} className="w-full">
        <TrendingUp className="h-4 w-4 mr-2" />
        Continue to Recipe Management
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Master Recipe Import</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {stage === 'upload' && renderUploadStage()}
          {stage === 'preview' && renderPreviewStage()}
          {stage === 'importing' && renderImportingStage()}
          {stage === 'complete' && renderCompleteStage()}
        </div>
      </DialogContent>
    </Dialog>
  );
};