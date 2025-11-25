/**
 * Recipe Export Service
 * Exports recipe templates to Excel format for manual review
 */

import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export interface RecipeExportData {
  id: string;
  name: string;
  description?: string;
  category_name?: string;
  version?: number;
  yield_quantity?: number;
  ingredients?: Array<{
    ingredient_name: string;
    quantity: number;
    unit: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Export recipe templates to Excel file
 */
export const exportRecipesToExcel = (recipes: RecipeExportData[]): void => {
  if (!recipes || recipes.length === 0) {
    throw new Error('No recipes to export');
  }

  // Prepare data rows
  const rows: any[] = [];
  
  // Add header row
  rows.push([
    'Recipe Name',
    'Category',
    'Version',
    'Yield',
    'Description',
    'Ingredient Name',
    'Quantity',
    'Unit',
    'Created At',
    'Updated At'
  ]);

  // Add recipe data
  recipes.forEach(recipe => {
    const ingredients = recipe.ingredients || [];
    const baseData = {
      recipeName: recipe.name,
      category: recipe.category_name || 'Uncategorized',
      version: recipe.version || 1,
      yield: recipe.yield_quantity || 1,
      description: recipe.description || '',
      createdAt: recipe.created_at ? format(new Date(recipe.created_at), 'yyyy-MM-dd HH:mm') : '',
      updatedAt: recipe.updated_at ? format(new Date(recipe.updated_at), 'yyyy-MM-dd HH:mm') : ''
    };

    if (ingredients.length === 0) {
      // Recipe with no ingredients
      rows.push([
        baseData.recipeName,
        baseData.category,
        baseData.version,
        baseData.yield,
        baseData.description,
        'No ingredients',
        '',
        '',
        baseData.createdAt,
        baseData.updatedAt
      ]);
    } else {
      // Add a row for each ingredient
      ingredients.forEach((ingredient, index) => {
        rows.push([
          index === 0 ? baseData.recipeName : '', // Only show recipe info on first row
          index === 0 ? baseData.category : '',
          index === 0 ? baseData.version : '',
          index === 0 ? baseData.yield : '',
          index === 0 ? baseData.description : '',
          ingredient.ingredient_name || 'Unknown',
          ingredient.quantity,
          ingredient.unit,
          index === 0 ? baseData.createdAt : '',
          index === 0 ? baseData.updatedAt : ''
        ]);
      });
    }

    // Add empty row between recipes for readability
    rows.push(['', '', '', '', '', '', '', '', '', '']);
  });

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 30 }, // Recipe Name
    { wch: 15 }, // Category
    { wch: 8 },  // Version
    { wch: 8 },  // Yield
    { wch: 40 }, // Description
    { wch: 25 }, // Ingredient Name
    { wch: 10 }, // Quantity
    { wch: 10 }, // Unit
    { wch: 18 }, // Created At
    { wch: 18 }  // Updated At
  ];

  // Style the header row (row 1)
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "4472C4" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  // Apply header styling
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;
    ws[cellAddress].s = headerStyle;
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Recipe Templates');

  // Generate filename with timestamp
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
  const filename = `recipe-templates_${timestamp}.xlsx`;

  // Download file
  XLSX.writeFile(wb, filename);
};

/**
 * Export single recipe to Excel
 */
export const exportSingleRecipe = (recipe: RecipeExportData): void => {
  exportRecipesToExcel([recipe]);
};

/**
 * Generate CSV content from recipes (alternative format)
 */
export const generateRecipeCSV = (recipes: RecipeExportData[]): string => {
  if (!recipes || recipes.length === 0) {
    throw new Error('No recipes to export');
  }

  const headers = [
    'Recipe Name',
    'Category',
    'Version',
    'Yield',
    'Description',
    'Ingredient Name',
    'Quantity',
    'Unit',
    'Created At',
    'Updated At'
  ];

  const rows: string[] = [headers.join(',')];

  recipes.forEach(recipe => {
    const ingredients = recipe.ingredients || [];
    const baseData = {
      recipeName: `"${recipe.name.replace(/"/g, '""')}"`,
      category: `"${(recipe.category_name || 'Uncategorized').replace(/"/g, '""')}"`,
      version: recipe.version || 1,
      yield: recipe.yield_quantity || 1,
      description: `"${(recipe.description || '').replace(/"/g, '""')}"`,
      createdAt: recipe.created_at ? format(new Date(recipe.created_at), 'yyyy-MM-dd HH:mm') : '',
      updatedAt: recipe.updated_at ? format(new Date(recipe.updated_at), 'yyyy-MM-dd HH:mm') : ''
    };

    if (ingredients.length === 0) {
      rows.push([
        baseData.recipeName,
        baseData.category,
        baseData.version,
        baseData.yield,
        baseData.description,
        '"No ingredients"',
        '',
        '',
        baseData.createdAt,
        baseData.updatedAt
      ].join(','));
    } else {
      ingredients.forEach((ingredient, index) => {
        rows.push([
          index === 0 ? baseData.recipeName : '""',
          index === 0 ? baseData.category : '""',
          index === 0 ? baseData.version : '',
          index === 0 ? baseData.yield : '',
          index === 0 ? baseData.description : '""',
          `"${(ingredient.ingredient_name || 'Unknown').replace(/"/g, '""')}"`,
          ingredient.quantity,
          `"${ingredient.unit.replace(/"/g, '""')}"`,
          index === 0 ? baseData.createdAt : '',
          index === 0 ? baseData.updatedAt : ''
        ].join(','));
      });
    }

    // Empty row between recipes
    rows.push('');
  });

  return rows.join('\n');
};

/**
 * Download CSV file
 */
export const downloadRecipeCSV = (recipes: RecipeExportData[]): void => {
  const csv = generateRecipeCSV(recipes);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
  link.setAttribute('href', url);
  link.setAttribute('download', `recipe-templates_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
