import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Rocket, 
  Settings,
  ExternalLink,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import QuickRecipeUpload from './QuickRecipeUpload';
import { runMarkdownUploadTest } from '@/scripts/testMarkdownUploadSystem';

interface MarkdownUploadIntegrationProps {
  onRecipesUploaded?: () => void;
  showQuickUpload?: boolean;
  showFullUpload?: boolean;
  showTestButton?: boolean;
}

export const MarkdownUploadIntegration: React.FC<MarkdownUploadIntegrationProps> = ({
  onRecipesUploaded,
  showQuickUpload = true,
  showFullUpload = true,
  showTestButton = false
}) => {
  const navigate = useNavigate();
  const [isTestingSystem, setIsTestingSystem] = useState(false);

  const handleTestSystem = async () => {
    setIsTestingSystem(true);
    try {
      toast.info('Running system tests...');
      await runMarkdownUploadTest();
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setIsTestingSystem(false);
    }
  };

  const handleNavigateToFullUpload = () => {
    navigate('/admin/markdown-recipe-upload');
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>Markdown Recipe Upload System</strong> - Upload recipes from markdown files with automatic commissary integration.
            </div>
            <div className="flex gap-2">
              {showTestButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestSystem}
                  disabled={isTestingSystem}
                  className="flex items-center gap-1"
                >
                  <Settings className="h-3 w-3" />
                  {isTestingSystem ? 'Testing...' : 'Test System'}
                </Button>
              )}
              {showFullUpload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNavigateToFullUpload}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Full Upload Interface
                </Button>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Quick Upload Section */}
      {showQuickUpload && (
        <QuickRecipeUpload onUploadComplete={onRecipesUploaded} />
      )}

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            System Features
          </CardTitle>
          <CardDescription>
            Complete workflow from markdown files to POS system
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Upload Features:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Parse markdown table format</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Multiple file support</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Validation & preview</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Progress tracking</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Integration Features:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Auto-create commissary items</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Recipe template creation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Deployment ready</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>POS system integration</span>
                </div>
              </div>
            </div>
          </div>

          {/* Supported File Types */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Supported Recipe Types:</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Croffle Recipes</Badge>
              <Badge variant="secondary">Coffee Drinks</Badge>
              <Badge variant="secondary">Other Beverages</Badge>
              <Badge variant="secondary">Combo Items</Badge>
              <Badge variant="secondary">Add-ons</Badge>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Workflow:</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>1. Upload markdown files with recipe tables</div>
              <div>2. System parses and validates recipe data</div>
              <div>3. Recipe templates created with ingredients</div>
              <div>4. Missing commissary items auto-created</div>
              <div>5. Deploy recipes to stores using deployment service</div>
              <div>6. Recipes appear in POS system automatically</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            {showFullUpload && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNavigateToFullUpload}
                className="flex items-center gap-1"
              >
                <Upload className="h-3 w-3" />
                Custom Upload
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/recipe-deployment')}
              className="flex items-center gap-1"
            >
              <Rocket className="h-3 w-3" />
              Deploy Recipes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/commissary-inventory')}
              className="flex items-center gap-1"
            >
              <Settings className="h-3 w-3" />
              Manage Inventory
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <div className="space-y-1">
            <div><strong>Important:</strong> After uploading recipes, remember to:</div>
            <ul className="text-sm space-y-1 ml-4">
              <li>• Review and adjust commissary stock levels</li>
              <li>• Deploy recipes to appropriate stores</li>
              <li>• Test recipes in the POS system</li>
              <li>• Monitor ingredient usage and costs</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default MarkdownUploadIntegration;
