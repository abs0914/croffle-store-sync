/**
 * Enhanced Mix & Match Processing Service
 * 
 * Phase 2: Advanced Mix & Match Detection and Recipe Resolution
 * Handles complex name parsing, base product detection, and addon extraction
 */

import { supabase } from '@/integrations/supabase/client';

export interface MixMatchProduct {
  baseName: string;
  baseProductId?: string;
  baseRecipeId?: string;
  baseTemplateId?: string;
  addons: MixMatchAddon[];
  originalName: string;
  productType: 'mix_match' | 'regular';
}

export interface MixMatchAddon {
  name: string;
  category: 'classic_sauce' | 'premium_sauce' | 'classic_topping' | 'premium_topping' | 'biscuits';
  inventoryStockId?: string;
  quantity: number;
  unit: string;
}

export interface MixMatchResolution {
  success: boolean;
  product: MixMatchProduct | null;
  baseIngredients: Array<{
    ingredient_name: string;
    quantity: number;
    unit: string;
    inventory_stock_id?: string;
  }>;
  addonIngredients: Array<{
    ingredient_name: string;
    quantity: number;
    unit: string;
    inventory_stock_id?: string;
  }>;
  errors: string[];
  warnings: string[];
}

/**
 * Enhanced Mix & Match product detection and parsing
 */
export class EnhancedMixMatchProcessor {
  private static readonly BASE_PRODUCTS = [
    'Mini Croffle',
    'Croffle Overload',
    'Regular Croffle',
  ];

  private static readonly ADDON_PATTERNS = {
    sauces: [
      'Chocolate Sauce', 'Caramel Sauce', 'Strawberry Sauce', 'Tiramisu',
      'Nutella', 'Vanilla Sauce', 'Matcha Sauce'
    ],
    toppings: [
      'Marshmallow', 'Choco Flakes', 'Colored Sprinkles', 'Crushed Oreo',
      'Graham Cracker', 'Blueberry', 'Strawberry', 'Banana'
    ],
    biscuits: [
      'Lotus Biscuit', 'Oreo Biscuit', 'Graham Biscuit'
    ]
  };

  /**
   * Detect if a product name represents a Mix & Match item
   */
  static isMixMatchProduct(productName: string): boolean {
    const nameLower = productName.toLowerCase();
    
    // Check for Mix & Match indicators
    if (nameLower.includes('with ') || nameLower.includes(' and ')) {
      return true;
    }

    // Check if it's a known base product with potential addons
    return this.BASE_PRODUCTS.some(baseName => 
      nameLower.includes(baseName.toLowerCase())
    );
  }

  /**
   * Parse Mix & Match product name into base and addons
   */
  static parseMixMatchName(productName: string): MixMatchProduct {
    console.log(`🎯 PARSING MIX & MATCH: "${productName}"`);
    
    const product: MixMatchProduct = {
      baseName: '',
      addons: [],
      originalName: productName,
      productType: this.isMixMatchProduct(productName) ? 'mix_match' : 'regular'
    };

    if (product.productType === 'regular') {
      product.baseName = productName;
      return product;
    }

    // Extract base product name
    let workingName = productName.trim();
    
    // Find matching base product
    const matchedBase = this.BASE_PRODUCTS.find(baseName => 
      workingName.toLowerCase().includes(baseName.toLowerCase())
    );

    if (matchedBase) {
      product.baseName = matchedBase;
      
      // Extract addon part (everything after "with" or similar)
      const addonPart = workingName
        .replace(new RegExp(`^.*?${matchedBase}\\s*`, 'i'), '') // Remove base name
        .replace(/^(with|and)\s+/i, '') // Remove "with" or "and"
        .trim();

      if (addonPart) {
        product.addons = this.parseAddons(addonPart);
      }
    } else {
      // Fallback: treat everything before "with" as base
      const withIndex = workingName.toLowerCase().indexOf(' with ');
      if (withIndex > 0) {
        product.baseName = workingName.substring(0, withIndex).trim();
        const addonPart = workingName.substring(withIndex + 6).trim();
        product.addons = this.parseAddons(addonPart);
      } else {
        product.baseName = workingName;
      }
    }

    console.log(`🎯 PARSED RESULT:`, {
      baseName: product.baseName,
      addons: product.addons.map(a => a.name),
      originalName: product.originalName
    });

    return product;
  }

  /**
   * Parse addon string into individual addon items
   */
  private static parseAddons(addonString: string): MixMatchAddon[] {
    const addons: MixMatchAddon[] = [];
    
    // Split by common delimiters
    const parts = addonString
      .split(/\s+(?:and|with|,)\s+/i)
      .map(part => part.trim())
      .filter(part => part.length > 0);

    for (const part of parts) {
      const addon = this.identifyAddon(part);
      if (addon) {
        addons.push(addon);
      }
    }

    return addons;
  }

  /**
   * Identify and categorize an addon
   */
  private static identifyAddon(addonName: string): MixMatchAddon | null {
    const nameLower = addonName.toLowerCase();

    // Check sauces
    for (const sauce of this.ADDON_PATTERNS.sauces) {
      if (nameLower.includes(sauce.toLowerCase())) {
        return {
          name: sauce,
          category: sauce.includes('Premium') ? 'premium_sauce' : 'classic_sauce',
          quantity: 1,
          unit: 'pieces'
        };
      }
    }

    // Check toppings
    for (const topping of this.ADDON_PATTERNS.toppings) {
      if (nameLower.includes(topping.toLowerCase())) {
        return {
          name: topping,
          category: topping.includes('Premium') ? 'premium_topping' : 'classic_topping',
          quantity: 1,
          unit: 'pieces'
        };
      }
    }

    // Check biscuits
    for (const biscuit of this.ADDON_PATTERNS.biscuits) {
      if (nameLower.includes(biscuit.toLowerCase())) {
        return {
          name: biscuit,
          category: 'biscuits',
          quantity: 1,
          unit: 'pieces'
        };
      }
    }

    // Fallback: treat as generic topping
    return {
      name: addonName,
      category: 'classic_topping',
      quantity: 1,
      unit: 'pieces'
    };
  }

  /**
   * Resolve Mix & Match product to recipe ingredients
   */
  static async resolveMixMatchProduct(
    productName: string,
    storeId: string,
    productId?: string
  ): Promise<MixMatchResolution> {
    console.log(`🔍 RESOLVING MIX & MATCH: "${productName}" for store ${storeId}`);
    
    const result: MixMatchResolution = {
      success: false,
      product: null,
      baseIngredients: [],
      addonIngredients: [],
      errors: [],
      warnings: []
    };

    try {
      // Parse the product name
      const parsedProduct = this.parseMixMatchName(productName);
      result.product = parsedProduct;

      if (parsedProduct.productType === 'regular') {
        result.warnings.push(`Product "${productName}" is not a Mix & Match item`);
        return result;
      }

      // Step 1: Resolve base product recipe
      console.log(`🔍 Resolving base product: "${parsedProduct.baseName}"`);
      
      const baseResolution = await this.resolveBaseProduct(
        parsedProduct.baseName,
        storeId,
        productId
      );

      if (baseResolution.ingredients.length === 0) {
        result.errors.push(`No base recipe found for "${parsedProduct.baseName}"`);
      } else {
        result.baseIngredients = baseResolution.ingredients;
        parsedProduct.baseRecipeId = baseResolution.recipeId;
        parsedProduct.baseTemplateId = baseResolution.templateId;
        console.log(`✅ Found ${result.baseIngredients.length} base ingredients`);
      }

      // Step 2: Resolve addon ingredients
      console.log(`🔍 Resolving ${parsedProduct.addons.length} addons`);
      
      for (const addon of parsedProduct.addons) {
        const addonIngredients = await this.resolveAddonIngredients(addon, storeId);
        result.addonIngredients.push(...addonIngredients);
        console.log(`✅ Resolved addon "${addon.name}" to ${addonIngredients.length} ingredients`);
      }

      result.success = result.baseIngredients.length > 0;
      
      console.log(`🎯 MIX & MATCH RESOLUTION COMPLETE:`, {
        success: result.success,
        baseIngredients: result.baseIngredients.length,
        addonIngredients: result.addonIngredients.length,
        errors: result.errors.length,
        warnings: result.warnings.length
      });

    } catch (error) {
      console.error(`❌ Mix & Match resolution failed:`, error);
      result.errors.push(`Resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Resolve base product to recipe ingredients
   */
  private static async resolveBaseProduct(
    baseName: string,
    storeId: string,
    productId?: string
  ): Promise<{
    ingredients: Array<{
      ingredient_name: string;
      quantity: number;
      unit: string;
      inventory_stock_id?: string;
    }>;
    recipeId?: string;
    templateId?: string;
  }> {
    
    // First try: Use product_id if provided
    if (productId) {
      const { data: catalogData } = await supabase
        .from('product_catalog')
        .select(`
          recipe_id,
          recipes!inner (
            id,
            template_id,
            recipe_ingredients (
              ingredient_name,
              quantity,
              unit,
              inventory_stock_id
            )
          )
        `)
        .eq('id', productId)
        .eq('store_id', storeId)
        .maybeSingle();

      if (catalogData?.recipes?.recipe_ingredients?.length > 0) {
        return {
          ingredients: catalogData.recipes.recipe_ingredients,
          recipeId: catalogData.recipes.id,
          templateId: catalogData.recipes.template_id
        };
      }
    }

    // Second try: Find by base name in product catalog
    const { data: baseProducts } = await supabase
      .from('product_catalog')
      .select(`
        id,
        recipe_id,
        recipes (
          id,
          template_id,
          recipe_ingredients (
            ingredient_name,
            quantity,
            unit,
            inventory_stock_id
          )
        )
      `)
      .eq('store_id', storeId)
      .eq('product_name', baseName)
      .eq('is_available', true);

    const validProduct = baseProducts?.find(p => p.recipes?.recipe_ingredients?.length > 0);
    if (validProduct?.recipes?.recipe_ingredients) {
      return {
        ingredients: validProduct.recipes.recipe_ingredients,
        recipeId: validProduct.recipes.id,
        templateId: validProduct.recipes.template_id
      };
    }

    // Third try: Use base recipe template
    const { data: baseTemplate } = await supabase
      .from('recipe_templates')
      .select(`
        id,
        recipe_template_ingredients (
          ingredient_name,
          quantity,
          unit
        )
      `)
      .eq('name', `${baseName} Base`)
      .eq('is_active', true)
      .maybeSingle();

    if (baseTemplate?.recipe_template_ingredients?.length > 0) {
      // Map inventory for template ingredients
      const ingredientsWithInventory = await Promise.all(
        baseTemplate.recipe_template_ingredients.map(async (ing) => {
          const { data: inventory } = await supabase
            .from('inventory_stock')
            .select('id')
            .eq('store_id', storeId)
            .eq('item', ing.ingredient_name)
            .eq('is_active', true)
            .maybeSingle();

          return {
            ingredient_name: ing.ingredient_name,
            quantity: ing.quantity,
            unit: ing.unit,
            inventory_stock_id: inventory?.id
          };
        })
      );

      return {
        ingredients: ingredientsWithInventory,
        templateId: baseTemplate.id
      };
    }

    // Fourth try: Original recipe template by exact name
    const { data: originalTemplate } = await supabase
      .from('recipe_templates')
      .select(`
        id,
        recipe_template_ingredients (
          ingredient_name,
          quantity,
          unit
        )
      `)
      .eq('name', baseName)
      .eq('is_active', true)
      .maybeSingle();

    if (originalTemplate?.recipe_template_ingredients?.length > 0) {
      const ingredientsWithInventory = await Promise.all(
        originalTemplate.recipe_template_ingredients.map(async (ing) => {
          const { data: inventory } = await supabase
            .from('inventory_stock')
            .select('id')
            .eq('store_id', storeId)
            .eq('item', ing.ingredient_name)
            .eq('is_active', true)
            .maybeSingle();

          return {
            ingredient_name: ing.ingredient_name,
            quantity: ing.quantity,
            unit: ing.unit,
            inventory_stock_id: inventory?.id
          };
        })
      );

      return {
        ingredients: ingredientsWithInventory,
        templateId: originalTemplate.id
      };
    }

    return { ingredients: [] };
  }

  /**
   * Resolve addon ingredients from inventory
   */
  private static async resolveAddonIngredients(
    addon: MixMatchAddon,
    storeId: string
  ): Promise<Array<{
    ingredient_name: string;
    quantity: number;
    unit: string;
    inventory_stock_id?: string;
  }>> {
    
    // Try exact name match first
    const { data: inventory } = await supabase
      .from('inventory_stock')
      .select('id, item')
      .eq('store_id', storeId)
      .eq('item', addon.name)
      .eq('is_active', true)
      .maybeSingle();

    if (inventory) {
      addon.inventoryStockId = inventory.id;
      return [{
        ingredient_name: addon.name,
        quantity: addon.quantity,
        unit: addon.unit,
        inventory_stock_id: inventory.id
      }];
    }

    // Try fuzzy matching
    const { data: fuzzyMatches } = await supabase
      .from('inventory_stock')
      .select('id, item')
      .eq('store_id', storeId)
      .ilike('item', `%${addon.name}%`)
      .eq('is_active', true)
      .limit(1);

    if (fuzzyMatches && fuzzyMatches.length > 0) {
      const match = fuzzyMatches[0];
      addon.inventoryStockId = match.id;
      return [{
        ingredient_name: addon.name,
        quantity: addon.quantity,
        unit: addon.unit,
        inventory_stock_id: match.id
      }];
    }

    // Return without inventory mapping (will be handled by fallback logic)
    return [{
      ingredient_name: addon.name,
      quantity: addon.quantity,
      unit: addon.unit
    }];
  }
}