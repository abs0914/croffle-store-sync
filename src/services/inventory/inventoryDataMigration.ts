import { batchUpdateInventoryFromOrderData } from './unitNormalizationService';

// Your order data from the spreadsheet
export const ORDER_DATA = [
  { item: "REGULAR CROISSANT", orderQuantity: "70pcs.", servingQuantity: 70, uom: "Pieces" },
  { item: "WHIPPED CREAM", orderQuantity: "7 piping bag whipped cream", servingQuantity: 7, uom: "Serving" },
  { item: "WHIPPED CREAM MIX", orderQuantity: "12 Piping Bag", servingQuantity: 12, uom: "Serving" },
  { item: "Nutella", orderQuantity: "Pack of 20", servingQuantity: 20, uom: "Portion" },
  { item: "Chocolate", orderQuantity: "Pack of 20", servingQuantity: 20, uom: "Portion" },
  { item: "Caramel", orderQuantity: "Pack of 20", servingQuantity: 20, uom: "Portion" },
  { item: "Tiramisu", orderQuantity: "Pack of 20", servingQuantity: 20, uom: "Portion" },
  { item: "Dark Chocolate", orderQuantity: "Pack of 20", servingQuantity: 20, uom: "Portion" },
  { item: "Biscoff", orderQuantity: "Pack of 32", servingQuantity: 32, uom: "Portion" },
  { item: "Kitkat", orderQuantity: "Pack of 24", servingQuantity: 24, uom: "Portion" },
  { item: "Oreo Cookies", orderQuantity: "Pack of 27", servingQuantity: 27, uom: "Portion" },
  { item: "Biscoff Crushed", orderQuantity: "Pack of 20", servingQuantity: 20, uom: "Portion" },
  { item: "Oreo Crushed", orderQuantity: "Pack of 20", servingQuantity: 20, uom: "Portion" },
  { item: "Peanut", orderQuantity: "Pack of 20", servingQuantity: 20, uom: "Portion" },
  { item: "Colored Sprinkles", orderQuantity: "Pack of 20", servingQuantity: 20, uom: "Portion" },
  { item: "Choco Flakes", orderQuantity: "Pack of 20", servingQuantity: 20, uom: "Portion" },
  { item: "Marshmallow", orderQuantity: "Pack of 10", servingQuantity: 10, uom: "Portion" },
  { item: "Graham Crushed", orderQuantity: "Pack of 20", servingQuantity: 20, uom: "Portion" },
  { item: "Strawberry Jam", orderQuantity: "Pack of 10", servingQuantity: 10, uom: "Scoop" },
  { item: "Mango Jam", orderQuantity: "Pack of 10", servingQuantity: 10, uom: "Scoop" },
  { item: "Blueberry Jam", orderQuantity: "Pack of 10", servingQuantity: 10, uom: "Scoop" },
  { item: "Matcha crumble", orderQuantity: "Pack of 20", servingQuantity: 20, uom: "Portion" },
  { item: "Chocolate crumble", orderQuantity: "Pack of 20", servingQuantity: 20, uom: "Portion" },
  { item: "Take -out box Open", orderQuantity: "Packs of 25", servingQuantity: 25, uom: "Pieces" },
  { item: "Take -out box w/ cover", orderQuantity: "Packs of 25", servingQuantity: 25, uom: "Pieces" },
  { item: "Mini Take Out Box", orderQuantity: "Packs of 25", servingQuantity: 25, uom: "Pieces" },
  { item: "Overload Cup", orderQuantity: "Pack of 50", servingQuantity: 50, uom: "Pieces" },
  { item: "Chopstick", orderQuantity: "Pack of 100 pcs", servingQuantity: 100, uom: "Pieces" },
  { item: "Popsicle stick", orderQuantity: "Pack of 50pcs", servingQuantity: 50, uom: "Pieces" },
  { item: "Piping bag", orderQuantity: "Pack of 50pcs", servingQuantity: 50, uom: "Pieces" },
  { item: "Mini Spoon", orderQuantity: "Pack of 50pcs", servingQuantity: 50, uom: "Pieces" },
  { item: "Wax Paper", orderQuantity: "Packs of 100pcs", servingQuantity: 100, uom: "Pieces" }
];

/**
 * Migrate inventory data using the order data from your spreadsheet
 */
export async function migrateInventoryData(): Promise<{
  success: boolean;
  updated: number;
  errors: string[];
}> {
  console.log('🚀 Starting inventory data migration...');
  
  try {
    const result = await batchUpdateInventoryFromOrderData(ORDER_DATA);
    
    console.log(`✅ Migration completed: ${result.updated} items updated`);
    if (result.errors.length > 0) {
      console.warn('⚠️ Migration errors:', result.errors);
    }
    
    return {
      success: true,
      updated: result.updated,
      errors: result.errors
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      updated: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Test the enhanced ingredient matching with sample recipe data
 */
export async function testIngredientMatching(storeId?: string): Promise<void> {
  const { findIngredientMatches } = await import('./unitNormalizationService');
  
  const sampleRecipeIngredients = [
    { ingredient_name: "REGULAR CROISSANT", unit: "pieces", quantity: 1 },
    { ingredient_name: "Whipped Cream", unit: "serving", quantity: 1 },
    { ingredient_name: "Nutella", unit: "portion", quantity: 0.5 },
    { ingredient_name: "Chocolate Sauce", unit: "portion", quantity: 0.5 },
    { ingredient_name: "Colored Sprinkle", unit: "portion", quantity: 0.5 }
  ];
  
  console.log('🧪 Testing ingredient matching...');
  console.log('Sample recipe ingredients:', sampleRecipeIngredients);
  
  const matches = await findIngredientMatches(sampleRecipeIngredients, storeId);
  
  console.log('🎯 Match results:');
  matches.forEach(match => {
    console.log(`- ${match.ingredientName}:`);
    if (match.matchedItem) {
      console.log(`  ✅ Matched to: ${match.matchedItem.item || match.matchedItem.name}`);
      console.log(`  📊 Score: ${Math.round(match.matchScore * 100)}%`);
      console.log(`  🔧 Unit match: ${match.unitMatch ? 'Yes' : 'No'}`);
      console.log(`  🔄 Conversion needed: ${match.conversionNeeded ? 'Yes' : 'No'}`);
    } else {
      console.log(`  ❌ No match found`);
    }
  });
}