import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { unifiedRecipeImportExport } from "@/services/unifiedRecipe/unifiedRecipeImportExport";
import { UnifiedRecipe } from "@/services/unifiedRecipeService";

export function useUnifiedRecipeImportExport(recipes: UnifiedRecipe[], storeId: string | null) {
  const queryClient = useQueryClient();

  // Export recipes to CSV
  const handleExportCSV = useCallback(async () => {
    if (!recipes.length) {
      toast.error("No recipes to export");
      return;
    }

    try {
      const csvData = unifiedRecipeImportExport.generateCSV(recipes);
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `unified-recipes-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Recipes exported to CSV successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export recipes");
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
            toast.loading("Processing recipe import...", { id: 'recipe-import' });
            
            const importedRecipes = await unifiedRecipeImportExport.parseCSV(csvData, storeId);
            
            toast.dismiss('recipe-import');
            toast.success(`Successfully imported ${importedRecipes.length} recipes`);
            
            // Refresh the recipe list
            queryClient.invalidateQueries({ queryKey: ['unified_recipes', storeId] });
          } catch (error) {
            toast.dismiss('recipe-import');
            console.error("Import error:", error);
            toast.error(`Failed to import recipes: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [storeId, queryClient]);

  // Download CSV template
  const handleDownloadTemplate = useCallback(() => {
    try {
      const csvData = unifiedRecipeImportExport.generateCSVTemplate();
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", "unified-recipe-import-template.csv");
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
    handleImportCSV,
    handleDownloadTemplate
  };
}