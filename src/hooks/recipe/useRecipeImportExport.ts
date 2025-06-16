import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  generateRecipesCSV,
  generateRecipeCSVTemplate,
  generateRecipesJSON,
  parseRecipesCSV,
  parseRecipesJSON
} from "@/services/inventoryManagement/recipeService";
import { Recipe } from "@/types/inventoryManagement";

export function useRecipeImportExport(recipes: Recipe[], storeId: string | null, refetch?: () => void) {
  const queryClient = useQueryClient();

  // Export recipes to CSV
  const handleExportCSV = useCallback(async () => {
    if (!recipes.length) {
      toast.error("No recipes to export");
      return;
    }

    try {
      const csvData = await generateRecipesCSV(recipes);
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `recipes-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Recipes exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export recipes");
    }
  }, [recipes]);

  // Export recipes to JSON
  const handleExportJSON = useCallback(async () => {
    if (!recipes.length) {
      toast.error("No recipes to export");
      return;
    }

    try {
      const jsonData = await generateRecipesJSON(recipes);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `recipes-export-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Recipes exported to JSON successfully");
    } catch (error) {
      console.error("JSON export error:", error);
      toast.error("Failed to export recipes to JSON");
    }
  }, [recipes]);

  // Import recipes from CSV
  const handleImportCSV = useCallback(() => {
    if (!storeId) {
      toast.error("Please select a store first");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e: any) => {
          try {
            const csvData = e.target.result;
            toast.loading("Processing recipe import...");
            
            const importedRecipes = await parseRecipesCSV(csvData, storeId);
            
            toast.dismiss();
            toast.success(`Successfully imported ${importedRecipes.length} recipes`);
            
            // Refresh the recipe list
            queryClient.invalidateQueries({ queryKey: ['recipes', storeId] });
            if (refetch) {
              refetch();
            }
          } catch (error) {
            toast.dismiss();
            console.error("Import error:", error);
            toast.error(`Failed to import recipes: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [storeId, queryClient, refetch]);

  // Import recipes from JSON
  const handleImportJSON = useCallback(() => {
    if (!storeId) {
      toast.error("Please select a store first");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e: any) => {
          try {
            const jsonData = e.target.result;
            toast.loading("Processing JSON recipe import...");
            
            const importedRecipes = await parseRecipesJSON(jsonData, storeId);
            
            toast.dismiss();
            toast.success(`Successfully imported ${importedRecipes.length} recipes from JSON`);
            
            // Refresh the recipe list
            queryClient.invalidateQueries({ queryKey: ['recipes', storeId] });
            if (refetch) {
              refetch();
            }
          } catch (error) {
            toast.dismiss();
            console.error("JSON import error:", error);
            toast.error(`Failed to import recipes from JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [storeId, queryClient, refetch]);

  // Download CSV template
  const handleDownloadTemplate = useCallback(() => {
    try {
      const csvData = generateRecipeCSVTemplate();
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", "recipe-import-template.csv");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Recipe import template downloaded");
    } catch (error) {
      console.error("Template download error:", error);
      toast.error("Failed to download template");
    }
  }, []);

  return {
    handleExportCSV,
    handleExportJSON,
    handleImportCSV,
    handleImportJSON,
    handleDownloadTemplate
  };
}
