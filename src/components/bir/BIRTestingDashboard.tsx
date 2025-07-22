import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Database,
  Trash2,
  Download,
  RefreshCw
} from 'lucide-react';
import { BIRSampleDataService } from '@/services/bir/birSampleDataService';
import { BIRValidationService } from '@/services/bir/birValidationService';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';

interface ValidationResults {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}

export default function BIRTestingDashboard() {
  const { currentStore } = useStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);

  const handleGenerateSampleData = async () => {
    if (!currentStore?.id) return;
    
    setIsGenerating(true);
    try {
      const success = await BIRSampleDataService.generateLast30Days(currentStore.id);
      if (success) {
        toast.success('Sample data generated successfully');
        // Auto-validate after generation
        handleValidateData();
      }
    } catch (error) {
      toast.error('Failed to generate sample data');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearSampleData = async () => {
    if (!currentStore?.id) return;
    
    setIsClearing(true);
    try {
      const success = await BIRSampleDataService.clearSampleTransactions(currentStore.id);
      if (success) {
        setValidationResults(null);
      }
    } catch (error) {
      toast.error('Failed to clear sample data');
    } finally {
      setIsClearing(false);
    }
  };

  const handleValidateData = async () => {
    if (!currentStore?.id) return;
    
    setIsValidating(true);
    try {
      const results = await BIRSampleDataService.validateBIRDataIntegrity(currentStore.id);
      setValidationResults(results);
      
      if (results.isValid) {
        toast.success('BIR data validation passed');
      } else {
        toast.warning(`Validation found ${results.issues.length} issues`);
      }
    } catch (error) {
      toast.error('Failed to validate data');
    } finally {
      setIsValidating(false);
    }
  };

  const handleValidateStore = () => {
    if (!currentStore) return;
    
    const storeValidation = BIRValidationService.validateStore(currentStore);
    
    setValidationResults({
      isValid: storeValidation.isValid,
      issues: [...storeValidation.errors, ...storeValidation.warnings],
      recommendations: storeValidation.recommendations
    });
    
    if (storeValidation.isValid) {
      toast.success('Store BIR configuration is valid');
    } else {
      toast.warning(`Store validation found ${storeValidation.errors.length} errors and ${storeValidation.warnings.length} warnings`);
    }
  };

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    );
  };

  const getStatusBadge = (isValid: boolean) => {
    return (
      <Badge variant={isValid ? "default" : "destructive"}>
        {isValid ? "Valid" : "Issues Found"}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            BIR Testing Dashboard
          </CardTitle>
          <CardDescription>
            Generate sample data and validate BIR compliance for testing and verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sample Data Generation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sample Data Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={handleGenerateSampleData}
                disabled={isGenerating || !currentStore}
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Sample Data'
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleClearSampleData}
                disabled={isClearing || !currentStore}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {isClearing ? 'Clearing...' : 'Clear Sample Data'}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleValidateData}
                disabled={isValidating || !currentStore}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {isValidating ? 'Validating...' : 'Validate Data'}
              </Button>
            </div>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Sample data generation will create realistic transactions for the last 30 days with proper BIR calculations, VAT breakdowns, and various customer types including senior citizens and PWDs.
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          {/* Store Validation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Store BIR Configuration</h3>
            <Button
              variant="outline"
              onClick={handleValidateStore}
              disabled={!currentStore}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Validate Store Configuration
            </Button>
          </div>

          <Separator />

          {/* Validation Results */}
          {validationResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Validation Results</h3>
                <div className="flex items-center gap-2">
                  {getStatusIcon(validationResults.isValid)}
                  {getStatusBadge(validationResults.isValid)}
                </div>
              </div>

              {validationResults.issues.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Issues Found ({validationResults.issues.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {validationResults.issues.map((issue, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {validationResults.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Recommendations ({validationResults.recommendations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {validationResults.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* BIR Compliance Checklist */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">BIR Compliance Checklist</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Required Fields</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>✓ TIN (Taxpayer Identification Number)</li>
                    <li>✓ Business Name</li>
                    <li>✓ Machine Accreditation Number</li>
                    <li>✓ Machine Serial Number</li>
                    <li>✓ Permit Number</li>
                    <li>✓ Valid Until Date</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Transaction Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>✓ Sequential Receipt Numbers</li>
                    <li>✓ Proper VAT Calculations (12%)</li>
                    <li>✓ Senior/PWD Discount Tracking</li>
                    <li>✓ Terminal ID Assignment</li>
                    <li>✓ Audit Trail Logging</li>
                    <li>✓ Cumulative Sales Tracking</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}