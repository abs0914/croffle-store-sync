
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecipeManagementTab } from "@/pages/Admin/components/RecipeManagementTab";
import { RecipeBulkUploadTab } from "./RecipeManagement/components/RecipeBulkUploadTab";
import { RecipeIntegrationTab } from "./RecipeManagement/components/RecipeIntegrationTab";
import { ChefHat, Upload, Link2 } from "lucide-react";

export default function RecipeManagement() {
  const [activeTab, setActiveTab] = useState("recipes");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ChefHat className="h-8 w-8 text-croffle-accent" />
        <div>
          <h1 className="text-3xl font-bold">Recipe Management</h1>
          <p className="text-muted-foreground">
            Create, manage, and deploy recipe templates across your store network
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recipes" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Recipe Templates
          </TabsTrigger>
          <TabsTrigger value="bulk-upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Bulk Upload
          </TabsTrigger>
          <TabsTrigger value="integration" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Commissary Integration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recipes">
          <Card>
            <CardHeader>
              <CardTitle>Recipe Templates</CardTitle>
              <CardDescription>
                Create and manage recipe templates that can be deployed to stores. 
                Templates use commissary inventory items as ingredients.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecipeManagementTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-upload">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Recipe Upload</CardTitle>
              <CardDescription>
                Upload multiple recipe templates at once using CSV or Excel files.
                Streamline the process of adding multiple recipes to your system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecipeBulkUploadTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integration">
          <Card>
            <CardHeader>
              <CardTitle>Commissary Integration</CardTitle>
              <CardDescription>
                Manage how recipes integrate with commissary inventory. 
                View ingredient availability and cost calculations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecipeIntegrationTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
