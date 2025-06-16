import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Upload, Download, FileText, FileJson, Calculator, AlertTriangle, Package, ChefHat } from "lucide-react";

export function RecipeFeaturesSummary() {
  const features = [
    {
      category: "Recipe Management",
      items: [
        { name: "Create Recipes", status: "implemented", icon: ChefHat },
        { name: "Edit Recipes", status: "implemented", icon: ChefHat },
        { name: "Delete Recipes", status: "implemented", icon: ChefHat },
        { name: "Search Recipes", status: "implemented", icon: ChefHat },
        { name: "Recipe Versioning", status: "enhanced", icon: ChefHat },
        { name: "Recipe Categories", status: "enhanced", icon: ChefHat },
        { name: "Recipe Tags", status: "enhanced", icon: ChefHat }
      ]
    },
    {
      category: "Import/Export Features",
      items: [
        { name: "CSV Import", status: "new", icon: Upload },
        { name: "CSV Export", status: "new", icon: Download },
        { name: "JSON Import", status: "new", icon: FileJson },
        { name: "JSON Export", status: "new", icon: FileJson },
        { name: "CSV Template Download", status: "new", icon: FileText },
        { name: "Bulk Recipe Creation", status: "new", icon: Upload }
      ]
    },
    {
      category: "Cost & Analytics",
      items: [
        { name: "Recipe Cost Calculation", status: "implemented", icon: Calculator },
        { name: "Cost Per Unit", status: "enhanced", icon: Calculator },
        { name: "Ingredient Cost Tracking", status: "implemented", icon: Calculator },
        { name: "Recipe Usage Analytics", status: "new", icon: Calculator },
        { name: "Prep/Cook Time Tracking", status: "enhanced", icon: Calculator }
      ]
    },
    {
      category: "POS Integration",
      items: [
        { name: "Inventory Deduction", status: "new", icon: Package },
        { name: "Recipe Availability Check", status: "new", icon: Package },
        { name: "Stock Validation", status: "new", icon: Package },
        { name: "Usage Logging", status: "new", icon: Package },
        { name: "Transaction Integration", status: "new", icon: Package }
      ]
    },
    {
      category: "Alerts & Monitoring",
      items: [
        { name: "Low Stock Alerts", status: "new", icon: AlertTriangle },
        { name: "Recipe Ingredient Alerts", status: "new", icon: AlertTriangle },
        { name: "Out of Stock Warnings", status: "new", icon: AlertTriangle },
        { name: "Recipe Availability Status", status: "new", icon: AlertTriangle }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "implemented": return "bg-green-100 text-green-800 border-green-200";
      case "enhanced": return "bg-blue-100 text-blue-800 border-blue-200";
      case "new": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "implemented": return "✓ Existing";
      case "enhanced": return "↗ Enhanced";
      case "new": return "★ New";
      default: return status;
    }
  };

  const totalFeatures = features.reduce((sum, category) => sum + category.items.length, 0);
  const implementedFeatures = features.reduce((sum, category) => 
    sum + category.items.filter(item => item.status === "implemented").length, 0
  );
  const enhancedFeatures = features.reduce((sum, category) => 
    sum + category.items.filter(item => item.status === "enhanced").length, 0
  );
  const newFeatures = features.reduce((sum, category) => 
    sum + category.items.filter(item => item.status === "new").length, 0
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Recipe & Raw Materials Features Implementation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalFeatures}</div>
              <div className="text-sm text-gray-600">Total Features</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{implementedFeatures}</div>
              <div className="text-sm text-gray-600">Existing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{enhancedFeatures}</div>
              <div className="text-sm text-gray-600">Enhanced</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{newFeatures}</div>
              <div className="text-sm text-gray-600">New</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {features.map((category, categoryIndex) => (
          <Card key={categoryIndex}>
            <CardHeader>
              <CardTitle className="text-lg">{category.category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <Badge className={getStatusColor(item.status)}>
                      {getStatusText(item.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Implementation Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <h4 className="font-semibold text-green-800 mb-2">✓ Existing Features</h4>
              <p className="text-sm text-green-700">
                Core recipe management, CRUD operations, cost calculations, and ingredient linking were already implemented.
              </p>
            </div>
            
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <h4 className="font-semibold text-blue-800 mb-2">↗ Enhanced Features</h4>
              <p className="text-sm text-blue-700">
                Added versioning, categories, tags, timing, difficulty levels, and improved cost analysis.
              </p>
            </div>
            
            <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
              <h4 className="font-semibold text-purple-800 mb-2">★ New Features</h4>
              <p className="text-sm text-purple-700">
                Bulk import/export, POS integration, inventory deduction, alerts, and usage tracking.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Key Improvements Added:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Recipe CSV/JSON Import/Export:</strong> Bulk recipe management with templates</li>
              <li>• <strong>POS Integration:</strong> Automatic inventory deduction when recipes are used</li>
              <li>• <strong>Smart Alerts:</strong> Low stock warnings for recipe ingredients</li>
              <li>• <strong>Enhanced Forms:</strong> Better recipe creation with timing, categories, and tags</li>
              <li>• <strong>Usage Tracking:</strong> Recipe usage analytics and logging</li>
              <li>• <strong>Availability Checks:</strong> Real-time recipe availability based on inventory</li>
            </ul>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Files Created/Modified:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Services:</strong> recipeService.ts (enhanced), recipeInventoryService.ts (new)</div>
              <div><strong>Hooks:</strong> useRecipeImportExport.ts (new), useRecipeInventoryDeduction.ts (new)</div>
              <div><strong>Components:</strong> RecipesList.tsx (enhanced), EnhancedRecipeForm.tsx (new), RecipeIngredientAlerts.tsx (new)</div>
              <div><strong>Database:</strong> recipe_usage_log table and analytics view (new)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
