
import { InventoryStock } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCategory, parseCategory } from "@/utils/categoryFormatting";

// Parse CSV and import inventory stock items
export const parseInventoryStockCSV = async (csvData: string, storeId: string): Promise<any[]> => {
  const lines = csvData.split('\n');
  const headers = lines[0].split(',').map(header => header.trim());
  
  const stockItems = lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',').map(value => value.trim());
      const stockItem: any = {
        store_id: storeId
      };
      
      headers.forEach((header, i) => {
        // Map 'name' field to 'item' in database
        if (header === 'name') {
          stockItem['item'] = values[i];
        }
        // Map 'measure' field to 'unit' in database
        else if (header === 'measure') {
          stockItem['unit'] = values[i];
        }
        // Map 'category' field to 'item_category' in database
        else if (header === 'category') {
          const parsedCategory = parseCategory(values[i]);
          if (parsedCategory) {
            stockItem['item_category'] = parsedCategory;
          }
        }
        // Convert numeric fields
        else if (header === 'stock_quantity') {
          stockItem[header] = parseInt(values[i], 10);
        }
        else if (header === 'cost') {
          stockItem[header] = parseFloat(values[i]);
        }
        else if (header === 'is_active') {
          stockItem[header] = values[i].toLowerCase() === 'true';
        }
        else {
          stockItem[header] = values[i];
        }
      });
      
      return stockItem;
    });
  
  // Process the imported stock items
  for (const stockItem of stockItems) {
    try {
      // Check if item already exists by name and unit
      const { data: existingItem } = await supabase
        .from('inventory_stock')
        .select('id, stock_quantity')
        .eq('item', stockItem.item)
        .eq('unit', stockItem.unit)
        .eq('store_id', storeId)
        .maybeSingle();
      
      if (existingItem) {
        // Update existing item
        const previousQuantity = existingItem.stock_quantity;
        const newQuantity = previousQuantity + (stockItem.stock_quantity || 0);
        
        await supabase
          .from('inventory_stock')
          .update({ 
            stock_quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id);
        
        // Create inventory transaction record
        await supabase
          .from('inventory_transactions')
          .insert({
            product_id: existingItem.id,
            store_id: storeId,
            transaction_type: 'import',
            quantity: stockItem.stock_quantity,
            previous_quantity: previousQuantity,
            new_quantity: newQuantity,
            created_by: 'system',
            notes: 'CSV Import'
          });
      } else {
        // Create new inventory item
        const { data: newItem, error } = await supabase
          .from('inventory_stock')
          .insert({
            item: stockItem.item,
            unit: stockItem.unit,
            stock_quantity: stockItem.stock_quantity || 0,
            is_active: stockItem.is_active !== undefined ? stockItem.is_active : true,
            store_id: storeId
          })
          .select()
          .single();
        
        if (error) {
          console.error("Error creating inventory stock item:", error);
          continue;
        }
        
        // Create inventory transaction record
        await supabase
          .from('inventory_transactions')
          .insert({
            product_id: newItem.id,
            store_id: storeId,
            transaction_type: 'import',
            quantity: stockItem.stock_quantity || 0,
            previous_quantity: 0,
            new_quantity: stockItem.stock_quantity || 0,
            created_by: 'system',
            notes: 'Initial stock from CSV import'
          });
      }
    } catch (error) {
      console.error("Error processing inventory import:", error);
    }
  }
  
  return stockItems;
};

// Normalize text to remove special characters and accents
const normalizeText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .trim();
};

// Generate CSV from inventory stock items
export const generateInventoryStockCSV = (stockItems: InventoryStock[]): string => {
  const headers = ['name', 'sku', 'measure', 'stock_quantity', 'cost', 'category'];
  const csvRows = [headers.join(',')];
  
  stockItems.forEach(item => {
    const row = [
      `"${normalizeText(item.item).replace(/"/g, '""')}"`,
      `"${(item.sku || '').replace(/"/g, '""')}"`,
      `"${normalizeText(item.unit).replace(/"/g, '""')}"`,
      item.stock_quantity,
      item.cost || '0',
      `"${formatCategory(item.item_category)}"`
    ];
    
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
};

// Generate inventory stock import template
export const generateInventoryStockImportTemplate = (): string => {
  const headers = ['name', 'sku', 'measure', 'stock_quantity', 'cost', 'category'];
  const csvContent = headers.join(',');
  
  const exampleRow1 = [
    '"Coffee Beans"',
    '"COFFEE-001"',
    '"kg"',
    '50',
    '250',
    '"Base Ingredient"'
  ].join(',');
  
  const exampleRow2 = [
    '"Milk"',
    '"MILK-001"',
    '"liter"',
    '100',
    '80',
    '"Base Ingredient"'
  ].join(',');
  
  return `${csvContent}\n${exampleRow1}\n${exampleRow2}`;
};
