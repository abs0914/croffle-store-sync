import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Package,
  Store
} from 'lucide-react';
import { 
  auditRecipeTemplateConsistency,
  syncRecipesWithTemplates,
  exportRecipeAuditReport,
  getAuditSummary,
  RecipeAuditResult
} from '@/services/recipeManagement/recipeAuditService';
import { toast } from 'sonner';

interface RecipeAuditDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecipeAuditDialog: React.FC<RecipeAuditDialogProps> = ({
  isOpen,
  onClose
}) => {
  const [auditData, setAuditData] = useState<RecipeAuditResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      runAudit();
    }
  }, [isOpen]);

  const runAudit = async () => {
    setLoading(true);
    try {
      const data = await auditRecipeTemplateConsistency();
      setAuditData(data);
    } catch (error) {
      console.error('Failed to run audit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await syncRecipesWithTemplates();
      toast.success('All recipes synced successfully');
      await runAudit(); // Refresh audit data
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = () => {
    exportRecipeAuditReport(auditData);
  };

  const summary = getAuditSummary(auditData);
  
  const getStatusBadge = (status: string, issueType: string) => {
    switch (issueType) {
      case 'consistent':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">✓ Match</Badge>;
      case 'quantity_mismatch':
        return <Badge variant="destructive">⚠ Quantity Mismatch</Badge>;
      case 'unit_mismatch':
        return <Badge variant="destructive">⚠ Unit Mismatch</Badge>;
      case 'missing_deployment':
        return <Badge variant="outline" className="border-orange-500 text-orange-700">✗ Missing</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const issuesByTemplate = auditData.reduce((acc, item) => {
    if (!acc[item.template_name]) {
      acc[item.template_name] = [];
    }
    acc[item.template_name].push(item);
    return acc;
  }, {} as Record<string, RecipeAuditResult[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Recipe Template Audit & Sync
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="summary" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="details">Detailed Report</TabsTrigger>
              <TabsTrigger value="by-template">By Template</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="flex-1 overflow-auto space-y-4">
              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button onClick={runAudit} disabled={loading} variant="outline">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Running Audit...' : 'Refresh Audit'}
                </Button>
                
                <Button onClick={handleSyncAll} disabled={syncing} variant="default">
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync All Templates'}
                </Button>
                
                <Button onClick={handleExport} variant="outline" disabled={auditData.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold text-green-600">{summary.consistent}</p>
                        <p className="text-sm text-muted-foreground">Consistent</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-2xl font-bold text-orange-600">
                          {summary.quantity_mismatch + summary.unit_mismatch}
                        </p>
                        <p className="text-sm text-muted-foreground">Mismatches</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-2xl font-bold text-red-600">{summary.missing_deployment}</p>
                        <p className="text-sm text-muted-foreground">Missing</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Store className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{summary.stores_count}</p>
                        <p className="text-sm text-muted-foreground">Stores</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Overview Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Audit Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Ingredient Checks:</span>
                      <span className="font-semibold">{summary.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Templates Reviewed:</span>
                      <span className="font-semibold">{summary.templates_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stores Affected:</span>
                      <span className="font-semibold">{summary.stores_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate:</span>
                      <span className="font-semibold text-green-600">
                        {summary.total > 0 ? Math.round((summary.consistent / summary.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="flex-1 overflow-auto">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {auditData.map((item, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{item.template_name}</span>
                            <span className="text-muted-foreground">→ {item.store_name}</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">{item.ingredient_name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Template: {item.template_quantity} {item.template_unit} 
                            {item.issue_type !== 'missing_deployment' && (
                              <> → Deployed: {item.deployed_quantity} {item.deployed_unit}</>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(item.status, item.issue_type)}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="by-template" className="flex-1 overflow-auto">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {Object.entries(issuesByTemplate).map(([templateName, items]) => (
                    <Card key={templateName}>
                      <CardHeader>
                        <CardTitle className="text-lg">{templateName}</CardTitle>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            {items.length} ingredients
                          </Badge>
                          <Badge variant="outline">
                            {new Set(items.map(i => i.store_name)).size} stores
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {items.map((item, index) => (
                            <div key={index} className="flex justify-between items-center p-2 rounded border">
                              <div>
                                <span className="font-medium">{item.ingredient_name}</span>
                                <span className="text-muted-foreground ml-2">
                                  @ {item.store_name}
                                </span>
                              </div>
                              {getStatusBadge(item.status, item.issue_type)}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};