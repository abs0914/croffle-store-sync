
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsersPage from "./Settings/Users";
import CashiersPage from "./Settings/Cashiers";
import ManagersPage from "./Settings/Managers";
import { ThermalPrinterPage } from './Settings/ThermalPrinter';
import { PrinterStatusIndicator } from '@/components/printer/PrinterStatusIndicator';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RawIngredientUpload } from "@/components/uploads/RawIngredientUpload";
import { RecipeUpload } from "@/components/uploads/RecipeUpload";
import { Upload, Package, ChefHat, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("users");
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
        <div className="flex items-center gap-4">
          {user?.role === 'admin' && (
            <Button
              onClick={() => navigate('/admin')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <SettingsIcon className="h-4 w-4" />
              Admin Panel
            </Button>
          )}
          <PrinterStatusIndicator />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="cashiers">Cashiers</TabsTrigger>
          <TabsTrigger value="managers">Managers</TabsTrigger>
          <TabsTrigger value="printer">Thermal Printer</TabsTrigger>
          <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UsersPage />
        </TabsContent>

        <TabsContent value="cashiers" className="space-y-4">
          <CashiersPage />
        </TabsContent>

        <TabsContent value="managers" className="space-y-4">
          <ManagersPage />
        </TabsContent>

        <TabsContent value="printer" className="space-y-4">
          <ThermalPrinterPage />
        </TabsContent>

        <TabsContent value="bulk-upload" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Upload className="h-6 w-6" />
                Bulk Upload
              </h2>
              <p className="text-muted-foreground">
                Upload raw ingredients and recipes in bulk using CSV files
              </p>
            </div>
          </div>

          <Tabs defaultValue="ingredients" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ingredients" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Raw Ingredients
              </TabsTrigger>
              <TabsTrigger value="recipes" className="flex items-center gap-2">
                <ChefHat className="h-4 w-4" />
                Recipes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ingredients">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Raw Ingredients Upload</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload your raw materials, packaging materials, and supplies inventory. 
                      These items will be available for use in recipes and can be managed in the commissary inventory.
                    </p>
                  </CardContent>
                </Card>
                <RawIngredientUpload />
              </div>
            </TabsContent>

            <TabsContent value="recipes">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recipe Upload</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload complete recipes with ingredient lists and costs. 
                      Make sure all ingredients exist in your commissary inventory first.
                    </p>
                  </CardContent>
                </Card>
                <RecipeUpload />
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
