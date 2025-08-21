import { supabase } from "@/integrations/supabase/client";

/**
 * Intelligent Ingredient Matching Service
 * Handles name variations, unit conversions, and smart ingredient matching
 */
export class IntelligentIngredientMatcher {
  
  // Common ingredient name variations
  private static readonly INGREDIENT_VARIATIONS = {
    'REGULAR CROISSANT': ['croissant', 'regular croissant', 'plain croissant', 'butter croissant'],
    'WHIPPED CREAM': ['whipped cream', 'whip cream', 'cream', 'heavy cream'],
    'BLUEBERRY JAM': ['blueberry jam', 'blueberry', 'jam blueberry', 'blue berry jam'],
    'STRAWBERRY JAM': ['strawberry jam', 'strawberry', 'jam strawberry', 'straw berry jam'],
    'CHOCOLATE SYRUP': ['chocolate syrup', 'choco syrup', 'chocolate sauce', 'cocoa syrup'],
    'CARAMEL SYRUP': ['caramel syrup', 'caramel sauce', 'caramel', 'butterscotch syrup'],
    'NUTELLA': ['nutella', 'hazelnut spread', 'chocolate hazelnut', 'nut spread'],
    'BISCOFF SPREAD': ['biscoff spread', 'biscoff', 'cookie butter', 'speculoos'],
    'OREO COOKIES': ['oreo cookies', 'oreo', 'chocolate cookies', 'sandwich cookies'],
    'KITKAT': ['kitkat', 'kit kat', 'chocolate wafer', 'wafer chocolate'],
    'CHOPSTICK': ['chopstick', 'chopsticks', 'wooden sticks', 'bamboo sticks'],
    'WAX PAPER': ['wax paper', 'parchment paper', 'baking paper', 'food paper']
  };
  
  // Unit conversion mappings
  private static readonly UNIT_CONVERSIONS = {
    'pieces': ['pcs', 'pc', 'piece', 'units', 'unit'],
    'grams': ['g', 'gram', 'gms'],
    'ml': ['milliliter', 'milliliters', 'mL'],
    'liters': ['l', 'liter', 'L'],
    'kg': ['kilogram', 'kilograms', 'kilo'],
    'cups': ['cup', 'c'],
    'tbsp': ['tablespoon', 'tablespoons', 'tbs'],
    'tsp': ['teaspoon', 'teaspoons', 'ts'],
    'ounces': ['oz', 'ounce']
  };
  
  /**
   * Find matching inventory item using intelligent matching
   */
  static async findMatchingInventoryItem(
    ingredientName: string,
    requiredUnit: string,
    storeId: string
  ): Promise<{
    match: any | null;
    confidence: number;
    needsConversion: boolean;
    conversionFactor?: number;
  }> {
    try {
      console.log(`🔍 Finding match for: ${ingredientName} (${requiredUnit})`);
      
      // Get all store inventory items
      const { data: inventoryItems } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true);
      
      if (!inventoryItems) {
        return { match: null, confidence: 0, needsConversion: false };
      }
      
      // Try exact match first
      const exactMatch = inventoryItems.find(item => 
        this.normalizeText(item.item) === this.normalizeText(ingredientName) &&
        this.normalizeUnit(item.unit) === this.normalizeUnit(requiredUnit)
      );
      
      if (exactMatch) {
        console.log(`✅ Exact match found: ${exactMatch.item}`);
        return { match: exactMatch, confidence: 1.0, needsConversion: false };
      }
      
      // Try name variations with exact unit
      const nameVariationMatch = this.findByNameVariation(inventoryItems, ingredientName, requiredUnit);
      if (nameVariationMatch) {
        console.log(`✅ Name variation match: ${nameVariationMatch.item}`);
        return { match: nameVariationMatch, confidence: 0.9, needsConversion: false };
      }
      
      // Try exact name with unit conversion
      const unitConversionMatch = this.findWithUnitConversion(inventoryItems, ingredientName, requiredUnit);
      if (unitConversionMatch) {
        console.log(`✅ Unit conversion match: ${unitConversionMatch.match.item}`);
        return { 
          match: unitConversionMatch.match, 
          confidence: 0.8, 
          needsConversion: true,
          conversionFactor: unitConversionMatch.conversionFactor
        };
      }
      
      // Try fuzzy matching
      const fuzzyMatch = this.findFuzzyMatch(inventoryItems, ingredientName);
      if (fuzzyMatch && fuzzyMatch.confidence > 0.7) {
        console.log(`✅ Fuzzy match: ${fuzzyMatch.match.item} (confidence: ${fuzzyMatch.confidence})`);
        return { 
          match: fuzzyMatch.match, 
          confidence: fuzzyMatch.confidence, 
          needsConversion: false
        };
      }
      
      console.log(`❌ No match found for: ${ingredientName}`);
      return { match: null, confidence: 0, needsConversion: false };
    } catch (error) {
      console.error('❌ Ingredient matching failed:', error);
      return { match: null, confidence: 0, needsConversion: false };
    }
  }
  
  /**
   * Create missing inventory item from commissary data
   */
  static async createFromCommissary(
    ingredientName: string,
    unit: string,
    storeId: string
  ): Promise<{ success: boolean; item?: any; error?: string }> {
    try {
      console.log(`🏭 Creating inventory from commissary: ${ingredientName}`);
      
      // Find matching commissary item
      const commissaryMatch = await this.findCommissaryMatch(ingredientName);
      
      if (!commissaryMatch) {
        return { 
          success: false, 
          error: `No commissary match found for ${ingredientName}` 
        };
      }
      
      // Create store inventory item
      const { data: newItem, error } = await supabase
        .from('inventory_stock')
        .insert({
          store_id: storeId,
          item: ingredientName,
          unit: unit || commissaryMatch.unit,
          stock_quantity: 0,
          cost: commissaryMatch.unit_cost || 0,
          is_active: true,
          minimum_threshold: 10,
          maximum_capacity: 1000
        })
        .select()
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      console.log(`✅ Created inventory item: ${newItem.item}`);
      return { success: true, item: newItem };
    } catch (error) {
      console.error('❌ Failed to create from commissary:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Find commissary item using intelligent matching
   */
  private static async findCommissaryMatch(ingredientName: string): Promise<any> {
    const { data: commissaryItems } = await supabase
      .from('commissary_inventory')
      .select('*')
      .eq('is_active', true);
    
    if (!commissaryItems) return null;
    
    // Try exact match
    const exactMatch = commissaryItems.find(item =>
      this.normalizeText(item.name) === this.normalizeText(ingredientName)
    );
    
    if (exactMatch) return exactMatch;
    
    // Try name variations
    const variationMatch = this.findByNameVariation(commissaryItems, ingredientName);
    if (variationMatch) return variationMatch;
    
    // Try fuzzy match
    const fuzzyMatch = this.findFuzzyMatch(commissaryItems, ingredientName);
    if (fuzzyMatch && fuzzyMatch.confidence > 0.8) {
      return fuzzyMatch.match;
    }
    
    return null;
  }
  
  /**
   * Find item by name variation
   */
  private static findByNameVariation(items: any[], targetName: string, targetUnit?: string): any {
    const normalizedTarget = this.normalizeText(targetName);
    
    // Check if target name has known variations
    for (const [canonical, variations] of Object.entries(this.INGREDIENT_VARIATIONS)) {
      const allVariations = [canonical, ...variations];
      
      if (allVariations.some(v => this.normalizeText(v) === normalizedTarget)) {
        // Found target in variations, now find matching item
        const match = items.find(item => 
          allVariations.some(v => this.normalizeText(v) === this.normalizeText(item.item || item.name)) &&
          (!targetUnit || this.normalizeUnit(item.unit) === this.normalizeUnit(targetUnit))
        );
        
        if (match) return match;
      }
    }
    
    return null;
  }
  
  /**
   * Find item with unit conversion
   */
  private static findWithUnitConversion(items: any[], targetName: string, targetUnit: string): {
    match: any;
    conversionFactor: number;
  } | null {
    const normalizedName = this.normalizeText(targetName);
    const normalizedTargetUnit = this.normalizeUnit(targetUnit);
    
    for (const item of items) {
      if (this.normalizeText(item.item || item.name) === normalizedName) {
        const itemUnit = this.normalizeUnit(item.unit);
        const conversionFactor = this.getConversionFactor(itemUnit, normalizedTargetUnit);
        
        if (conversionFactor !== null) {
          return { match: item, conversionFactor };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Find fuzzy match using similarity scoring
   */
  private static findFuzzyMatch(items: any[], targetName: string): {
    match: any;
    confidence: number;
  } | null {
    const normalizedTarget = this.normalizeText(targetName);
    let bestMatch: any = null;
    let bestScore = 0;
    
    for (const item of items) {
      const itemName = this.normalizeText(item.item || item.name);
      const similarity = this.calculateSimilarity(normalizedTarget, itemName);
      
      if (similarity > bestScore && similarity > 0.6) {
        bestScore = similarity;
        bestMatch = item;
      }
    }
    
    return bestMatch ? { match: bestMatch, confidence: bestScore } : null;
  }
  
  /**
   * Calculate string similarity using Levenshtein distance
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }
    
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength > 0 ? (maxLength - matrix[str2.length][str1.length]) / maxLength : 0;
  }
  
  /**
   * Get conversion factor between units
   */
  private static getConversionFactor(fromUnit: string, toUnit: string): number | null {
    if (fromUnit === toUnit) return 1;
    
    // Simple conversions - extend as needed
    const conversions: Record<string, Record<string, number>> = {
      'grams': { 'kg': 0.001, 'ounces': 0.035274 },
      'kg': { 'grams': 1000, 'ounces': 35.274 },
      'ml': { 'liters': 0.001, 'cups': 0.004227 },
      'liters': { 'ml': 1000, 'cups': 4.227 },
      'pieces': { 'units': 1, 'pcs': 1 },
      'units': { 'pieces': 1, 'pcs': 1 }
    };
    
    return conversions[fromUnit]?.[toUnit] || null;
  }
  
  /**
   * Normalize text for comparison
   */
  private static normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
  }
  
  /**
   * Normalize unit for comparison
   */
  private static normalizeUnit(unit: string): string {
    const normalized = this.normalizeText(unit);
    
    // Find canonical unit
    for (const [canonical, variations] of Object.entries(this.UNIT_CONVERSIONS)) {
      if (variations.includes(normalized) || normalized === canonical) {
        return canonical;
      }
    }
    
    return normalized;
  }
}