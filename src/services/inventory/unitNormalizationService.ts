import { supabase } from '@/integrations/supabase/client';

export interface NormalizedUnit {
  originalUnit: string;
  normalizedUnit: string;
  orderQuantity: number;
  conversionRatio: number;
}

export interface IngredientMatch {
  ingredientName: string;
  matchedItem: any;
  matchScore: number;
  unitMatch: boolean;
  conversionNeeded: boolean;
  conversionRatio?: number;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is perfect match)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return (maxLength - distance) / maxLength;
}

/**
 * Normalize ingredient name by removing common prefixes and standardizing format
 */
export function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove common prefixes
    .replace(/^(regular|mini|small|large|big)\s+/i, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract pack quantity from order descriptions
 */
export function extractPackQuantity(orderDescription: string): number {
  // Handle various pack description formats
  const patterns = [
    /pack(?:s)?\s+of\s+(\d+)/i,
    /(\d+)pcs/i,
    /(\d+)\s+piping\s+bag/i,
    /(\d+)\s+pieces/i,
    /(\d+)pc/i
  ];

  for (const pattern of patterns) {
    const match = orderDescription.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  return 1; // Default to 1 if no quantity found
}

/**
 * Normalize unit names to handle variations
 */
export function normalizeUnitName(unit: string): string {
  const normalized = unit.toLowerCase().trim();
  
  const unitMappings: Record<string, string> = {
    'pieces': 'pieces',
    'piece': 'pieces',
    'pcs': 'pieces',
    'pc': 'pieces',
    'serving': 'serving',
    'servings': 'serving',
    'portion': 'portion',
    'portions': 'portion',
    'scoop': 'scoop',
    'scoops': 'scoop',
    'box': 'box',
    'boxes': 'box',
    'pack': 'pack',
    'packs': 'pack',
    'kg': 'kg',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'g': 'g',
    'gram': 'g',
    'grams': 'g',
    'liter': 'liters',
    'liters': 'liters',
    'l': 'liters',
    'ml': 'ml',
    'milliliter': 'ml',
    'milliliters': 'ml'
  };

  return unitMappings[normalized] || normalized;
}

/**
 * Check if units are compatible for conversion
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const normalized1 = normalizeUnitName(unit1);
  const normalized2 = normalizeUnitName(unit2);
  
  // Same normalized unit
  if (normalized1 === normalized2) return true;
  
  // Weight conversions
  const weightUnits = ['kg', 'g'];
  if (weightUnits.includes(normalized1) && weightUnits.includes(normalized2)) return true;
  
  // Volume conversions  
  const volumeUnits = ['liters', 'ml'];
  if (volumeUnits.includes(normalized1) && volumeUnits.includes(normalized2)) return true;
  
  // Count-based units (generally compatible)
  const countUnits = ['pieces', 'serving', 'portion', 'scoop'];
  if (countUnits.includes(normalized1) && countUnits.includes(normalized2)) return true;
  
  return false;
}

/**
 * Find best matching inventory items for recipe ingredients
 */
export async function findIngredientMatches(
  recipeIngredients: Array<{ ingredient_name: string; unit: string; quantity: number }>,
  storeId?: string
): Promise<IngredientMatch[]> {
  try {
    // Get store inventory
    let storeQuery = supabase
      .from('inventory_stock')
      .select('*')
      .eq('is_active', true);
    
    if (storeId) {
      storeQuery = storeQuery.eq('store_id', storeId);
    }
    
    const { data: storeInventory } = await storeQuery;
    
    // Get commissary inventory
    const { data: commissaryInventory } = await supabase
      .from('commissary_inventory')
      .select('*')
      .eq('is_active', true);
    
    const allInventory = [
      ...(storeInventory || []).map(item => ({ ...item, source: 'store' })),
      ...(commissaryInventory || []).map(item => ({ ...item, source: 'commissary', item: item.name }))
    ];
    
    const matches: IngredientMatch[] = [];
    
    for (const ingredient of recipeIngredients) {
      const normalizedIngredientName = normalizeIngredientName(ingredient.ingredient_name);
      const normalizedIngredientUnit = normalizeUnitName(ingredient.unit);
      
      let bestMatch: any = null;
      let bestScore = 0;
      
      // Find best matching item
      for (const item of allInventory) {
        const itemName = item.source === 'commissary' ? (item as any).name : item.item;
        const normalizedItemName = normalizeIngredientName(itemName);
        const itemUnit = normalizeUnitName(item.unit || item.normalized_unit || '');
        
        // Calculate name similarity
        const nameScore = calculateSimilarity(normalizedIngredientName, normalizedItemName);
        
        // Bonus for exact matches or very close matches
        let finalScore = nameScore;
        if (nameScore > 0.9) finalScore += 0.1;
        if (nameScore === 1) finalScore += 0.2;
        
        // Bonus for unit compatibility
        if (areUnitsCompatible(normalizedIngredientUnit, itemUnit)) {
          finalScore += 0.1;
        }
        
        if (finalScore > bestScore && finalScore > 0.6) {
          bestScore = finalScore;
          bestMatch = item;
        }
      }
      
      if (bestMatch) {
        const itemUnit = normalizeUnitName(bestMatch.unit || bestMatch.normalized_unit || '');
        const unitMatch = normalizedIngredientUnit === itemUnit;
        const conversionNeeded = !unitMatch && areUnitsCompatible(normalizedIngredientUnit, itemUnit);
        
        matches.push({
          ingredientName: ingredient.ingredient_name,
          matchedItem: bestMatch,
          matchScore: bestScore,
          unitMatch,
          conversionNeeded,
          conversionRatio: bestMatch.conversion_ratio || 1
        });
      } else {
        // No match found
        matches.push({
          ingredientName: ingredient.ingredient_name,
          matchedItem: null,
          matchScore: 0,
          unitMatch: false,
          conversionNeeded: false
        });
      }
    }
    
    return matches;
  } catch (error) {
    console.error('Error finding ingredient matches:', error);
    return [];
  }
}

/**
 * Update inventory item with normalized data
 */
export async function updateInventoryNormalization(
  itemId: string,
  orderDescription: string,
  itemType: 'store' | 'commissary'
): Promise<boolean> {
  try {
    const orderQuantity = extractPackQuantity(orderDescription);
    const table = itemType === 'store' ? 'inventory_stock' : 'commissary_inventory';
    
    // Get current item
    const { data: currentItem } = await supabase
      .from(table)
      .select('*')
      .eq('id', itemId)
      .single();
    
    if (!currentItem) return false;
    
    const normalizedUnit = normalizeUnitName(currentItem.unit);
    const conversionRatio = orderQuantity;
    
    // Update with normalized data
    const { error } = await supabase
      .from(table)
      .update({
        order_unit: orderDescription,
        order_quantity: orderQuantity,
        normalized_unit: normalizedUnit,
        conversion_ratio: conversionRatio,
        ...(itemType === 'commissary' && {
          serving_quantity: (currentItem as any).current_stock * conversionRatio
        })
      })
      .eq('id', itemId);
    
    return !error;
  } catch (error) {
    console.error('Error updating inventory normalization:', error);
    return false;
  }
}

/**
 * Batch update inventory with order descriptions from the user's data
 */
export async function batchUpdateInventoryFromOrderData(
  orderData: Array<{
    item: string;
    orderQuantity: string;
    servingQuantity: number;
    uom: string;
  }>
): Promise<{ updated: number; errors: string[] }> {
  let updated = 0;
  const errors: string[] = [];
  
  for (const data of orderData) {
    try {
      // Find matching inventory item
      const { data: storeItems } = await supabase
        .from('inventory_stock')
        .select('id, item, unit')
        .ilike('item', `%${data.item}%`)
        .eq('is_active', true);
      
      const { data: commissaryItems } = await supabase
        .from('commissary_inventory')
        .select('id, name, unit')
        .ilike('name', `%${data.item}%`)
        .eq('is_active', true);
      
      // Update store items
      if (storeItems && storeItems.length > 0) {
        for (const item of storeItems) {
          const success = await updateInventoryNormalization(
            item.id,
            data.orderQuantity,
            'store'
          );
          if (success) updated++;
        }
      }
      
      // Update commissary items
      if (commissaryItems && commissaryItems.length > 0) {
        for (const item of commissaryItems) {
          const success = await updateInventoryNormalization(
            item.id,
            data.orderQuantity,
            'commissary'
          );
          if (success) updated++;
        }
      }
      
      if ((!storeItems || storeItems.length === 0) && (!commissaryItems || commissaryItems.length === 0)) {
        errors.push(`No matching inventory found for: ${data.item}`);
      }
      
    } catch (error) {
      errors.push(`Error updating ${data.item}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return { updated, errors };
}