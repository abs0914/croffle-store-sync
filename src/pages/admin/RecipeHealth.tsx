import React from 'react';
import { RecipeHealthDashboard } from '@/components/admin/RecipeHealthDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RecipeHealth() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Recipe Health Management</h1>
        <p className="text-muted-foreground">
          Monitor and maintain recipe-template relationships to ensure smooth POS operations
        </p>
      </div>

      <div className="grid gap-6">
        {/* Main Health Dashboard */}
        <RecipeHealthDashboard />

        {/* Documentation Card */}
        <Card>
          <CardHeader>
            <CardTitle>How Recipe Health Works</CardTitle>
            <CardDescription>
              Understanding the recipe system and troubleshooting common issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">System Overview</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong>Products:</strong> Items available for sale in your stores</li>
                <li><strong>Recipes:</strong> Store-specific instructions and ingredient lists</li>
                <li><strong>Templates:</strong> Master recipes that can be deployed to multiple stores</li>
                <li><strong>Inventory:</strong> Stock levels that are deducted when recipes are used</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Common Issues</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong>Missing Recipes:</strong> Products without recipe connections cannot deduct inventory</li>
                <li><strong>Missing Templates:</strong> Recipes without templates cannot be managed centrally</li>
                <li><strong>Orphaned Products:</strong> Products with no matching templates in the system</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Auto-Repair Process</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Links existing recipes to matching templates by name</li>
                <li>Creates missing recipes for products that have matching templates</li>
                <li>Generates basic templates for orphaned products (requires manual ingredient setup)</li>
                <li>Maintains data integrity while preserving existing customizations</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Best Practices</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Run auto-repair regularly to maintain system health</li>
                <li>Review auto-generated templates and add proper ingredients</li>
                <li>Use consistent naming between products and templates</li>
                <li>Monitor the health score and address issues promptly</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}