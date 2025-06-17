import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ChefHat, 
  Store,
  Package,
  AlertCircle
} from 'lucide-react';
import { approveRecipe, rejectRecipe } from '@/services/recipeManagement/recipeApprovalService';
import { useState } from 'react';

interface AdminRecipesListProps {
  recipes: any[];
  selectedRecipes: string[];
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  onSelectRecipe: (recipeId: string) => void;
  onSelectAll: () => void;
  onRefresh: () => void;
  stores: any[];
}

export const AdminRecipesList: React.FC<AdminRecipesListProps> = ({
  recipes,
  selectedRecipes,
  viewMode,
  isLoading,
  onSelectRecipe,
  onSelectAll,
  onRefresh,
  stores
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRecipeForRejection, setSelectedRecipeForRejection] = useState<string | null>(null);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'pending_approval':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending Approval</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Draft</Badge>;
    }
  };

  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    return store?.name || 'Unknown Store';
  };

  const handleApprove = async (recipeId: string) => {
    const success = await approveRecipe(recipeId);
    if (success) {
      onRefresh();
    }
  };

  const handleReject = async (recipeId: string, reason: string) => {
    const success = await rejectRecipe(recipeId, reason);
    if (success) {
      onRefresh();
      setSelectedRecipeForRejection(null);
      setRejectionReason('');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Deployed Recipes Found</h3>
          <p className="text-muted-foreground">
            Recipes will appear here once they are deployed to stores from the Recipe Management tab.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map(recipe => (
          <Card key={recipe.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedRecipes.includes(recipe.id)}
                    onCheckedChange={() => onSelectRecipe(recipe.id)}
                  />
                  <div>
                    <CardTitle className="text-lg">{recipe.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Store className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {getStoreName(recipe.store_id)}
                      </span>
                    </div>
                  </div>
                </div>
                {getStatusBadge(recipe.approval_status)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {recipe.description && (
                <p className="text-sm text-muted-foreground">{recipe.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <ChefHat className="h-3 w-3" />
                  <span>Yield: {recipe.yield_quantity}</span>
                </div>
                {recipe.product_id && (
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    <span>Product Created</span>
                  </div>
                )}
              </div>

              {recipe.rejection_reason && (
                <div className="p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-700">
                    <strong>Rejection Reason:</strong> {recipe.rejection_reason}
                  </p>
                </div>
              )}

              {recipe.approval_status === 'pending_approval' && (
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleApprove(recipe.id)}
                    className="flex-1"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                  
                  <AlertDialog 
                    open={selectedRecipeForRejection === recipe.id}
                    onOpenChange={(open) => {
                      if (!open) {
                        setSelectedRecipeForRejection(null);
                        setRejectionReason('');
                      }
                    }}
                  >
                    <AlertDialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedRecipeForRejection(recipe.id)}
                        className="flex-1"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </AlertDialogTrigger>
                    
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject Recipe</AlertDialogTitle>
                        <AlertDialogDescription>
                          Please provide a reason for rejecting "{recipe.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      
                      <div className="space-y-2">
                        <Label htmlFor="rejection-reason">Rejection Reason</Label>
                        <Textarea
                          id="rejection-reason"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Enter reason for rejection..."
                          rows={3}
                        />
                      </div>
                      
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleReject(recipe.id, rejectionReason)}
                          disabled={!rejectionReason.trim()}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Reject Recipe
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // List view (simplified for brevity)
  return (
    <div className="space-y-4">
      {recipes.map(recipe => (
        <Card key={recipe.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selectedRecipes.includes(recipe.id)}
                  onCheckedChange={() => onSelectRecipe(recipe.id)}
                />
                <div>
                  <h3 className="font-medium">{recipe.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getStoreName(recipe.store_id)} • Yield: {recipe.yield_quantity}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {getStatusBadge(recipe.approval_status)}
                
                {recipe.approval_status === 'pending_approval' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApprove(recipe.id)}>
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedRecipeForRejection(recipe.id)}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {recipe.rejection_reason && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-700">
                  <strong>Rejection Reason:</strong> {recipe.rejection_reason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
