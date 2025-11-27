/**
 * Script to update SM Savemore Tacloban prices
 * Run this once to correct the prices
 */

import { unifiedProductService } from "@/services/product/unifiedProductService";

const priceUpdates = [
  { id: 'e0f1c037-9047-4b04-9822-d863f4c05702', name: 'Biscoff Croffle', price: 125.00 },
  { id: 'd4a44d9a-899a-466f-ab70-a79531a5a37e', name: 'Strawberry Kiss Blended', price: 110.00 },
  { id: '75d0ebe2-ca69-47ac-8d79-4fb989ccda3b', name: 'Strawberry Latte', price: 99.00 },
  { id: '044eed88-66af-42dd-b8b9-9c5a5680d550', name: 'Vanilla Caramel Iced', price: 90.00 },
  { id: 'dea0894c-36f7-41e5-8bdb-de1145f4370b', name: 'Mini Take Out Box', price: 0.00 },
  { id: '90d1d301-4f24-4f12-a407-e96cf257a2ac', name: 'Paper Bag 06', price: 0.00 },
  { id: '85fb1474-7a71-49f4-a33b-ff19e8624eb6', name: 'Paper Bag 20', price: 0.00 },
  { id: '71602c1c-963e-4f08-a36b-3f4e1d09656f', name: 'Sugar Sachet', price: 0.00 },
  { id: '927e5543-6421-48b0-b38b-742ce2a90ab6', name: 'Take out box w cover', price: 0.00 }
];

export const updateSavemorePrices = async () => {
  console.log('🔄 Starting SM Savemore Tacloban price updates...');
  
  const results = [];
  
  for (const update of priceUpdates) {
    try {
      console.log(`Updating ${update.name} to ₱${update.price}...`);
      
      const result = await unifiedProductService.updateProduct(update.id, {
        price: update.price
      });
      
      if (result.success) {
        console.log(`✅ ${update.name}: Updated successfully`);
        results.push({ ...update, success: true });
      } else {
        console.error(`❌ ${update.name}: ${result.error}`);
        results.push({ ...update, success: false, error: result.error });
      }
    } catch (error) {
      console.error(`❌ ${update.name}: ${error}`);
      results.push({ ...update, success: false, error: String(error) });
    }
  }
  
  console.log('\n📊 Update Summary:');
  console.log(`Total: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  
  return results;
};
