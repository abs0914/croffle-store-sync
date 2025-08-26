import React from 'react';
import { RecipeManagementTab } from './components/RecipeManagementTab';

export const RecipeManagement: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Recipe Management</h1>
        <p className="text-muted-foreground">Create and manage recipe templates for your stores</p>
      </div>
      
      <RecipeManagementTab />
    </div>
  );
};