
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, ChefHat, AlertCircle } from "lucide-react";
import { bulkUploadRecipes } from "@/services/recipeUploadService";
import { parseRecipesCSV } from "@/utils/csvParser";
import { toast } from "sonner";

interface RecipeBulkUploadProps {
  onSuccess?: () => void;
}

export function RecipeBulkUpload({ onSuccess }: RecipeBulkUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast.error('Please select a valid CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    try {
      const text = await file.text();
      const recipes = parseRecipesCSV(text);
      
      if (recipes.length === 0) {
        toast.error('No valid recipes found in the CSV file');
        return;
      }

      const success = await bulkUploadRecipes(recipes);
      if (success) {
        setFile(null);
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error uploading recipes:', error);
      toast.error('Failed to upload recipe templates');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      'name,category,description,yield_quantity,serving_size,instructions,ingredient name,quantity used,unit of measure,cost per unit',
      'Chocolate Chip Cookies,Desserts,Classic chocolate chip cookies,24,1,Mix dry ingredients then add wet ingredients,All-Purpose Flour,2,kg,0.50',
      'Chocolate Chip Cookies,,,,,,,Chocolate Chips,0.5,kg,8.50',
      'Chocolate Chip Cookies,,,,,,,Sugar,0.3,kg,1.20',
      'Vanilla Cake,Cakes,Moist vanilla cake perfect for celebrations,1,8,Cream butter and sugar then alternate dry and wet ingredients,All-Purpose Flour,1.5,kg,0.50',
      'Vanilla Cake,,,,,,,Vanilla Extract,50,ml,0.25'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipe_templates_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Upload Recipe Templates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Upload CSV files to create multiple recipe templates. 
            Templates use commissary inventory items as ingredients.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="csv-file">Upload CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>

        {file && (
          <div className="text-sm text-muted-foreground">
            Selected file: {file.name}
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? 'Uploading...' : 'Upload Recipe Templates'}
        </Button>
      </CardContent>
    </Card>
  );
}
