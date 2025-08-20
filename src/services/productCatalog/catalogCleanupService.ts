import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CleanupResult {
  deleted: number;
  added: number;
  errors: string[];
}

export const cleanupSugboMercadoCatalog = async (): Promise<CleanupResult> => {
  try {
    // Get Sugbo Mercado store ID
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('name', 'Sugbo Mercado (IT Park, Cebu)')
      .single();

    if (!store) {
      throw new Error('Sugbo Mercado store not found');
    }

    // Get or create Add-on category
    let { data: addOnCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('store_id', store.id)
      .eq('name', 'Add-on')
      .single();

    if (!addOnCategory) {
      // Create Add-on category if it doesn't exist
      const { data: newCategory, error: categoryError } = await supabase
        .from('categories')
        .insert({
          name: 'Add-on',
          description: 'Add-on items for products',
          store_id: store.id,
          is_active: true
        })
        .select()
        .single();

      if (categoryError) {
        throw new Error(`Failed to create Add-on category: ${categoryError.message}`);
      }

      addOnCategory = newCategory;
    }

    // Get current products to identify duplicates to delete
    const { data: products } = await supabase
      .from('product_catalog')
      .select('id, product_name, price')
      .eq('store_id', store.id);

    if (!products) {
      throw new Error('Failed to fetch products');
    }

    // Identify products to delete (shortened versions, keep "Croffle" versions)
    const productsToDelete = products
      .filter(p => [
        'Choco Overload', 'Biscoff', 'Cookies & Cream',
        'Strawberry', 'Blueberry', 'Mango',
        'Choco Nut', 'Choco Marshmallow'
      ].includes(p.product_name))
      .map(p => p.id);

    // Find duplicate add-ons (keep first occurrence of each)
    const addOnDuplicates: { [key: string]: string[] } = {};
    products
      .filter(p => ['Tiramisu', 'Dark Chocolate', 'KitKat', 'Nutella'].includes(p.product_name))
      .forEach(p => {
        if (!addOnDuplicates[p.product_name]) {
          addOnDuplicates[p.product_name] = [];
        }
        addOnDuplicates[p.product_name].push(p.id);
      });

    // Add IDs of duplicate add-ons to delete (keep first, delete rest)
    Object.values(addOnDuplicates).forEach(ids => {
      if (ids.length > 1) {
        productsToDelete.push(...ids.slice(1)); // Keep first, delete rest
      }
    });

    // Products to add (missing add-ons)
    const productsToAdd = [
      {
        product_name: 'Caramel Sauce',
        price: 6.00,
        category_id: addOnCategory.id,
        description: 'Sweet caramel sauce add-on'
      },
      {
        product_name: 'Chocolate Crumbs',
        price: 6.00,
        category_id: addOnCategory.id,
        description: 'Chocolate crumbs add-on'
      }
    ];

    // Call cleanup edge function
    const { data: result, error } = await supabase.functions.invoke('cleanup-store-catalog', {
      body: {
        storeId: store.id,
        productsToDelete,
        productsToAdd
      }
    });

    if (error) {
      throw error;
    }

    const cleanupResult = result as CleanupResult;

    if (cleanupResult.errors.length > 0) {
      toast.error(`Cleanup completed with errors: ${cleanupResult.errors.join(', ')}`);
    } else {
      toast.success(`Cleanup completed! Deleted ${cleanupResult.deleted} duplicates, added ${cleanupResult.added} items`);
    }

    return cleanupResult;

  } catch (error) {
    console.error('Catalog cleanup error:', error);
    toast.error('Failed to cleanup catalog');
    throw error;
  }
};
