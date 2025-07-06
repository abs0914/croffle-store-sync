
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Package, 
  Store,
  Clock,
  RefreshCw
} from 'lucide-react';
import { EnhancedRecipeDeploymentService, DeploymentResult, DeploymentValidation } from '@/services/recipeManagement/enhancedRecipeDeploymentService';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  templateName: string;
  selectedStores: Array<{ id: string; name: string }>;
  onDeploymentComplete: (results: DeploymentResult[]) => void;
}

export const EnhancedRecipeDeploymentDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  templateId,
  templateName,
  selectedStores,
  onDeploymentComplete
}) => {
  const [validation, setValidation] = useState<DeploymentValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [deploymentResults, setDeploymentResults] = useState<DeploymentResult[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Initialize selected stores
  useEffect(() => {
    if (selectedStores.length > 0) {
      setSelectedStoreIds(selectedStores.map(s => s.id));
    }
  }, [selectedStores]);

  // Validate template when dialog opens
  useEffect(() => {
    if (isOpen && templateId) {
      validateTemplate();
    }
  }, [isOpen, templateId]);

  const validateTemplate = async () => {
    setIsValidating(true);
    try {
      const validationResult = await EnhancedRecipeDeploymentService.validateTemplate(templateId);
      setValidation(validationResult);
    } catch (error) {
      console.error('Validation failed:', error);
      toast.error('Failed to validate template');
    } finally {
      setIsValidating(false);
    }
  };

  const handleStoreSelection = (storeId: string, checked: boolean) => {
    if (checked) {
      setSelectedStoreIds(prev => [...prev, storeId]);
    } else {
      setSelectedStoreIds(prev => prev.filter(id => id !== storeId));
    }
  };

  const handleDeploy = async () => {
    if (!validation?.isValid) {
      toast.error('Cannot deploy: Template validation failed');
      return;
    }

    if (selectedStoreIds.length === 0) {
      toast.error('Please select at least one store');
      return;
    }

    const storesToDeploy = selectedStores.filter(store => selectedStoreIds.includes(store.id));
    
    setIsDeploying(true);
    setDeploymentProgress(0);
    setDeploymentResults([]);

    try {
      console.log('Starting deployment to stores:', storesToDeploy);
      
      const results = await EnhancedRecipeDeploymentService.deployTemplateToStores(
        templateId,
        storesToDeploy
      );

      setDeploymentResults(results);
      setDeploymentProgress(100);
      setShowResults(true);

      // Call completion handler
      onDeploymentComplete(results);

      // Show summary toast
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0 && failCount === 0) {
        toast.success(`Successfully deployed to all ${successCount} store(s)`);
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`Deployed to ${successCount} store(s), failed on ${failCount} store(s)`);
      } else {
        toast.error('Deployment failed for all stores');
      }

    } catch (error) {
      console.error('Deployment failed:', error);
      toast.error('Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleClose = () => {
    if (!isDeploying) {
      setValidation(null);
      setDeploymentResults([]);
      setShowResults(false);
      setDeploymentProgress(0);
      onClose();
    }
  };

  const getValidationIcon = () => {
    if (isValidating) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (!validation) return <Clock className="h-4 w-4" />;
    if (validation.isValid) return <CheckCircle className="h-4 w-4 text-green-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getValidationStatus = () => {
    if (isValidating) return 'Validating...';
    if (!validation) return 'Pending Validation';
    if (validation.isValid) return 'Ready for Deployment';
    return 'Validation Failed';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Enhanced Recipe Deployment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Template: {templateName}</h3>
            <div className="flex items-center gap-2 mb-2">
              {getValidationIcon()}
              <span className="text-sm">{getValidationStatus()}</span>
            </div>
            
            {validation && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Ingredients:</span>
                  <span className="ml-2 font-medium">{validation.templateInfo.ingredientCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Instructions:</span>
                  <span className="ml-2 font-medium">
                    {validation.templateInfo.hasInstructions ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Validation Messages */}
          {validation && (
            <div className="space-y-2">
              {validation.errors.map((error, index) => (
                <Alert key={index} variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ))}
              
              {validation.warnings.map((warning, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
              ))}

              {validation.isValid && validation.errors.length === 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>Template validation passed. Ready for deployment.</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Store Selection */}
          {validation?.isValid && !showResults && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Store className="h-4 w-4" />
                Select Stores ({selectedStoreIds.length} of {selectedStores.length} selected)
              </h3>
              
              <ScrollArea className="max-h-40 border rounded p-2">
                <div className="space-y-2">
                  {selectedStores.map((store) => (
                    <div key={store.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={store.id}
                        checked={selectedStoreIds.includes(store.id)}
                        onCheckedChange={(checked) => handleStoreSelection(store.id, !!checked)}
                      />
                      <label htmlFor={store.id} className="text-sm font-medium cursor-pointer">
                        {store.name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Deployment Progress */}
          {isDeploying && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Deploying recipe...</span>
              </div>
              <Progress value={deploymentProgress} />
            </div>
          )}

          {/* Deployment Results */}
          {showResults && deploymentResults.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Deployment Results</h3>
              
              <ScrollArea className="max-h-60 border rounded p-2">
                <div className="space-y-2">
                  {deploymentResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium">{result.storeName}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={result.success ? "default" : "destructive"}>
                          {result.success ? 'Success' : result.error}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Results Summary */}
              <div className="mt-3 p-3 bg-gray-50 rounded">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-600 font-medium">
                      ✓ Successful: {deploymentResults.filter(r => r.success).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-red-600 font-medium">
                      ✗ Failed: {deploymentResults.filter(r => !r.success).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isDeploying}
            >
              {showResults ? 'Close' : 'Cancel'}
            </Button>
            
            {!showResults && (
              <>
                <Button
                  variant="outline"
                  onClick={validateTemplate}
                  disabled={isValidating || isDeploying}
                >
                  {isValidating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Re-validate
                </Button>
                
                <Button
                  onClick={handleDeploy}
                  disabled={!validation?.isValid || selectedStoreIds.length === 0 || isDeploying}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isDeploying ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      Deploy to {selectedStoreIds.length} Store{selectedStoreIds.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
