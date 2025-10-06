/**
 * Phase 2: Cross-Store Mapping Fixer Admin UI
 * Displays and repairs recipe ingredients mapped to wrong store's inventory
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, RefreshCw, Download, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth/AuthProvider";
import {
  detectCrossStoreMappings,
  repairCrossStoreMappings,
  generateRepairReport,
  type CrossStoreMappingIssue,
  type RepairSummary
} from "@/services/recipeManagement/crossStoreMappingRepairService";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CrossStoreMappingFixer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>();
  const [showPreview, setShowPreview] = useState(false);

  // Fetch cross-store issues
  const { data: issues = [], isLoading, refetch } = useQuery({
    queryKey: ['cross-store-mappings', selectedStoreId],
    queryFn: () => detectCrossStoreMappings(selectedStoreId),
    enabled: !!user
  });

  // Repair mutation
  const repairMutation = useMutation({
    mutationFn: async ({ storeId, autoFix }: { storeId?: string; autoFix: boolean }) => {
      if (!storeId) {
        throw new Error('Please select a store');
      }
      return repairCrossStoreMappings(storeId, autoFix);
    },
    onSuccess: (summary: RepairSummary) => {
      queryClient.invalidateQueries({ queryKey: ['cross-store-mappings'] });
      refetch();
    }
  });

  const handlePreview = () => {
    setShowPreview(true);
    if (selectedStoreId) {
      repairMutation.mutate({ storeId: selectedStoreId, autoFix: false });
    } else {
      toast.error('Please select a store first');
    }
  };

  const handleRepair = () => {
    if (selectedStoreId) {
      repairMutation.mutate({ storeId: selectedStoreId, autoFix: true });
    } else {
      toast.error('Please select a store first');
    }
  };

  const handleExportReport = async () => {
    try {
      const report = await generateRepairReport(selectedStoreId);
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cross-store-mapping-report-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  // Group issues by recipe
  const groupedIssues = issues.reduce((acc, issue) => {
    if (!acc[issue.recipe_id]) {
      acc[issue.recipe_id] = {
        recipe_name: issue.recipe_name,
        recipe_store_name: issue.recipe_store_name,
        issues: []
      };
    }
    acc[issue.recipe_id].issues.push(issue);
    return acc;
  }, {} as Record<string, { recipe_name: string; recipe_store_name: string; issues: CrossStoreMappingIssue[] }>);

  if (!user || user.role !== 'admin') {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          Only administrators can access this tool.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Cross-Store Mapping Repair Tool
          </CardTitle>
          <CardDescription>
            Phase 2: Detect and repair recipe ingredients mapped to inventory from other stores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Critical Data Integrity Issue</AlertTitle>
            <AlertDescription>
              <strong>{issues.length}</strong> recipe ingredients are incorrectly mapped to inventory from different stores.
              This causes transactions in one store to deduct inventory from another store's stock.
            </AlertDescription>
          </Alert>

          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => refetch()}
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Scan for Issues
            </Button>

            <Button
              onClick={handlePreview}
              disabled={!selectedStoreId || issues.length === 0 || repairMutation.isPending}
              variant="secondary"
            >
              Preview Repair
            </Button>

            <Button
              onClick={handleRepair}
              disabled={!selectedStoreId || issues.length === 0 || repairMutation.isPending}
              variant="default"
            >
              {repairMutation.isPending ? 'Repairing...' : 'Execute Repair'}
            </Button>

            <Button
              onClick={handleExportReport}
              disabled={issues.length === 0}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {issues.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Affected Recipes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(groupedIssues).length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Mapping Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{issues.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Stores Affected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(issues.map(i => i.recipe_store_id)).size}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Repair Results */}
      {repairMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle>Repair Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Repaired: {repairMutation.data.repaired}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span>Failed: {repairMutation.data.failed}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span>Skipped: {repairMutation.data.skipped}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issues Table */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">Loading issues...</div>
          </CardContent>
        </Card>
      ) : issues.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium">No Cross-Store Mapping Issues Found</p>
              <p className="text-muted-foreground">All recipe ingredients are correctly mapped to their store's inventory.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Cross-Store Mapping Issues</CardTitle>
            <CardDescription>
              Recipe ingredients incorrectly pointing to inventory from other stores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipe</TableHead>
                    <TableHead>Recipe Store</TableHead>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Inventory Item</TableHead>
                    <TableHead>Wrong Store</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue, index) => (
                    <TableRow key={`${issue.ingredient_id}-${index}`}>
                      <TableCell className="font-medium">{issue.recipe_name}</TableCell>
                      <TableCell>{issue.recipe_store_name}</TableCell>
                      <TableCell>{issue.ingredient_name}</TableCell>
                      <TableCell>{issue.inventory_item_name}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{issue.inventory_store_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Needs Repair</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
