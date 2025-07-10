import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, Download, FileText, Package, Sparkles, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { bulkUploadRecipeTemplates, validateUploadData } from '@/services/recipeManagement/bulkUploadService';

interface UploadProgress {
  current: number;
  total: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  message: string;
}

export const RecipeTemplateUpload: React.FC = () => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'json'>('file');
  const [jsonInput, setJsonInput] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      toast.error('Please upload a CSV or JSON file');
      return;
    }

    try {
      setUploadProgress({
        current: 0,
        total: 1,
        status: 'uploading',
        message: 'Reading file...'
      });

      const text = await file.text();
      let data;

      if (file.name.endsWith('.csv')) {
        data = parseCSV(text);
      } else {
        data = JSON.parse(text);
      }

      await processUpload(data);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file');
      setUploadProgress(null);
    }
  };

  const handleJSONUpload = async () => {
    if (!jsonInput.trim()) {
      toast.error('Please enter JSON data');
      return;
    }

    try {
      const data = JSON.parse(jsonInput);
      await processUpload(data);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      toast.error('Invalid JSON format');
    }
  };

  const processUpload = async (data: any) => {
    try {
      // Validate data first
      const validation = validateUploadData(data);
      if (!validation.isValid) {
        toast.error(`Validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      const totalItems = (data.recipes?.length || 0) + (data.addons?.length || 0) + (data.combos?.length || 0);
      
      setUploadProgress({
        current: 0,
        total: totalItems,
        status: 'processing',
        message: 'Processing templates...'
      });

      const result = await bulkUploadRecipeTemplates(data, (progress) => {
        setUploadProgress(prev => prev ? {
          ...prev,
          current: progress.current,
          message: progress.message
        } : null);
      });

      setUploadProgress({
        current: result.successful,
        total: result.total,
        status: 'complete',
        message: `Upload complete: ${result.successful}/${result.total} successful`
      });

      toast.success(`Successfully uploaded ${result.successful} recipe templates`);
      
      if (result.errors.length > 0) {
        console.error('Upload errors:', result.errors);
        toast.error(`${result.errors.length} items failed to upload`);
      }

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadProgress({
        current: 0,
        total: 1,
        status: 'error',
        message: 'Upload failed'
      });
      toast.error('Upload failed');
    }
  };

  const parseCSV = (csvText: string): any => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const recipes = [];
    const addons = [];
    const combos = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < headers.length) continue;

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      // Determine record type based on content
      if (row.type === 'recipe' || (!row.type && row.name && row.ingredients)) {
        recipes.push(parseRecipeRow(row));
      } else if (row.type === 'addon') {
        addons.push(parseAddonRow(row));
      } else if (row.type === 'combo') {
        combos.push(parseComboRow(row));
      }
    }

    return { recipes, addons, combos };
  };

  const parseRecipeRow = (row: any) => {
    return {
      name: row.name,
      description: row.description || '',
      category_name: row.category || 'main',
      instructions: row.instructions || '',
      yield_quantity: parseFloat(row.yield_quantity) || 1,
      serving_size: parseFloat(row.serving_size) || 1,
      recipe_type: row.recipe_type || 'food',
      ingredients: row.ingredients ? JSON.parse(row.ingredients) : [],
      image_url: row.image_url || ''
    };
  };

  const parseAddonRow = (row: any) => {
    return {
      name: row.name,
      category: row.category || 'toppings',
      price: parseFloat(row.price) || 0,
      description: row.description || '',
      is_premium: row.is_premium === 'true',
      display_order: parseInt(row.display_order) || 0
    };
  };

  const parseComboRow = (row: any) => {
    return {
      name: row.name,
      base_category: row.base_category,
      combo_category: row.combo_category,
      combo_price: parseFloat(row.combo_price) || 0,
      discount_amount: parseFloat(row.discount_amount) || 0,
      priority: parseInt(row.priority) || 0
    };
  };

  const downloadTemplate = () => {
    const template = {
      recipes: [
        {
          name: "Sample Croffle",
          description: "Delicious croffle with toppings",
          category_name: "croffles",
          instructions: "1. Prepare waffle batter\n2. Cook in croffle maker\n3. Add toppings",
          yield_quantity: 1,
          serving_size: 1,
          recipe_type: "food",
          image_url: "",
          ingredients: [
            {
              ingredient_name: "Waffle Mix",
              quantity: 100,
              unit: "g",
              cost_per_unit: 0.02,
              location_type: "all",
              uses_store_inventory: true
            }
          ]
        }
      ],
      addons: [
        {
          name: "Extra Cheese",
          category: "toppings",
          price: 15,
          description: "Additional cheese topping",
          is_premium: false,
          display_order: 1
        }
      ],
      combos: [
        {
          name: "Croffle + Drink Combo",
          base_category: "croffles",
          combo_category: "beverages",
          combo_price: 120,
          discount_amount: 20,
          priority: 1
        }
      ]
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipe-template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCSVTemplate = () => {
    const csvContent = `type,name,description,category,instructions,yield_quantity,serving_size,recipe_type,ingredients,price,is_premium,display_order,base_category,combo_category,combo_price,discount_amount,priority,image_url
recipe,"Sample Croffle","Delicious croffle","croffles","1. Cook in croffle maker",1,1,"food","[{""ingredient_name"":""Waffle Mix"",""quantity"":100,""unit"":""g"",""cost_per_unit"":0.02}]",,,,,,,,,
addon,"Extra Cheese","Additional cheese","toppings",,,,,"",15,false,1,,,,,,
combo,"Croffle + Drink","Combo deal",,,,,,"",,,,"croffles","beverages",120,20,1,`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipe-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Upload Recipe Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Upload multiple recipe templates, add-ons, and combos at once using JSON or CSV format.
                Download the template file to see the required structure.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={downloadTemplate} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download JSON Template
              </Button>
              <Button onClick={downloadCSVTemplate} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>
            </div>

            <Tabs value={uploadMethod} onValueChange={(value) => setUploadMethod(value as 'file' | 'json')}>
              <TabsList>
                <TabsTrigger value="file">File Upload</TabsTrigger>
                <TabsTrigger value="json">JSON Input</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">Upload CSV or JSON File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileUpload}
                    className="mt-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="json" className="space-y-4">
                <div>
                  <Label htmlFor="json-input">Paste JSON Data</Label>
                  <Textarea
                    id="json-input"
                    placeholder="Paste your JSON data here..."
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    rows={10}
                    className="mt-2 font-mono text-sm"
                  />
                </div>
                <Button onClick={handleJSONUpload} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Process JSON Data
                </Button>
              </TabsContent>
            </Tabs>

            {uploadProgress && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{uploadProgress.message}</span>
                      <span>{uploadProgress.current}/{uploadProgress.total}</span>
                    </div>
                    <Progress 
                      value={(uploadProgress.current / uploadProgress.total) * 100} 
                      className="h-2"
                    />
                    <div className="flex justify-center">
                      {uploadProgress.status === 'complete' && (
                        <Button onClick={() => setUploadProgress(null)} size="sm">
                          Close
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Recipe Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload complete recipes with ingredients, instructions, and cost calculations.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Add-ons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Define additional toppings, extras, and premium options for your recipes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              Combo Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set up combo pricing and discount rules for item combinations.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};