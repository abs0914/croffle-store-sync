import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { deployCrofflesToAllStores } from '@/services/deployment/croffleDeploymentService';
import { 
  Rocket, 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  Store,
  Loader2,
  Target
} from 'lucide-react';

interface DeploymentResult {
  success: boolean;
  message: string;
  deployed_products: Array<{
    store_name: string;
    products_added: string[];
    categories_created: string[];
  }>;
  errors: string[];
}

export const CroffleDeploymentTool: React.FC = () => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null);
  const [deploymentProgress, setDeploymentProgress] = useState(0);

  const handleDeployment = async () => {
    setIsDeploying(true);
    setDeploymentProgress(0);
    setDeploymentResult(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setDeploymentProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await deployCrofflesToAllStores();
      
      clearInterval(progressInterval);
      setDeploymentProgress(100);
      setDeploymentResult(result);
      
    } catch (error) {
      console.error('Deployment error:', error);
      setDeploymentResult({
        success: false,
        message: 'Deployment failed with critical error',
        deployed_products: [],
        errors: [error instanceof Error ? error.message : String(error)]
      });
      setDeploymentProgress(100);
    } finally {
      setIsDeploying(false);
    }
  };

  const targetStores = [
    'SM City Cebu',
    'SM Savemore Tacloban', 
    'Sugbo Mercado (IT Park, Cebu)'
  ];

  const croffleProducts = [
    'Biscoff Croffle', 'Nutella Croffle', 'KitKat Croffle', 'Cookies & Cream Croffle',
    'Choco Overload Croffle', 'Matcha Croffle', 'Dark Chocolate Croffle',
    'Tiramisu Croffle', 'Choco Nut Croffle', 'Caramel Delight Croffle', 
    'Choco Marshmallow Croffle', 'Mango Croffle', 'Strawberry Croffle', 'Blueberry Croffle'
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-blue-600" />
            Croffle Product Deployment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              <strong>Mission:</strong> Deploy 14 croffle products to 3 stores for 100% coverage across all 8 locations.
            </AlertDescription>
          </Alert>

          {/* Target Stores */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Store className="h-4 w-4" />
              Target Stores (3)
            </h4>
            <div className="flex flex-wrap gap-2">
              {targetStores.map(store => (
                <Badge key={store} variant="outline" className="flex items-center gap-1">
                  <Store className="h-3 w-3" />
                  {store}
                </Badge>
              ))}
            </div>
          </div>

          {/* Products to Deploy */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products to Deploy (14)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {croffleProducts.map(product => (
                <div key={product} className="p-2 bg-gray-50 rounded border text-xs">
                  {product}
                </div>
              ))}
            </div>
          </div>

          {/* Deployment Controls */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium">Ready to Deploy</p>
                <p className="text-sm text-muted-foreground">
                  This will deploy all 14 croffle products to the 3 target stores
                </p>
              </div>
              
              <Button 
                onClick={handleDeployment}
                disabled={isDeploying}
                className="flex items-center gap-2"
                size="lg"
              >
                {isDeploying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4" />
                )}
                {isDeploying ? 'Deploying...' : 'Deploy Croffles'}
              </Button>
            </div>

            {/* Progress Bar */}
            {isDeploying && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Deployment Progress</span>
                  <span>{deploymentProgress}%</span>
                </div>
                <Progress value={deploymentProgress} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deployment Results */}
      {deploymentResult && (
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${
              deploymentResult.success ? 'text-green-600' : 'text-red-600'
            }`}>
              {deploymentResult.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              Deployment {deploymentResult.success ? 'Completed' : 'Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>{deploymentResult.success ? 'Success!' : 'Error:'}</strong> {deploymentResult.message}
              </AlertDescription>
            </Alert>

            {/* Store-by-Store Results */}
            {deploymentResult.deployed_products.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Deployment Details</h4>
                {deploymentResult.deployed_products.map((store, index) => (
                  <Card key={index} className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">{store.store_name}</h5>
                        <div className="flex gap-2">
                          {store.products_added.length > 0 && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              {store.products_added.length} Products Added
                            </Badge>
                          )}
                          {store.categories_created.length > 0 && (
                            <Badge variant="secondary">
                              {store.categories_created.length} Categories Created
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {store.products_added.length > 0 && (
                        <div className="text-sm">
                          <p className="text-muted-foreground mb-1">Products Added:</p>
                          <div className="grid grid-cols-2 gap-1">
                            {store.products_added.map(product => (
                              <div key={product} className="text-xs bg-green-50 p-1 rounded">
                                ✅ {product}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {store.categories_created.length > 0 && (
                        <div className="text-sm mt-2">
                          <p className="text-muted-foreground mb-1">Categories Created:</p>
                          <div className="flex gap-1">
                            {store.categories_created.map(category => (
                              <Badge key={category} variant="outline" className="text-xs">
                                {category}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Errors */}
            {deploymentResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Errors & Warnings</h4>
                {deploymentResult.errors.map((error, index) => (
                  <Alert key={index}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {error}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};