import { supabase } from '@/integrations/supabase/client';
import { InventoryItemCategory } from '@/types/inventory';

export interface IngredientMatch {
  ingredient_name: string;
  inventory_item_id: string;
  inventory_item_name: string;
  match_type: 'exact' | 'fuzzy' | 'none';
  confidence: number;
  unit_conversion_needed: boolean;
  from_unit: string;
  to_unit: string;
  conversion_factor: number;
  inventory_category?: InventoryItemCategory;
}

export interface UnitConversion {
  from_unit: string;
  to_unit: string;
  factor: number;
}

// Helper function to determine expected categories for an ingredient
async function getExpectedCategories(ingredientName: string): Promise<InventoryItemCategory[]> {
  try {
    const { data: mappings, error } = await supabase
      .from('ingredient_category_mappings')
      .select('ingredient_pattern, expected_categories')
      .order('priority', { ascending: false });

    if (error) {
      console.warn('Failed to fetch category mappings:', error);
      return []; // Return empty array to search all categories
    }

    const lowerIngredientName = ingredientName.toLowerCase();
    
    for (const mapping of mappings || []) {
      if (lowerIngredientName.includes(mapping.ingredient_pattern.toLowerCase())) {
        return mapping.expected_categories as InventoryItemCategory[];
      }
    }
    
    return []; // No specific category found, search all
  } catch (error) {
    console.warn('Error getting expected categories:', error);
    return [];
  }
}

// Unit conversion mappings
const UNIT_CONVERSIONS: UnitConversion[] = [
  { from_unit: 'pair', to_unit: 'pieces', factor: 2 },
  { from_unit: 'pieces', to_unit: 'pair', factor: 0.5 },
  { from_unit: 'portion', to_unit: 'serving', factor: 1 },
  { from_unit: 'serving', to_unit: 'portion', factor: 1 },
  { from_unit: 'ml', to_unit: 'portion', factor: 0.02 }, // Assuming 50ml per portion
  { from_unit: 'grams', to_unit: 'portion', factor: 0.02 }, // Assuming 50g per portion
];

// Ingredient name standardization mappings
const INGREDIENT_NAME_MAPPINGS: Record<string, string> = {
  'Chocolate Sauce': 'Chocolate Sauce for Coffee',
  'Marshmallow Toppings': 'Marshmallow',
  'Whipped Cream': 'Whipped Cream',
  'Regular Croissant': 'Regular Croissant',
  'Wax Paper': 'Wax Paper',
  'Chopstick': 'Chopstick'
};

/**
 * Enhanced category-aware ingredient matching
 */
export const findInventoryMatch = async (
  ingredientName: string,
  ingredientUnit: string,
  storeId: string
): Promise<IngredientMatch> => {
  try {
    console.log(`🔍 Finding inventory match for: "${ingredientName}" (${ingredientUnit}) in store ${storeId}`);

    // Get expected categories for this ingredient
    const expectedCategories = await getExpectedCategories(ingredientName);
    console.log(`📂 Expected categories for "${ingredientName}":`, expectedCategories);

    // Fetch inventory items - prioritize expected categories first
    let inventoryItems;
    
    if (expectedCategories.length > 0) {
      // First attempt: search within expected categories only
      const { data: categoryItems, error: categoryError } = await supabase
        .from('inventory_stock')
        .select('id, item, unit, stock_quantity, item_category')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .in('item_category', expectedCategories);

      if (categoryError) {
        console.error('Error fetching category-specific inventory:', categoryError);
      } else {
        inventoryItems = categoryItems;
        console.log(`🎯 Found ${inventoryItems?.length || 0} items in expected categories:`, expectedCategories);
      }
    }

    // Fallback: search all categories if no match in expected categories
    if (!inventoryItems || inventoryItems.length === 0) {
      console.log('🔄 No items found in expected categories, searching all categories...');
      const { data: allItems, error } = await supabase
        .from('inventory_stock')
        .select('id, item, unit, stock_quantity, item_category')
        .eq('store_id', storeId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching all inventory:', error);
        return createNoMatchResult(ingredientName, ingredientUnit);
      }
      
      inventoryItems = allItems;
    }

    if (!inventoryItems || inventoryItems.length === 0) {
      console.log('❌ No inventory items found for store');
      return createNoMatchResult(ingredientName, ingredientUnit);
    }

    // 1. Try exact name match first (highest priority)
    const exactMatch = inventoryItems.find(item => 
      item.item.toLowerCase().trim() === ingredientName.toLowerCase().trim()
    );

    if (exactMatch) {
      const unitConversion = findUnitConversion(ingredientUnit, exactMatch.unit);
      console.log(`✅ Exact match found: ${ingredientName} -> ${exactMatch.item} (category: ${exactMatch.item_category})`);
      return {
        ingredient_name: ingredientName,
        inventory_item_id: exactMatch.id,
        inventory_item_name: exactMatch.item,
        match_type: 'exact',
        confidence: 1.0,
        unit_conversion_needed: unitConversion.factor !== 1,
        from_unit: ingredientUnit,
        to_unit: exactMatch.unit,
        conversion_factor: unitConversion.factor,
        inventory_category: exactMatch.item_category as InventoryItemCategory
      };
    }

    // 2. Try standardized name mapping
    const standardizedName = INGREDIENT_NAME_MAPPINGS[ingredientName];
    if (standardizedName) {
      const mappedMatch = inventoryItems.find(item => 
        item.item.toLowerCase().trim() === standardizedName.toLowerCase().trim()
      );

      if (mappedMatch) {
        const unitConversion = findUnitConversion(ingredientUnit, mappedMatch.unit);
        console.log(`✅ Standardized match found: ${ingredientName} -> ${mappedMatch.item} (category: ${mappedMatch.item_category})`);
        return {
          ingredient_name: ingredientName,
          inventory_item_id: mappedMatch.id,
          inventory_item_name: mappedMatch.item,
          match_type: 'exact',
          confidence: 0.95,
          unit_conversion_needed: unitConversion.factor !== 1,
          from_unit: ingredientUnit,
          to_unit: mappedMatch.unit,
          conversion_factor: unitConversion.factor,
          inventory_category: mappedMatch.item_category as InventoryItemCategory
        };
      }
    }

    // 3. Try fuzzy matching (lower priority)
    const fuzzyMatches = inventoryItems
      .map(item => ({
        ...item,
        similarity: calculateSimilarity(ingredientName.toLowerCase(), item.item.toLowerCase())
      }))
      .filter(item => item.similarity > 0.6)
      .sort((a, b) => b.similarity - a.similarity);

    if (fuzzyMatches.length > 0) {
      const bestMatch = fuzzyMatches[0];
      const unitConversion = findUnitConversion(ingredientUnit, bestMatch.unit);
      
      // Require high confidence for fuzzy matches to prevent wrong deductions
      if (bestMatch.similarity > 0.8) {
        console.log(`✅ Fuzzy match found: ${ingredientName} -> ${bestMatch.item} (category: ${bestMatch.item_category}, confidence: ${bestMatch.similarity})`);
        return {
          ingredient_name: ingredientName,
          inventory_item_id: bestMatch.id,
          inventory_item_name: bestMatch.item,
          match_type: 'fuzzy',
          confidence: bestMatch.similarity,
          unit_conversion_needed: unitConversion.factor !== 1,
          from_unit: ingredientUnit,
          to_unit: bestMatch.unit,
          conversion_factor: unitConversion.factor,
          inventory_category: bestMatch.item_category as InventoryItemCategory
        };
      }
    }

    // No match found
    console.log(`❌ No suitable match found for ${ingredientName}`);
    return createNoMatchResult(ingredientName, ingredientUnit);

  } catch (error) {
    console.error('Error finding inventory match:', error);
    return createNoMatchResult(ingredientName, ingredientUnit);
  }
};

/**
 * Helper function to create a no-match result
 */
const createNoMatchResult = (ingredientName: string, ingredientUnit: string): IngredientMatch => {
  return {
    ingredient_name: ingredientName,
    inventory_item_id: '',
    inventory_item_name: '',
    match_type: 'none',
    confidence: 0,
    unit_conversion_needed: false,
    from_unit: ingredientUnit,
    to_unit: '',
    conversion_factor: 1
  };
};

/**
 * Find unit conversion between two units
 */
const findUnitConversion = (fromUnit: string, toUnit: string): UnitConversion => {
  // Normalize case
  const from = fromUnit.toLowerCase().trim();
  const to = toUnit.toLowerCase().trim();

  if (from === to) {
    return { from_unit: fromUnit, to_unit: toUnit, factor: 1 };
  }

  const conversion = UNIT_CONVERSIONS.find(conv => 
    conv.from_unit.toLowerCase() === from && conv.to_unit.toLowerCase() === to
  );

  if (conversion) {
    return conversion;
  }

  // Try reverse conversion
  const reverseConversion = UNIT_CONVERSIONS.find(conv => 
    conv.to_unit.toLowerCase() === from && conv.from_unit.toLowerCase() === to
  );

  if (reverseConversion) {
    return {
      from_unit: fromUnit,
      to_unit: toUnit,
      factor: 1 / reverseConversion.factor
    };
  }

  // No conversion found, assume 1:1
  return { from_unit: fromUnit, to_unit: toUnit, factor: 1 };
};

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,     // deletion
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return (maxLen - matrix[len2][len1]) / maxLen;
};

/**
 * Validate all ingredients for a recipe template
 */
export const validateRecipeIngredients = async (
  templateId: string,
  storeId: string
): Promise<{
  isValid: boolean;
  matches: IngredientMatch[];
  errors: string[];
}> => {
  try {
    // Get recipe template ingredients
    const { data: ingredients, error } = await supabase
      .from('recipe_template_ingredients')
      .select('ingredient_name, unit, quantity')
      .eq('recipe_template_id', templateId);

    if (error || !ingredients) {
      return {
        isValid: false,
        matches: [],
        errors: ['Failed to fetch recipe ingredients']
      };
    }

    const matches: IngredientMatch[] = [];
    const errors: string[] = [];

    for (const ingredient of ingredients) {
      const match = await findInventoryMatch(
        ingredient.ingredient_name,
        ingredient.unit,
        storeId
      );

      matches.push(match);

      if (match.match_type === 'none') {
        errors.push(`No inventory match found for ${ingredient.ingredient_name}`);
      } else if (match.match_type === 'fuzzy' && match.confidence < 0.8) {
        errors.push(`Low confidence match for ${ingredient.ingredient_name} -> ${match.inventory_item_name} (${(match.confidence * 100).toFixed(1)}%)`);
      }
    }

    return {
      isValid: errors.length === 0,
      matches,
      errors
    };

  } catch (error) {
    console.error('Error validating recipe ingredients:', error);
    return {
      isValid: false,
      matches: [],
      errors: ['Validation failed due to system error']
    };
  }
};