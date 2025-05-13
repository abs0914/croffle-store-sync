
// Export mock versions of inventory stock services
// These are placeholder implementations until the inventory_stock table is created

import { InventoryStock } from "@/types";
import { toast } from "sonner";

// Mock data for testing UI
const MOCK_INVENTORY_STOCK: InventoryStock[] = [
  {
    id: "mock-item-1",
    store_id: "mock-store-1",
    item: "Coffee Beans",
    unit: "kg",
    stock_quantity: 25,
    cost: 250,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "mock-item-2",
    store_id: "mock-store-1",
    item: "Milk",
    unit: "liter",
    stock_quantity: 10,
    cost: 80,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Mock fetch functions
export const fetchInventoryStock = async (storeId: string): Promise<InventoryStock[]> => {
  console.log("MOCK: Fetching inventory stock for store", storeId);
  // Return mock data with matching store ID
  return MOCK_INVENTORY_STOCK.map(item => ({ ...item, store_id: storeId }));
};

export const fetchInventoryStockItem = async (id: string): Promise<InventoryStock | null> => {
  console.log("MOCK: Fetching inventory stock item", id);
  const item = MOCK_INVENTORY_STOCK.find(item => item.id === id);
  return item ? { ...item } : null;
};

// Mock create function
export const createInventoryStockItem = async (stockItem: Omit<InventoryStock, "id">): Promise<InventoryStock | null> => {
  console.log("MOCK: Creating inventory stock item", stockItem);
  
  const newItem: InventoryStock = {
    ...stockItem,
    id: `mock-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  toast.success("Inventory item created (mock)");
  return newItem;
};

// Mock update function
export const updateInventoryStockItem = async (id: string, updates: Partial<InventoryStock>): Promise<InventoryStock | null> => {
  console.log("MOCK: Updating inventory stock item", id, updates);
  
  const item = MOCK_INVENTORY_STOCK.find(item => item.id === id);
  if (!item) return null;
  
  const updatedItem: InventoryStock = {
    ...item,
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  toast.success("Inventory item updated (mock)");
  return updatedItem;
};

// Mock delete function
export const deleteInventoryStockItem = async (id: string): Promise<boolean> => {
  console.log("MOCK: Deleting inventory stock item", id);
  toast.success("Inventory item deleted (mock)");
  return true;
};

// Mock adjust stock function
export const adjustInventoryStock = async (
  id: string,
  newQuantity: number,
  notes?: string
): Promise<boolean> => {
  console.log("MOCK: Adjusting inventory stock", id, newQuantity, notes);
  toast.success("Inventory stock adjusted (mock)");
  return true;
};

// Mock transfer function
export const transferInventoryStock = async (
  sourceId: string, 
  targetStoreId: string, 
  quantity: number,
  notes?: string
): Promise<boolean> => {
  console.log("MOCK: Transferring inventory stock", sourceId, targetStoreId, quantity, notes);
  toast.success("Stock transferred (mock)");
  return true;
};

// Mock CSV functions
export const parseInventoryStockCSV = async (csvData: string, storeId: string): Promise<any[]> => {
  console.log("MOCK: Parsing inventory stock CSV", storeId);
  toast.success("CSV import processed (mock)");
  return [];
};

export const generateInventoryStockCSV = (stockItems: InventoryStock[]): string => {
  console.log("MOCK: Generating inventory stock CSV");
  return "name,sku,measure,stock_quantity,cost\n" + 
    stockItems.map(item => `"${item.item}","${item.sku || ''}","${item.unit}",${item.stock_quantity},${item.cost || 0}`).join("\n");
};

export const generateInventoryStockImportTemplate = (): string => {
  console.log("MOCK: Generating inventory stock import template");
  return "name,sku,measure,stock_quantity,cost\n" +
    '"Coffee Beans","COFFEE-001","kg",50,250\n' +
    '"Milk","MILK-001","liter",100,80';
};

// Add a notice regarding the mock status
export const inventoryStockTableMissing = true;
