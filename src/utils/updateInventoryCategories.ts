import { updateInventoryStockItem } from "@/services/inventoryStock";
import { InventoryItemCategory } from "@/types/inventory";

// Items that need category corrections based on the inventory list
const categoryUpdates = [
  // Croissant should be in biscuit category, not base
  { item: "REGULAR CROISSANT", newCategory: "biscuit" as InventoryItemCategory },
  
  // Dark Chocolate used as topping should be premium topping
  { item: "Dark Chocolate", newCategory: "premium_topping" as InventoryItemCategory },
  
  // Tiramisu used as topping should be premium topping  
  { item: "Tiramisu", newCategory: "premium_topping" as InventoryItemCategory },
];

export const updateInventoryCategories = async (inventoryItems: any[]) => {
  const updates = [];
  
  for (const update of categoryUpdates) {
    const item = inventoryItems.find(inv => inv.item === update.item);
    if (item && item.item_category !== update.newCategory) {
      console.log(`Updating ${item.item} from ${item.item_category} to ${update.newCategory}`);
      
      try {
        await updateInventoryStockItem(item.id, {
          item_category: update.newCategory
        });
        updates.push(`${item.item}: ${item.item_category} → ${update.newCategory}`);
      } catch (error) {
        console.error(`Failed to update ${item.item}:`, error);
      }
    }
  }
  
  return updates;
};