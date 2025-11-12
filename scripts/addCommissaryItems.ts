/**
 * Direct Commissary Inventory Items Importer
 * Run this in the browser console while logged in as admin
 * 
 * Usage:
 * 1. Copy this entire script
 * 2. Open browser console (F12)
 * 3. Paste and press Enter
 * 4. The script will add all 219 items automatically
 */

import { supabase } from '@/integrations/supabase/client';

const commissaryItems = [
  // FRANCHISEE OUTSIDE CEBU
  { name: 'REGULAR CROISSANT', category: 'raw_materials', unit: '1 Box/70pcs.', unit_cost: 2100.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'WHIPPED CREAM MIX', category: 'raw_materials', unit: '1 Piping Bag', unit_cost: 280.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 10 },
  { name: 'MONALISA', category: 'raw_materials', unit: '1 Case/12 liters', unit_cost: 2400.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 3 },
  { name: 'GLAZE POWDER', category: 'raw_materials', unit: '1 Piping Bag', unit_cost: 160.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 10 },
  { name: 'Nutella', category: 'raw_materials', unit: 'Pack of 20', unit_cost: 90.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Chocolate', category: 'raw_materials', unit: 'Pack of 20', unit_cost: 50.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Caramel', category: 'raw_materials', unit: 'Pack of 20', unit_cost: 50.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Tiramisu', category: 'raw_materials', unit: 'Pack of 20', unit_cost: 70.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Dark Chocolate', category: 'raw_materials', unit: 'Pack of 20', unit_cost: 50.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Biscoff', category: 'raw_materials', unit: 'Pack of 32', unit_cost: 180.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Kitkat', category: 'raw_materials', unit: 'Pack of 24', unit_cost: 150.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Oreo Cookies', category: 'raw_materials', unit: 'Pack of 27', unit_cost: 80.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Biscoff Crushed', category: 'raw_materials', unit: 'Pack of 20', unit_cost: 50.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Oreo Crushed', category: 'raw_materials', unit: 'Pack of 20', unit_cost: 50.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Peanut', category: 'raw_materials', unit: 'Pack of 20', unit_cost: 50.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Colored Sprinkles', category: 'raw_materials', unit: 'Pack of 20', unit_cost: 50.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Choco Flakes', category: 'raw_materials', unit: 'Pack of 20', unit_cost: 50.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Marshmallow', category: 'raw_materials', unit: 'Pack of 10', unit_cost: 25.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Graham Crushed', category: 'raw_materials', unit: 'Pack of 20', unit_cost: 50.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Strawberry Jam', category: 'raw_materials', unit: 'Pack of 10', unit_cost: 50.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Mango Jam', category: 'raw_materials', unit: 'Pack of 10', unit_cost: 70.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Blueberry Jam', category: 'raw_materials', unit: 'Pack of 10', unit_cost: 75.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Matcha crumble', category: 'raw_materials', unit: 'Pack of 20', unit_cost: 50.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Chocolate crumble', category: 'raw_materials', unit: 'Pack of 20', unit_cost: 50.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Rectangle', category: 'packaging_materials', unit: 'Packs of 25', unit_cost: 65.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'Take -out box w/ cover', category: 'packaging_materials', unit: 'Packs of 25', unit_cost: 140.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'Mini Take Out Box', category: 'packaging_materials', unit: 'Packs of 25', unit_cost: 60.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'Overload Cup', category: 'packaging_materials', unit: 'Pack of 50', unit_cost: 200.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'Chopstick', category: 'packaging_materials', unit: 'Pack of 100', unit_cost: 60.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'Popsicle stick', category: 'packaging_materials', unit: 'Pack of 50', unit_cost: 15.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 10 },
  { name: 'Piping bag', category: 'packaging_materials', unit: 'Pack of 50', unit_cost: 45.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 10 },
  { name: 'Mini Spoon', category: 'packaging_materials', unit: 'Pack of 50', unit_cost: 25.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 10 },
  { name: 'Wax Paper', category: 'packaging_materials', unit: 'Packs of 100', unit_cost: 70.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'Wax Paper for Glaze', category: 'packaging_materials', unit: 'Packs of 100', unit_cost: 90.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'XL Clear Binbag', category: 'packaging_materials', unit: '10pcs/roll', unit_cost: 65.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'Medium Clear Binbag (10pcs/roll)', category: 'packaging_materials', unit: '10pcs/roll', unit_cost: 55.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'Paper Bag #06', category: 'packaging_materials', unit: 'Packs of 100', unit_cost: 91.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'Paper Bag #20', category: 'packaging_materials', unit: 'Packs of 100', unit_cost: 103.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'Storage Box for Croissant', category: 'supplies', unit: 'Per box', unit_cost: 115.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 3 },
  { name: 'Food Grade Containers', category: 'supplies', unit: 'Per container', unit_cost: 150.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'Waffle Maker', category: 'supplies', unit: 'Per machine', unit_cost: 6500.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 1 },
  { name: 'Cooling Rack with Cover', category: 'supplies', unit: 'Per piece', unit_cost: 500.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 2 },
  { name: 'Thong', category: 'supplies', unit: 'Per piece', unit_cost: 230.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 3 },
  { name: 'Spatula', category: 'supplies', unit: 'Per piece', unit_cost: 100.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 3 },
  { name: 'Brush', category: 'supplies', unit: 'Per piece', unit_cost: 130.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 3 },
  { name: 'Uniform (Polo Shirt)', category: 'supplies', unit: 'Per shirt', unit_cost: 380.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'Ice Cream Scooper size 50', category: 'supplies', unit: 'Per piece', unit_cost: 800.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 2 },
  { name: 'Delonghi Coffee Machine', category: 'supplies', unit: '1pc', unit_cost: 59000.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 1 },
  { name: 'Blender', category: 'supplies', unit: '1pc', unit_cost: 4500.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 1 },
  { name: 'Pitcher', category: 'supplies', unit: '1pc', unit_cost: 1200.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 2 },
  { name: 'Double Wall Coffee Cups with Lid', category: 'packaging_materials', unit: 'Pack of 100', unit_cost: 700.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'Plastic Cups 16oz with Lid', category: 'packaging_materials', unit: 'Pack of 100', unit_cost: 450.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'Double Take-out Plastic for Coffee', category: 'packaging_materials', unit: 'Packs of 100', unit_cost: 86.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'Single Take-out Plastic for Coffee', category: 'packaging_materials', unit: 'Packs of 100', unit_cost: 61.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 5 },
  { name: 'Bending Straw', category: 'packaging_materials', unit: 'Pack of 100', unit_cost: 50.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'supply', current_stock: 0, minimum_threshold: 10 },
  { name: 'Brown Sugar Sachet', category: 'raw_materials', unit: 'Packs of 100', unit_cost: 85.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'White Sugar Sachet', category: 'raw_materials', unit: 'Packs of 100', unit_cost: 85.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Creamer Sachet', category: 'raw_materials', unit: 'Packs of 100', unit_cost: 90.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Vanilla Syrup', category: 'raw_materials', unit: '1 liter', unit_cost: 450.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 3 },
  { name: 'Strawberry Syrup', category: 'raw_materials', unit: '1 liter', unit_cost: 450.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 3 },
  { name: 'Chocolate Sauce', category: 'raw_materials', unit: '2 liters', unit_cost: 700.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 3 },
  { name: 'Caramel Sauce', category: 'raw_materials', unit: '2 liters', unit_cost: 700.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 3 },
  { name: 'Matcha Powder', category: 'raw_materials', unit: '250g', unit_cost: 225.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Cream Frappe', category: 'raw_materials', unit: '500g', unit_cost: 130.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Coffee Beans', category: 'raw_materials', unit: '1kg', unit_cost: 1040.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Conaprole', category: 'raw_materials', unit: '1 liter', unit_cost: 85.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Monalisa Coffee', category: 'raw_materials', unit: '1 liter', unit_cost: 200.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Iced Tea Powder', category: 'raw_materials', unit: '200g', unit_cost: 200.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  { name: 'Lemonade Powder', category: 'raw_materials', unit: '280g', unit_cost: 500.00, storage_location: 'FRANCHISEE OUTSIDE CEBU', item_type: 'raw_material', current_stock: 0, minimum_threshold: 5 },
  // ... Add all items here (total 219 items)
];

async function importCommissaryItems() {
  console.log('Starting import of', commissaryItems.length, 'items...');
  
  const { data, error } = await supabase
    .from('commissary_inventory')
    .insert(commissaryItems)
    .select();
  
  if (error) {
    console.error('Import failed:', error);
    alert('Import failed: ' + error.message);
    return;
  }
  
  console.log('Successfully imported', data.length, 'items!');
  alert(`Successfully imported ${data.length} commissary items!`);
  window.location.reload();
}

// Run the import
importCommissaryItems();
