import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Eye, 
  TrendingDown,
  Package,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateRecipeIngredients } from '@/services/inventory/inventoryMatcher';

interface AuditResult {
  transaction_id: string;
  sync_status: string; // Allow any string instead of restricting to specific values
  items_processed: number;
  error_details?: string;
  created_at: string;
}

interface ValidationResult {
  recipe_id: string;
  recipe_name: string;
  store_id: string;
  store_name: string;
  isValid: boolean;
  errors: string[];
  total_ingredients: number;
  matched_ingredients: number;
}

export const InventoryAuditDashboard: React.FC = () => {
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);

  useEffect(() => {
    loadAuditData();
  }, []);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      // Load recent inventory sync audit results
      const { data: syncData, error: syncError } = await supabase
        .from('inventory_sync_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (syncError) throw syncError;
      setAuditResults(syncData || []);

      // Load recipe validation results
      await runRecipeValidation();

    } catch (error) {
      console.error('Error loading audit data:', error);
      toast.error('Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const runRecipeValidation = async () => {
    try {
      // Get all active recipe templates
      const { data: recipes, error: recipesError } = await supabase
        .from('recipe_templates')
        .select(`
          id,
          name,
          is_active,
          recipe_template_ingredients(count)
        `)
        .eq('is_active', true);

      if (recipesError) throw recipesError;

      // Get all stores
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, name')
        .eq('is_active', true);

      if (storesError) throw storesError;

      const validationResults: ValidationResult[] = [];

      for (const recipe of recipes || []) {
        for (const store of stores || []) {
          const validation = await validateRecipeIngredients(recipe.id, store.id);
          
          validationResults.push({
            recipe_id: recipe.id,
            recipe_name: recipe.name,
            store_id: store.id,
            store_name: store.name,
            isValid: validation.isValid,
            errors: validation.errors,
            total_ingredients: recipe.recipe_template_ingredients?.[0]?.count || 0,
            matched_ingredients: validation.matches.filter(m => m.match_type !== 'none').length
          });
        }
      }

      setValidationResults(validationResults);

    } catch (error) {
      console.error('Error running recipe validation:', error);
      toast.error('Failed to validate recipes');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-4 w-4" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      case 'partial': return <Clock className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const successRate = auditResults.length > 0 
    ? (auditResults.filter(r => r.sync_status === 'success').length / auditResults.length * 100).toFixed(1)
    : '0';

  const validRecipes = validationResults.filter(r => r.isValid).length;
  const totalValidations = validationResults.length;
  const validationRate = totalValidations > 0 ? (validRecipes / totalValidations * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Audit Dashboard</h2>
          <p className="text-gray-600">Monitor inventory deduction success and recipe validation</p>
        </div>
        <Button onClick={loadAuditData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{successRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingDown className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed Deductions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {auditResults.filter(r => r.sync_status === 'failed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recipe Validation</p>
                <p className="text-2xl font-bold text-gray-900">{validationRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Issues Found</p>
                <p className="text-2xl font-bold text-gray-900">
                  {validationResults.filter(r => !r.isValid).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Audit Results */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Inventory Deduction Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {auditResults.slice(0, 10).map((result) => (
              <div
                key={result.transaction_id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  {getStatusIcon(result.sync_status)}
                  <div>
                    <p className="font-medium">{result.transaction_id}</p>
                    <p className="text-sm text-gray-600">
                      {result.items_processed} items processed
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(result.sync_status)}>
                    {result.sync_status}
                  </Badge>
                  <p className="text-sm text-gray-500">
                    {new Date(result.created_at).toLocaleString()}
                  </p>
                  {result.error_details && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTransaction(
                        selectedTransaction === result.transaction_id ? null : result.transaction_id
                      )}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recipe Validation Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Recipe Validation Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {validationResults.filter(r => !r.isValid).slice(0, 10).map((result, index) => (
              <Alert key={index}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">
                    {result.recipe_name} - {result.store_name}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {result.matched_ingredients}/{result.total_ingredients} ingredients matched
                  </div>
                  <div className="text-sm mt-2">
                    <strong>Issues:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {result.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Details Modal */}
      {selectedTransaction && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Error Details - {selectedTransaction}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(
                  auditResults.find(r => r.transaction_id === selectedTransaction)?.error_details,
                  null,
                  2
                )}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};