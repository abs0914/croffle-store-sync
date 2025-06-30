import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Package } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

interface AdminRecipesListProps {
  recipes: any[];
  selectedRecipes: string[];
  onSelectRecipe: (recipeId: string) => void;
  onSelectAll: () => void;
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  onRefresh: () => void;
  stores: any[];
  onEnhancedDeployment?: (template: any, selectedStores: Array<{ id: string; name: string }>) => void;
}

export function AdminRecipesList({
  recipes,
  selectedRecipes,
  onSelectRecipe,
  onSelectAll,
  viewMode,
  isLoading,
  onRefresh,
  stores,
  onEnhancedDeployment
}: AdminRecipesListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleEnhancedDeploy = async (recipe: any) => {
    if (!onEnhancedDeployment) return;
    
    // Get available stores
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name')
      .eq('is_active', true);
    
    if (stores && stores.length > 0) {
      // For now, deploy to all stores - in production you might want a store selector
      onEnhancedDeployment(recipe, stores);
    } else {
      toast.error('No active stores found');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
        {recipes.map((recipe) => (
          <Card key={recipe.id} className={viewMode === 'list' ? 'p-4' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`select-${recipe.id}`}
                    checked={selectedRecipes.includes(recipe.id)}
                    onCheckedChange={() => onSelectRecipe(recipe.id)}
                  />
                  <Label htmlFor={`select-${recipe.id}`} className="cursor-pointer">
                    {recipe.name}
                  </Label>
                </div>
                <Badge variant="secondary">{recipe.approval_status}</Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">
                {recipe.description}
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  onClick={() => handleEnhancedDeploy(recipe)}
                  className="flex items-center gap-1"
                >
                  <Package className="h-3 w-3" />
                  Enhanced Deploy
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
