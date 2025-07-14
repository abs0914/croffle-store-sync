import { supabase } from "../src/integrations/supabase/client";

async function deployGlazePowderToAllStores() {
  try {
    console.log("🚀 Starting Glaze Powder deployment to all stores...");

    // First, get all active stores
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name')
      .eq('is_active', true);

    if (storesError) {
      throw new Error(`Failed to fetch stores: ${storesError.message}`);
    }

    if (!stores || stores.length === 0) {
      console.log("❌ No active stores found");
      return;
    }

    console.log(`📋 Found ${stores.length} active stores`);

    // Prepare inventory entries for each store
    const inventoryEntries = stores.map(store => ({
      store_id: store.id,
      item: 'Glaze Powder',
      unit: 'g',
      stock_quantity: 20000,
      cost: 8, // Based on the recipe table provided (8 per gram)
      minimum_threshold: 1000,
      is_active: true
    }));

    // Insert inventory entries
    const { data: insertedItems, error: insertError } = await supabase
      .from('inventory_stock')
      .upsert(inventoryEntries, { 
        onConflict: 'store_id,item,unit',
        ignoreDuplicates: false 
      })
      .select();

    if (insertError) {
      throw new Error(`Failed to insert inventory: ${insertError.message}`);
    }

    console.log("✅ Successfully deployed Glaze Powder to all stores:");
    stores.forEach(store => {
      console.log(`   📦 ${store.name}: 20,000g Glaze Powder added`);
    });

    // Create inventory transactions for audit trail
    const transactionEntries = stores.map(store => ({
      store_id: store.id,
      product_id: insertedItems?.find(item => item.store_id === store.id)?.id,
      transaction_type: 'purchase',
      quantity: 20000,
      previous_quantity: 0,
      new_quantity: 20000,
      created_by: '00000000-0000-0000-0000-000000000000', // System user
      notes: 'Bulk deployment of Glaze Powder inventory'
    }));

    const { error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert(transactionEntries);

    if (transactionError) {
      console.warn("⚠️ Failed to create transaction records:", transactionError.message);
    } else {
      console.log("📝 Transaction records created successfully");
    }

    console.log("🎉 Glaze Powder deployment completed successfully!");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

// Run the deployment
deployGlazePowderToAllStores()
  .then(() => {
    console.log("✨ Script execution completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });