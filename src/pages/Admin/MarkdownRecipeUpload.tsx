import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, Upload, Rocket, CheckCircle } from 'lucide-react';
import MarkdownBulkUploader from '@/components/Admin/recipe/MarkdownBulkUploader';

export default function MarkdownRecipeUpload() {
  const navigate = useNavigate();
  const [uploadedRecipeIds, setUploadedRecipeIds] = useState<string[]>([]);
  const [showDeploymentOptions, setShowDeploymentOptions] = useState(false);

  const handleUploadComplete = (recipeIds: string[]) => {
    setUploadedRecipeIds(recipeIds);
    setShowDeploymentOptions(true);
  };

  const handleNavigateToTemplates = () => {
    navigate('/admin/recipe-templates');
  };

  const handleNavigateToDeployment = () => {
    navigate('/admin/recipe-deployment');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/recipe-templates')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Recipe Templates
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Markdown Recipe Upload</h1>
            <p className="text-muted-foreground mt-2">
              Upload recipe data from markdown files with automatic commissary integration and deployment readiness.
            </p>
          </div>

          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="format" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Format Guide
              </TabsTrigger>
              <TabsTrigger value="workflow" className="flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                Workflow
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              {/* Success Message */}
              {showDeploymentOptions && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong>Upload Successful!</strong> {uploadedRecipeIds.length} recipe templates created.
                        Ready for deployment to stores.
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNavigateToTemplates}
                        >
                          View Templates
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleNavigateToDeployment}
                        >
                          Deploy to Stores
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Main Upload Component */}
              <MarkdownBulkUploader onUploadComplete={handleUploadComplete} />
            </TabsContent>

            <TabsContent value="format" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Markdown Table Format</CardTitle>
                  <CardDescription>
                    Your markdown files should contain tables with the following structure:
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <pre>{`| Product           | Category | Ingredient Name   | Unit of Measure | Quantity | Cost per Unit | Price |
| ----------------- | -------- | ----------------- | --------------- | -------- | ------------- | ----- |
| Tiramisu          | Classic  | Regular Croissant | Piece           | 1        | 30            | 125   |
| Tiramisu          | Classic  | Whipped Cream     | Serving         | 1        | 8             | 125   |
| Tiramisu          | Classic  | Tiramisu          | Portion         | 1        | 3.5           | 125   |
| Mango             | Classic  | Regular Croissant | Piece           | 1        | 30            | 125   |
| Mango             | Classic  | Mango Jam         | Scoop           | 1        | 7             | 125   |`}</pre>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Required Columns:</h4>
                    <ul className="space-y-2 text-sm">
                      <li><strong>Product:</strong> Name of the recipe/product</li>
                      <li><strong>Category:</strong> Recipe category (e.g., Classic, Premium, Drinks)</li>
                      <li><strong>Ingredient Name:</strong> Name of the ingredient</li>
                      <li><strong>Unit of Measure:</strong> Unit for the ingredient (piece, serving, ml, etc.)</li>
                      <li><strong>Quantity:</strong> Amount of ingredient needed</li>
                      <li><strong>Cost per Unit:</strong> Cost of one unit (can be "—" for calculated ingredients)</li>
                      <li><strong>Price:</strong> Final selling price of the product</li>
                    </ul>

                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Multiple Ingredients:</strong> Each ingredient should be on a separate row with the same Product name.
                        The system will automatically group ingredients by product name.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Supported File Types</CardTitle>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• <strong>.md files:</strong> Standard markdown files</li>
                    <li>• <strong>Multiple files:</strong> Upload multiple recipe files at once</li>
                    <li>• <strong>Mixed categories:</strong> Different recipe types in the same file</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workflow" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Complete Recipe Workflow</CardTitle>
                  <CardDescription>
                    Understanding the full process from upload to POS system
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Upload className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">1. Upload & Parse</h4>
                        <p className="text-sm text-muted-foreground">
                          Markdown files are parsed and validated. Recipe templates are created with all ingredients.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="bg-green-100 p-2 rounded-full">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">2. Commissary Integration</h4>
                        <p className="text-sm text-muted-foreground">
                          Missing commissary inventory items are automatically created with default stock levels.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="bg-purple-100 p-2 rounded-full">
                        <Rocket className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">3. Recipe Deployment</h4>
                        <p className="text-sm text-muted-foreground">
                          Deploy recipe templates to specific stores using the deployment service.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="bg-orange-100 p-2 rounded-full">
                        <FileText className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">4. Product Catalog</h4>
                        <p className="text-sm text-muted-foreground">
                          Deployed recipes automatically appear in the store's product catalog for the POS system.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Automatic Integration:</strong> The system maintains full compatibility with existing 
                      recipe deployment, commissary inventory, and POS integration workflows.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Next Steps After Upload</CardTitle>
                </CardHeader>
                
                <CardContent>
                  <ol className="space-y-2 text-sm">
                    <li><strong>1. Review Templates:</strong> Check uploaded recipe templates for accuracy</li>
                    <li><strong>2. Adjust Commissary:</strong> Review and adjust stock levels for new inventory items</li>
                    <li><strong>3. Deploy to Stores:</strong> Use the deployment service to make recipes available in stores</li>
                    <li><strong>4. Test POS:</strong> Verify recipes appear correctly in the POS system</li>
                    <li><strong>5. Monitor Inventory:</strong> Track ingredient usage and reorder as needed</li>
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
