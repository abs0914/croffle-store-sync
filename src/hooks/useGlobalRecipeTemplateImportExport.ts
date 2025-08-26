import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { globalRecipeTemplateImportExport } from '@/services/recipeTemplates/globalRecipeTemplateImportExport';
import { RecipeTemplate } from '@/services/recipeManagement/types';

export const useGlobalRecipeTemplateImportExport = (templates: RecipeTemplate[], onDataChange?: () => void) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const queryClient = useQueryClient();

  const handleExportCSV = async () => {
    if (templates.length === 0) {
      toast.error('No recipe templates to export');
      return;
    }

    setIsExporting(true);
    try {
      const csvContent = await globalRecipeTemplateImportExport.generateCSV(templates);
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `recipe-templates-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${templates.length} recipe templates`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export recipe templates');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);
      
      try {
        const csvText = await file.text();
        
        toast.loading('Importing recipe templates...');
        
        const importedTemplates = await globalRecipeTemplateImportExport.parseCSV(csvText);
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['recipe-templates'] });
        queryClient.invalidateQueries({ queryKey: ['templates'] });
        
        // Call custom refresh callback if provided
        if (onDataChange) {
          onDataChange();
        }
        
        toast.success(`Successfully imported ${importedTemplates.length} recipe templates`);
        
      } catch (error) {
        console.error('Import error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to import recipe templates');
      } finally {
        setIsImporting(false);
      }
    };
    
    input.click();
  };

  const handleDownloadTemplate = () => {
    try {
      const csvTemplate = globalRecipeTemplateImportExport.generateCSVTemplate();
      
      const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'recipe-template-import-template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Template download error:', error);
      toast.error('Failed to download template');
    }
  };

  return {
    handleExportCSV,
    handleImportCSV,
    handleDownloadTemplate,
    isExporting,
    isImporting
  };
};