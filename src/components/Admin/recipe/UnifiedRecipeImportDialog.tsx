/**
 * Unified Recipe Import Dialog
 * 
 * Simplified, robust recipe import dialog that uses the unified recipe management service.
 * Replaces the complex MasterRecipeImportDialog with a streamlined approach.
 */

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, CheckCircle, AlertTriangle, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  importRecipesFromCSV, 
  clearAllRecipeData 
} from '@/services/recipeManagement/unifiedRecipeManagementService';

interface UnifiedRecipeImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ImportStage = 'upload' | 'importing' | 'complete' | 'error';

export const UnifiedRecipeImportDialog: React.FC<UnifiedRecipeImportDialogProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [stage, setStage] = useState<ImportStage>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<any>(null);
  const [isClearing, setIsClearing] = useState(false);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!file || !user) {
      toast.error('Please select a file and ensure you are logged in');
      return;
    }

    setStage('importing');
    setImportProgress(0);

    try {
      // Read file content
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      setImportProgress(25);

      // Import recipes using unified service
      const result = await importRecipesFromCSV(fileContent, user.id);
      
      setImportProgress(100);
      setImportResult(result);

      if (result.success) {
        setStage('complete');
        toast.success(result.message);
        onSuccess?.();
      } else {
        setStage('error');
        toast.error(result.message);
      }

    } catch (error) {
      setStage('error');
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Import failed',
        stats: { errors: [error instanceof Error ? error.message : 'Unknown error'] }
      });
      toast.error('Import failed');
    }
  }, [file, user, onSuccess]);

  const handleClearData = useCallback(async () => {
    if (!window.confirm('Are you sure you want to clear all recipe data? This will deactivate all recipes and templates.')) {
      return;
    }

    setIsClearing(true);
    try {
      const result = await clearAllRecipeData();
      if (result.success) {
        toast.success(result.message);
        onSuccess?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to clear recipe data');
    } finally {
      setIsClearing(false);
    }
  }, [onSuccess]);

  const downloadTemplate = useCallback(() => {
    const csvContent = `name,recipe_category,ingredient_name,quantity,unit,cost_per_unit,ingredient_category,suggested_price
"Matcha Croffle","premium","Regular Croissant",1,"piece",8,"base_ingredient",140
"Matcha Croffle","premium","Matcha Powder",5,"grams",2,"flavoring",140
"Matcha Croffle","premium","Whipped Cream",30,"grams",0.5,"topping",140
"Matcha Croffle","premium","Mini Take Out Box",1,"piece",2.4,"packaging",140`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipe_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Template downloaded');
  }, []);

  const resetDialog = useCallback(() => {
    setStage('upload');
    setFile(null);
    setImportProgress(0);
    setImportResult(null);
  }, []);

  const handleClose = useCallback(() => {
    resetDialog();
    onClose();
  }, [resetDialog, onClose]);

  const renderUploadStage = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Import Recipe Data</h3>
        <p className="text-muted-foreground mb-6">
          Upload a CSV file with your complete recipe data including ingredients, quantities, and costs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">CSV Format Requirements</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Required columns:</strong> name, recipe_category, ingredient_name, quantity, unit, cost_per_unit, ingredient_category</p>
          <p><strong>Optional columns:</strong> suggested_price</p>
          <p><strong>Categories:</strong> premium, fruity, classic, combo, mini_croffle, croffle_overload, addon, espresso, beverages, blended, cold, glaze</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={downloadTemplate} variant="outline" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button onClick={handleClearData} variant="destructive" disabled={isClearing}>
            <Trash2 className="h-4 w-4 mr-2" />
            {isClearing ? 'Clearing...' : 'Clear All Data'}
          </Button>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              {file ? file.name : 'Click to select CSV file'}
            </p>
          </label>
        </div>

        {file && (
          <Button onClick={handleImport} className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            Import Recipes
          </Button>
        )}
      </div>
    </div>
  );

  const renderImportingStage = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
        <Upload className="h-6 w-6 text-blue-600 animate-pulse" />
      </div>
      <h3 className="text-lg font-semibold">Importing Recipes</h3>
      <p className="text-muted-foreground">
        Processing your recipe data and deploying to all stores...
      </p>
      <Progress value={importProgress} className="w-full" />
      <p className="text-sm text-muted-foreground">{importProgress}% complete</p>
    </div>
  );

  const renderCompleteStage = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
        <CheckCircle className="h-6 w-6 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-green-600">Import Complete!</h3>
      
      {importResult && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Recipes Processed</p>
                <p className="text-2xl font-bold text-primary">{importResult.stats?.recipesProcessed || 0}</p>
              </div>
              <div>
                <p className="font-medium">Templates Created</p>
                <p className="text-2xl font-bold text-green-600">{importResult.stats?.templatesCreated || 0}</p>
              </div>
              <div>
                <p className="font-medium">Recipes Deployed</p>
                <p className="text-2xl font-bold text-blue-600">{importResult.stats?.recipesDeployed || 0}</p>
              </div>
              <div>
                <p className="font-medium">Errors</p>
                <p className="text-2xl font-bold text-red-600">{importResult.stats?.errors?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleClose} className="w-full">
        Close
      </Button>
    </div>
  );

  const renderErrorStage = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
        <AlertTriangle className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-red-600">Import Failed</h3>
      
      {importResult && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {importResult.message}
            {importResult.stats?.errors && importResult.stats.errors.length > 0 && (
              <ul className="mt-2 list-disc list-inside text-left">
                {importResult.stats.errors.slice(0, 5).map((error: string, index: number) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
                {importResult.stats.errors.length > 5 && (
                  <li className="text-sm">... and {importResult.stats.errors.length - 5} more errors</li>
                )}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button onClick={resetDialog} variant="outline" className="flex-1">
          Try Again
        </Button>
        <Button onClick={handleClose} className="flex-1">
          Close
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recipe Management System</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {stage === 'upload' && renderUploadStage()}
          {stage === 'importing' && renderImportingStage()}
          {stage === 'complete' && renderCompleteStage()}
          {stage === 'error' && renderErrorStage()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
