
import React, { useState } from 'react';
import { ChefHat } from "lucide-react";

export const RecipeManagementTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Recipe Management</h2>
        <p className="text-muted-foreground">
          Manage recipe templates using commissary inventory items. 
          For commissary item reference, use the "Commissary Integration" tab.
        </p>
      </div>

      <div className="text-center py-8">
        <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-2">
          Recipe template management interface coming soon
        </p>
        <p className="text-sm text-blue-600">
          Use the "Commissary Integration" tab to view available commissary items for your recipes
        </p>
      </div>
    </div>
  );
};
