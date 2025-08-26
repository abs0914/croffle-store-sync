import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { fetchInventoryStock } from '@/services/inventoryStock';
import { updateInventoryStockItem } from '@/services/inventoryStock';
import { useStore } from '@/contexts/StoreContext';
import { InventoryItemCategory } from '@/types/inventory';

// Items that need category corrections based on the provided list
const categoryCorrections = [
  { itemName: "REGULAR CROISSANT", correctCategory: "biscuit" as InventoryItemCategory },
  { itemName: "Dark Chocolate", correctCategory: "premium_topping" as InventoryItemCategory },
  { itemName: "Tiramisu", correctCategory: "premium_topping" as InventoryItemCategory },
];

export const CategoryUpdateButton: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { currentStore } = useStore();

  const handleUpdateCategories = async () => {
    if (!currentStore?.id) {
      toast.error("Please select a store first");
      return;
    }

    setIsUpdating(true);
    try {
      // Fetch current inventory
      const inventoryItems = await fetchInventoryStock(currentStore.id);
      let updatesCount = 0;

      // Process each correction
      for (const correction of categoryCorrections) {
        const item = inventoryItems.find(inv => inv.item === correction.itemName);
        
        if (item && item.item_category !== correction.correctCategory) {
          try {
            await updateInventoryStockItem(item.id, {
              item_category: correction.correctCategory
            });
            console.log(`Updated ${item.item}: ${item.item_category} → ${correction.correctCategory}`);
            updatesCount++;
          } catch (error) {
            console.error(`Failed to update ${item.item}:`, error);
            toast.error(`Failed to update ${item.item}`);
          }
        }
      }

      if (updatesCount > 0) {
        toast.success(`Successfully updated ${updatesCount} item categories`);
        // Refresh the page or trigger a data refetch
        window.location.reload();
      } else {
        toast.info("All categories are already correct");
      }
    } catch (error) {
      console.error("Error updating categories:", error);
      toast.error("Failed to update categories");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Button
      onClick={handleUpdateCategories}
      disabled={isUpdating}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
      {isUpdating ? 'Updating...' : 'Fix Categories'}
    </Button>
  );
};