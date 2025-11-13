import { CommissaryInventoryItem } from "@/types/commissary";
import { supabase } from "@/integrations/supabase/client";

// Normalize text to remove special characters and accents
const normalizeText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .trim();
};

// Generate CSV from commissary inventory items
export const generateCommissaryInventoryCSV = (items: CommissaryInventoryItem[]): string => {
  const headers = ['name', 'sku', 'category', 'uom', 'unit_cost', 'current_stock', 'minimum_threshold', 'storage_location'];
  const csvRows = [headers.join(',')];
  
  items.forEach(item => {
    const row = [
      `"${normalizeText(item.name).replace(/"/g, '""')}"`,
      `"${(item.sku || '').replace(/"/g, '""')}"`,
      `"${item.business_category || item.category}"`,
      `"${normalizeText(item.uom).replace(/"/g, '""')}"`,
      item.unit_cost || '0',
      item.current_stock,
      item.minimum_threshold || '0',
      `"${(item.storage_location || '').replace(/"/g, '""')}"`
    ];
    
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
};

// Generate commissary inventory import template with all current items
export const generateCommissaryInventoryTemplate = async (): Promise<string> => {
  try {
    // Fetch all active commissary items
    const { data: items, error } = await supabase
      .from('commissary_inventory')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    if (!items || items.length === 0) {
      // Return empty template with example rows if no items exist
      const headers = ['name', 'sku', 'category', 'uom', 'unit_cost', 'current_stock', 'minimum_threshold', 'storage_location'];
      const csvContent = headers.join(',');
      
      const exampleRow1 = [
        '"Regular Croissant"',
        '"CROISS-001"',
        '"Croffle Items"',
        '"1 Box/70pcs"',
        '2100',
        '0',
        '10',
        '"Cold Storage"'
      ].join(',');
      
      const exampleRow2 = [
        '"Nutella"',
        '"NUTEL-001"',
        '"SAUCES"',
        '"Pack of 20"',
        '90',
        '0',
        '5',
        '"Dry Storage"'
      ].join(',');
      
      return `${csvContent}\n${exampleRow1}\n${exampleRow2}`;
    }

    // Map database items to CommissaryInventoryItem type
    const commissaryItems: CommissaryInventoryItem[] = items.map(item => ({
      ...item,
      uom: item.unit || 'units',
      category: item.category as 'raw_materials' | 'packaging_materials' | 'supplies' | 'finished_goods',
      item_type: item.item_type as 'raw_material' | 'supply' | 'orderable_item'
    }));

    // Generate CSV with all current items
    return generateCommissaryInventoryCSV(commissaryItems);
  } catch (error) {
    console.error('Error generating commissary template:', error);
    // Return basic template if fetch fails
    const headers = ['name', 'sku', 'category', 'uom', 'unit_cost', 'current_stock', 'minimum_threshold', 'storage_location'];
    return headers.join(',');
  }
};

// Download CSV file
export const downloadCommissaryInventoryCSV = async () => {
  const csvContent = await generateCommissaryInventoryTemplate();
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `commissary_inventory_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
