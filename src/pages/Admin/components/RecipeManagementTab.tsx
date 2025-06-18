
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChefHat, Database } from "lucide-react";
import { CommissaryItemsReference } from "./CommissaryItemsReference";

export const RecipeManagementTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState("templates");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Recipe Management</h2>
        <p className="text-muted-foreground">
          Manage recipe templates using commissary inventory items
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Recipe Templates
          </TabsTrigger>
          <TabsTrigger value="commissary-reference" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Commissary Reference
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <div className="text-center py-8">
            <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Recipe template management interface coming soon
            </p>
          </div>
        </TabsContent>

        <TabsContent value="commissary-reference">
          <CommissaryItemsReference />
        </TabsContent>
      </Tabs>
    </div>
  );
};
