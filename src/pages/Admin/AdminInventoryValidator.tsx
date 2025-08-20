import React from 'react';
import { CategoryBasedInventoryValidator } from '@/components/Admin/CategoryBasedInventoryValidator';

export default function AdminInventoryValidator() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Inventory Category Validator</h1>
        <p className="text-muted-foreground mt-2">
          Validate that recipe ingredients are properly categorized and match inventory items in expected categories.
        </p>
      </div>
      
      <CategoryBasedInventoryValidator />
    </div>
  );
}