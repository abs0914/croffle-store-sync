
import { createCategory } from "@/services/categoryService";
import { toast } from "sonner";

/**
 * Creates default product categories for a new store
 * @param storeId The store ID to create categories for
 * @returns Promise that resolves when all categories are created
 */
export const createDefaultCategories = async (storeId: string): Promise<void> => {
  if (!storeId) {
    toast.error("No store selected");
    return;
  }

  const defaultCategories = [
    { name: "Classic", description: "Traditional croffle variations", is_active: true },
    { name: "Fruity", description: "Fruit-flavored croffle variations", is_active: true },
    { name: "Beverages", description: "Drinks and beverages", is_active: true }
    // "Desserts" category has been removed
  ];

  try {
    // Create each category
    for (const category of defaultCategories) {
      await createCategory({
        ...category,
        store_id: storeId
      });
    }
    
    toast.success("Default product categories created successfully");
  } catch (error) {
    console.error("Error creating default categories:", error);
    toast.error("Failed to create default categories");
  }
};
