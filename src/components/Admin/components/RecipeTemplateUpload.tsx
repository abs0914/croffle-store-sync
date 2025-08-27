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

      // Use enhanced file reading with retry logic
      const { safeReadFile } = await import('@/utils/fileUploadUtils');
      const result = await safeReadFile(file, { retries: 3, delay: 500 });

      if (!result.success || !result.content) {
        throw new Error(result.error || 'Failed to read file');
      }

      const text = result.content;
      let data;

      if (file.name.endsWith('.csv')) {
        data = parseCSV(text);
      } else {
        data = JSON.parse(text);
      }

      await processUpload(data);
    } catch (error: any) {
      console.error('Error processing file:', error);
      const errorMessage = error.message || 'Failed to process file';

      // Provide specific guidance for common errors
      if (error.name === 'NotReadableError' || errorMessage.includes('permission')) {
        toast.error('File access error. Please close the file in other applications and try again.');
      } else if (errorMessage.includes('JSON')) {
        toast.error('Invalid JSON format. Please check your file structure.');
      } else {
        toast.error(errorMessage);
      }

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
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { recipes: [], addons: [], combos: [] };
    
    // Parse CSV with proper quoted field handling
    const parseCSVLine = (line: string): string[] => {
      const result = [];
      let current = '';
      let inQuotes = false;
      let i = 0;
      
      while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Escaped quote
            current += '"';
            i += 2;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
            i++;
          }
        } else if (char === ',' && !inQuotes) {
          // Field separator
          result.push(current.trim());
          current = '';
          i++;
        } else {
          current += char;
          i++;
        }
      }
      
      // Add the last field
      result.push(current.trim());
      return result;
    };
    
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
    const recipes = [];
    const addons = [];
    const combos = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < headers.length) continue;

      const row: any = {};
      headers.forEach((header, index) => {
        let value = values[index] || '';
        // Remove surrounding quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        row[header] = value;
      });

      // Handle your CSV format with recipe_name, ingredient_name, etc.
      const recipeName = row.recipe_name || row.name || '';
      const ingredientName = row.ingredient_name || '';
      const category = row.recipe_category || row.category || 'General';
      const quantity = parseFloat(row.quantity || '0') || 0;
      const unit = row.unit || row.uom || '';
      const costPerUnit = parseFloat(row.cost_per_unit || '0') || 0;

      // Skip empty rows
      if (!recipeName || recipeName.trim() === '') continue;
      if (!ingredientName || !unit || quantity <= 0) continue;

      // Find existing recipe or create new one
      let existingRecipe = recipes.find(r => r.name === recipeName);
      if (!existingRecipe) {
        existingRecipe = {
          name: recipeName,
          category_name: category.toLowerCase(),
          description: `${category} recipe template`,
          yield_quantity: 1,
          serving_size: 1,
          instructions: 'Instructions to be added',
          ingredients: []
        };
        recipes.push(existingRecipe);
      }

      // Add ingredient to recipe
      existingRecipe.ingredients.push({
        ingredient_name: ingredientName,
        unit: unit,
        quantity: quantity,
        cost_per_unit: costPerUnit
      });
    }

    return { recipes, addons, combos };
  };

  const parseRecipeRow = (row: any) => {
    let ingredients = [];
    
    if (row.ingredients) {
      try {
        // Clean up the ingredients string - remove extra quotes and escape characters
        let ingredientsStr = row.ingredients.trim();
        
        // If it starts and ends with quotes, remove them
        if (ingredientsStr.startsWith('"') && ingredientsStr.endsWith('"')) {
          ingredientsStr = ingredientsStr.slice(1, -1);
        }
        
        // Replace escaped quotes
        ingredientsStr = ingredientsStr.replace(/""/g, '"');
        
        ingredients = JSON.parse(ingredientsStr);
      } catch (error) {
        console.error('Failed to parse ingredients JSON for row:', row.name, 'Error:', error);
        console.error('Ingredients string was:', row.ingredients);
        // Try to parse as a simple ingredient name if JSON parsing fails
        ingredients = [{
          ingredient_name: row.ingredients,
          quantity: 1,
          unit: 'piece',
          cost_per_unit: 0
        }];
      }
    }
    
    return {
      name: row.name,
      description: row.description || '',
      category_name: row.category || 'main',
      instructions: row.instructions || '',
      yield_quantity: parseFloat(row.yield_quantity) || 1,
      serving_size: parseFloat(row.serving_size) || 1,
      recipe_type: row.recipe_type || 'food',
      ingredients: ingredients,
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
          name: "Classic Tiramisu Croffle",
          description: "Classic tiramisu flavored croffle with standard toppings",
          category_name: "Classic",
          instructions: "1. Prepare croissant base\n2. Add toppings as specified\n3. Serve in takeout container",
          yield_quantity: 1,
          serving_size: 1,
          image_url: "",
          ingredients: [
            {
              ingredient_name: "Croissant",
              quantity: 1,
              unit: "piece",
              cost_per_unit: 30
            },
            {
              ingredient_name: "Whipped Cream",
              quantity: 1,
              unit: "serving",
              cost_per_unit: 8
            },
            {
              ingredient_name: "Tiramisu Sauce",
              quantity: 1,
              unit: "portion",
              cost_per_unit: 3.5
            }
          ]
        },
        {
          name: "Mini Croffle - Mix & Match",
          description: "Customizable mini croffle with choice of sauce and topping",
          category_name: "Mini",
          instructions: "1. Prepare mini croissant base\n2. Customer selects 1 sauce and 1 topping\n3. Apply selections and serve",
          yield_quantity: 1,
          serving_size: 1,
          base_price_includes: "Mini croissant base + choice of 1 sauce + choice of 1 topping",
          has_choice_groups: true,
          choice_groups: [
            {
              group_name: "sauce_selection",
              group_type: "required",
              selection_min: 1,
              selection_max: 1,
              description: "Choose your sauce",
              ingredients: [
                {
                  ingredient_name: "Chocolate Sauce",
                  quantity: 1,
                  unit: "portion",
                  cost_per_unit: 1.25,
                  is_default_selection: true,
                  choice_order: 1
                },
                {
                  ingredient_name: "Caramel Sauce",
                  quantity: 1,
                  unit: "portion", 
                  cost_per_unit: 1.25,
                  choice_order: 2
                },
                {
                  ingredient_name: "Strawberry Sauce",
                  quantity: 1,
                  unit: "portion",
                  cost_per_unit: 1.25,
                  choice_order: 3
                }
              ]
            },
            {
              group_name: "topping_selection",
              group_type: "required",
              selection_min: 1,
              selection_max: 1,
              description: "Choose your topping",
              ingredients: [
                {
                  ingredient_name: "Colored Sprinkles",
                  quantity: 1,
                  unit: "portion",
                  cost_per_unit: 1.25,
                  is_default_selection: true,
                  choice_order: 1
                },
                {
                  ingredient_name: "Peanuts",
                  quantity: 1,
                  unit: "portion",
                  cost_per_unit: 1.25,
                  choice_order: 2
                },
                {
                  ingredient_name: "Choco Flakes",
                  quantity: 1,
                  unit: "portion",
                  cost_per_unit: 1.25,
                  choice_order: 3
                }
              ]
            }
          ]
        },
        {
          name: "Croffle Overload",
          description: "Premium croffle with base ingredients plus customizable premium toppings",
          category_name: "Overload",
          instructions: "1. Prepare croissant base with ice cream\n2. Add all base ingredients\n3. Customer selects 1 premium topping\n4. Serve in overload cup",
          yield_quantity: 1,
          serving_size: 1,
          base_price_includes: "Half croissant + vanilla ice cream + all base toppings + choice of 1 premium topping",
          has_choice_groups: true,
          choice_groups: [
            {
              group_name: "premium_topping_selection",
              group_type: "required",
              selection_min: 1,
              selection_max: 1,
              description: "Choose your premium topping",
              ingredients: [
                {
                  ingredient_name: "Peanuts",
                  quantity: 1,
                  unit: "portion",
                  cost_per_unit: 2.5,
                  is_default_selection: true,
                  choice_order: 1
                },
                {
                  ingredient_name: "Choco Flakes",
                  quantity: 1,
                  unit: "portion",
                  cost_per_unit: 2.5,
                  choice_order: 2
                },
                {
                  ingredient_name: "Marshmallow",
                  quantity: 1,
                  unit: "portion",
                  cost_per_unit: 2.5,
                  choice_order: 3
                }
              ]
            }
          ]
        }
      ],
      addons: [
        {
          name: "Extra Chocolate Sauce",
          category: "Sauces",
          price: 15,
          description: "Additional chocolate sauce portion",
          is_available: true,
          display_order: 1
        },
        {
          name: "Extra Ice Cream Scoop",
          category: "Premium",
          price: 25,
          description: "Additional vanilla ice cream scoop",
          is_available: true,
          is_premium: true,
          display_order: 2
        }
      ],
      combos: [
        {
          name: "Mini Croffle + Drink Combo",
          base_category: "Mini",
          combo_category: "Beverages",
          combo_price: 85,
          discount_amount: 15,
          is_active: true,
          priority: 1
        },
        {
          name: "Overload + Drink Combo",
          base_category: "Overload", 
          combo_category: "Beverages",
          combo_price: 120,
          discount_amount: 25,
          is_active: true,
          priority: 2
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
              Mix & Match Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set up mix & match pricing and discount rules for item combinations.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};