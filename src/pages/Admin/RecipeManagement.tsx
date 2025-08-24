import React from 'react';
import { RecipeCompleteness } from "./RecipeCompleteness";
import { RecipeRepairPanel } from "@/components/Admin/RecipeRepairPanel";

export const RecipeManagement: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Recipe Management</h1>
        <p className="text-muted-foreground">Fix incomplete recipe deployments and inventory issues</p>
      </div>
      
      <RecipeRepairPanel />
      
      <RecipeCompleteness />
    </div>
  );
};