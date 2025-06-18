
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Database,
  FileText,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import {
  validateDataForMigration,
  migrateRecipesToProducts,
  rollbackMigration,
  validateMigrationIntegrity,
  type RecipeToProductMapping,
  type MigrationResult
} from '@/services/migration/dataMigrationService';
import { toast } from 'sonner';

type MigrationStep = 'validate' | 'review' | 'migrate' | 'complete';

export const DataMigrationWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<MigrationStep>('validate');
  const [isLoading, setIsLoading] = useState(false);
  const [recipesToMigrate, setRecipesToMigrate] = useState<RecipeToProductMapping[]>([]);
  const [existingProducts, setExistingProducts] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [integrityCheck, setIntegrityCheck] = useState<any>(null);

  const handleValidation = async () => {
    setIsLoading(true);
    try {
      const result = await validateDataForMigration();
      setRecipesToMigrate(result.recipesNeedingMigration);
      setExistingProducts(result.existingProducts);
      setValidationErrors(result.validationErrors);
      
      if (result.recipesNeedingMigration.length === 0) {
        toast.info('No recipes found that need migration');
        setCurrentStep('complete');
      } else {
        setCurrentStep('review');
      }
    } catch (error) {
      toast.error('Validation failed');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMigration = async (dryRun: boolean = false) => {
    setIsLoading(true);
    try {
      const result = await migrateRecipesToProducts(recipesToMigrate, dryRun);
      setMigrationResult(result);
      
      if (!dryRun && result.success) {
        setCurrentStep('complete');
        // Run integrity check
        const integrity = await validateMigrationIntegrity();
        setIntegrityCheck(integrity);
      }
    } catch (error) {
      toast.error('Migration failed');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!migrationResult?.rollbackData) return;
    
    setIsLoading(true);
    try {
      const success = await rollbackMigration(migrationResult.rollbackData);
      if (success) {
        setCurrentStep('validate');
        setMigrationResult(null);
        setIntegrityCheck(null);
      }
    } catch (error) {
      toast.error('Rollback failed');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIcon = (step: MigrationStep) => {
    if (currentStep === step) return <Clock className="h-4 w-4 text-blue-500" />;
    
    const stepOrder = ['validate', 'review', 'migrate', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);
    
    if (stepIndex < currentIndex) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
  };

  const MigrationProgress = () => {
    const stepOrder = ['validate', 'review', 'migrate', 'complete'];
    const progress = (stepOrder.indexOf(currentStep) / (stepOrder.length - 1)) * 100;
    
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Migration Progress</span>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Migration Wizard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MigrationProgress />
          
          <div className="flex items-center justify-between mb-6">
            {(['validate', 'review', 'migrate', 'complete'] as MigrationStep[]).map((step, index) => (
              <div key={step} className="flex items-center">
                <div className="flex items-center gap-2">
                  {getStepIcon(step)}
                  <span className={`text-sm ${currentStep === step ? 'font-medium' : 'text-muted-foreground'}`}>
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </span>
                </div>
                {index < 3 && <ArrowRight className="h-4 w-4 mx-4 text-muted-foreground" />}
              </div>
            ))}
          </div>

          <Tabs value={currentStep} className="w-full">
            <TabsContent value="validate" className="space-y-4">
              <div className="text-center space-y-4">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">Validate Data Structure</h3>
                  <p className="text-muted-foreground">
                    Check existing recipes and identify candidates for migration to Product Catalog
                  </p>
                </div>
                <Button 
                  onClick={handleValidation} 
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? 'Validating...' : 'Start Validation'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="review" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Migration Review</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{existingProducts}</div>
                      <div className="text-sm text-muted-foreground">Existing Products</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{recipesToMigrate.length}</div>
                      <div className="text-sm text-muted-foreground">Recipes to Migrate</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-amber-600">{validationErrors.length}</div>
                      <div className="text-sm text-muted-foreground">Validation Issues</div>
                    </CardContent>
                  </Card>
                </div>

                {validationErrors.length > 0 && (
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">Validation Issues Found:</div>
                      <ul className="text-sm space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {recipesToMigrate.map((recipe, index) => (
                    <Card key={recipe.recipeId} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{recipe.recipeName}</div>
                          <div className="text-sm text-muted-foreground">
                            {recipe.ingredients.length} ingredients • ₱{recipe.suggestedPrice.toFixed(2)}
                          </div>
                        </div>
                        <Badge variant="secondary">Ready</Badge>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="flex gap-2 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => handleMigration(true)}
                    disabled={isLoading}
                  >
                    Dry Run
                  </Button>
                  <Button 
                    onClick={() => handleMigration(false)}
                    disabled={isLoading || recipesToMigrate.length === 0}
                  >
                    {isLoading ? 'Migrating...' : 'Start Migration'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="migrate" className="space-y-4">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">Migration in Progress</h3>
                  <p className="text-muted-foreground">
                    Migrating recipes to Product Catalog...
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="complete" className="space-y-4">
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">Migration Complete</h3>
                  <p className="text-muted-foreground">
                    Data migration has been completed successfully
                  </p>
                </div>

                {migrationResult && (
                  <div className="text-left max-w-md mx-auto space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Migrated: </span>
                      {migrationResult.migratedCount} recipes
                    </div>
                    {migrationResult.errors.length > 0 && (
                      <div className="text-sm text-red-600">
                        <span className="font-medium">Errors: </span>
                        {migrationResult.errors.length}
                      </div>
                    )}
                  </div>
                )}

                {integrityCheck && (
                  <Alert className={integrityCheck.isValid ? 'border-green-200' : 'border-amber-200'}>
                    <AlertDescription>
                      <div className="font-medium mb-2">
                        Data Integrity: {integrityCheck.isValid ? 'Passed' : 'Issues Found'}
                      </div>
                      <div className="text-sm">
                        Products: {integrityCheck.productCount} | 
                        Ingredient Mappings: {integrityCheck.ingredientMappingCount}
                      </div>
                      {integrityCheck.issues.length > 0 && (
                        <ul className="text-sm mt-2 space-y-1">
                          {integrityCheck.issues.map((issue: string, index: number) => (
                            <li key={index}>• {issue}</li>
                          ))}
                        </ul>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => setCurrentStep('validate')}>
                    Run Again
                  </Button>
                  {migrationResult?.rollbackData && (
                    <Button 
                      variant="destructive"
                      onClick={handleRollback}
                      disabled={isLoading}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Rollback
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
