import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Target, 
  Users, 
  RefreshCw, 
  Zap,
  Eye,
  Plus
} from 'lucide-react';
import { AutomaticTemplateMatchingService } from '@/services/maintenance/automaticTemplateMatching';
import { toast } from 'sonner';

interface ManualReviewCandidate {
  product: {
    id: string;
    name: string;
    store_id: string;
    product_type: string;
  };
  suggestedTemplates: Array<{
    template: { id: string; name: string };
    confidence: number;
  }>;
}

export const ProductTemplateAssociationDashboard: React.FC = () => {
  const [isRunningAutomatic, setIsRunningAutomatic] = useState(false);
  const [automaticResult, setAutomaticResult] = useState<any>(null);
  const [manualCandidates, setManualCandidates] = useState<ManualReviewCandidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isAssociating, setIsAssociating] = useState<string | null>(null);

  // Load manual review candidates
  const loadManualCandidates = async () => {
    setIsLoadingCandidates(true);
    try {
      const candidates = await AutomaticTemplateMatchingService.getManualReviewCandidates();
      setManualCandidates(candidates.suggestions);
    } catch (error) {
      console.error('Failed to load manual candidates:', error);
      toast.error('Failed to load manual review candidates');
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  // Run automatic matching (Phase 1)
  const runAutomaticMatching = async () => {
    setIsRunningAutomatic(true);
    try {
      const result = await AutomaticTemplateMatchingService.runAutomaticMatching();
      setAutomaticResult(result);
      
      if (result.success) {
        toast.success(`Automatic matching completed: ${result.matchedCount} products matched`);
        // Reload manual candidates after automatic matching
        await loadManualCandidates();
      } else {
        toast.error('Automatic matching failed');
      }
    } catch (error) {
      console.error('Automatic matching failed:', error);
      toast.error('Automatic matching failed');
    } finally {
      setIsRunningAutomatic(false);
    }
  };

  // Manually associate a product with a template
  const handleManualAssociation = async (
    productId: string,
    templateId: string,
    productName: string,
    storeId: string
  ) => {
    setIsAssociating(productId);
    try {
      const result = await AutomaticTemplateMatchingService.manuallyAssociateTemplate(
        productId,
        templateId,
        productName,
        storeId
      );
      
      if (result.success) {
        toast.success('Template associated successfully');
        // Remove from candidates list
        setManualCandidates(prev => prev.filter(c => c.product.id !== productId));
      } else {
        toast.error('Failed to associate template');
      }
    } catch (error) {
      console.error('Manual association failed:', error);
      toast.error('Association failed');
    } finally {
      setIsAssociating(null);
    }
  };

  useEffect(() => {
    loadManualCandidates();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Product Template Association</h2>
        <p className="text-muted-foreground mt-2">
          Fix products missing recipe template associations through automatic matching and manual review.
        </p>
      </div>

      {/* Phase 1: Automatic Matching */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Phase 1: Automatic Template Matching
              </CardTitle>
              <CardDescription>
                High-confidence automatic matching (≥85% similarity) between product names and templates
              </CardDescription>
            </div>
            <Button 
              onClick={runAutomaticMatching}
              disabled={isRunningAutomatic}
              size="sm"
            >
              {isRunningAutomatic ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Automatic Matching
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        
        {automaticResult && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-card/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{automaticResult.totalProcessed}</div>
                <div className="text-sm text-muted-foreground">Products Processed</div>
              </div>
              <div className="text-center p-4 bg-card/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{automaticResult.matchedCount}</div>
                <div className="text-sm text-muted-foreground">Auto-Matched</div>
              </div>
              <div className="text-center p-4 bg-card/50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{automaticResult.unmatched?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Need Review</div>
              </div>
            </div>
            
            <Alert className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {automaticResult.message}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Phase 2: Manual Review */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-orange-600" />
                Phase 2: Manual Review Dashboard
              </CardTitle>
              <CardDescription>
                Review and manually associate products that need human judgment
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">
                {manualCandidates.length} items pending
              </Badge>
              <Button 
                onClick={loadManualCandidates}
                disabled={isLoadingCandidates}
                size="sm"
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCandidates ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoadingCandidates ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading candidates...</p>
            </div>
          ) : manualCandidates.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                No products need manual review. All template associations are complete!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {manualCandidates.map((candidate) => (
                <Card key={candidate.product.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-medium">{candidate.product.name}</h4>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {candidate.product.product_type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Store: {candidate.product.store_id.slice(0, 8)}...
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {candidate.suggestedTemplates.length > 0 ? (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Suggested templates:</p>
                        <div className="space-y-2">
                          {candidate.suggestedTemplates.slice(0, 3).map((suggestion) => (
                            <div key={suggestion.template.id} className="flex items-center justify-between p-2 bg-card/50 rounded">
                              <div className="flex-1">
                                <span className="font-medium text-sm">{suggestion.template.name}</span>
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {Math.round(suggestion.confidence * 100)}% match
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleManualAssociation(
                                  candidate.product.id,
                                  suggestion.template.id,
                                  candidate.product.name,
                                  candidate.product.store_id
                                )}
                                disabled={isAssociating === candidate.product.id}
                              >
                                {isAssociating === candidate.product.id ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Target className="h-3 w-3 mr-1" />
                                    Associate
                                  </>
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Alert>
                        <Plus className="h-4 w-4" />
                        <AlertDescription>
                          No suitable template found. May need to create a new template for this product.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase 3: Create Missing Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            Phase 3: Create Missing Templates
          </CardTitle>
          <CardDescription>
            For products with no matching templates, create basic ingredient-based templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Template creation feature coming soon. For now, products without templates will be flagged for manual template creation.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};