/**
 * Combo Expansion Service
 * 
 * Handles the expansion of combo products into individual components
 * for proper inventory deduction and transaction processing
 */

import { supabase } from "@/integrations/supabase/client";

export interface ComboExpansionItem {
  productId: string;
  productName: string;
  quantity: number;
  storeId: string;
  isExpanded?: boolean;
  originalComboName?: string;
  componentType?: 'base' | 'addon';
}

export interface ComboExpansionResult {
  success: boolean;
  expandedItems: ComboExpansionItem[];
  errors: string[];
  combosProcessed: number;
}

/**
 * Expand combo products in transaction items
 * Detects combos by " + " separator and splits them into components
 */
export class ComboExpansionService {
  
  /**
   * Main expansion method - processes all transaction items
   */
  static async expandComboItems(
    transactionItems: Array<{
      productId: string;
      productName: string;
      quantity: number;
      storeId: string;
    }>
  ): Promise<ComboExpansionResult> {
    console.log(`🔄 COMBO EXPANSION: Processing ${transactionItems.length} transaction items`);
    
    const result: ComboExpansionResult = {
      success: true,
      expandedItems: [],
      errors: [],
      combosProcessed: 0
    };

    try {
      for (const item of transactionItems) {
        // Check if this is a combo product (contains " + ")
        if (this.isComboProduct(item.productName)) {
          console.log(`🎯 COMBO DETECTED: ${item.productName}`);
          result.combosProcessed++;
          
          const expansionResult = await this.expandSingleCombo(item);
          
          if (expansionResult.success) {
            result.expandedItems.push(...expansionResult.components);
            console.log(`✅ COMBO EXPANDED: ${item.productName} → ${expansionResult.components.length} components`);
          } else {
            result.errors.push(`Failed to expand combo ${item.productName}: ${expansionResult.error}`);
            result.success = false;
            
            // Add original item as fallback
            result.expandedItems.push({
              ...item,
              isExpanded: false
            });
          }
        } else {
          // Regular product - add as-is
          result.expandedItems.push({
            ...item,
            isExpanded: false
          });
        }
      }

      console.log(`${result.success ? '✅' : '❌'} COMBO EXPANSION: Completed with ${result.combosProcessed} combos processed, ${result.errors.length} errors`);
      
      return result;

    } catch (error) {
      console.error('❌ COMBO EXPANSION: Unexpected error:', error);
      result.success = false;
      result.errors.push(`Unexpected expansion error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Check if a product name indicates a combo product
   */
  private static isComboProduct(productName: string): boolean {
    // Combo products are identified by the " + " separator
    return productName.includes(' + ');
  }

  /**
   * Expand a single combo product into its components
   */
  private static async expandSingleCombo(
    comboItem: {
      productId: string;
      productName: string;
      quantity: number;
      storeId: string;
    }
  ): Promise<{
    success: boolean;
    components: ComboExpansionItem[];
    error?: string;
  }> {
    try {
      // Split combo name by " + " separator
      const componentNames = comboItem.productName.split(' + ').map(name => name.trim());
      
      console.log(`📋 COMBO COMPONENTS: [${componentNames.join(', ')}]`);
      
      const components: ComboExpansionItem[] = [];
      
      // Process each component
      for (let i = 0; i < componentNames.length; i++) {
        const componentName = componentNames[i];
        
        // Try to resolve the component
        const componentResult = await this.resolveComponent(componentName, comboItem.storeId);
        
        if (componentResult.success && componentResult.components.length > 0) {
          // Add all resolved components (could be multiple for Mix & Match)
          componentResult.components.forEach((comp, idx) => {
            components.push({
              ...comp,
              quantity: comboItem.quantity,
              storeId: comboItem.storeId,
              isExpanded: true,
              originalComboName: comboItem.productName,
              componentType: (i === 0 && idx === 0) ? 'base' : 'addon'
            });
          });
          
          console.log(`✅ COMPONENT RESOLVED: ${componentName} → ${componentResult.components.length} item(s)`);
        } else {
          console.error(`❌ COMPONENT RESOLUTION FAILED: ${componentName}: ${componentResult.error}`);
          return {
            success: false,
            components: [],
            error: componentResult.error || `Component ${componentName} not found in product catalog`
          };
        }
      }

      return {
        success: true,
        components
      };

    } catch (error) {
      console.error('❌ SINGLE COMBO EXPANSION ERROR:', error);
      return {
        success: false,
        components: [],
        error: error instanceof Error ? error.message : 'Unknown expansion error'
      };
    }
  }

  /**
   * Resolve a single component - handles both regular products and Mix & Match patterns
   */
  private static async resolveComponent(
    componentName: string,
    storeId: string
  ): Promise<{
    success: boolean;
    components: Array<{ productId: string; productName: string }>;
    error?: string;
  }> {
    console.log(`🔍 RESOLVING COMPONENT: ${componentName}`);
    
    // Step 1: Try exact product match first
    const exactMatch = await this.findExactProduct(componentName, storeId);
    if (exactMatch) {
      console.log(`✅ EXACT MATCH: ${componentName} → ${exactMatch.product_name}`);
      return {
        success: true,
        components: [{ productId: exactMatch.id, productName: exactMatch.product_name }]
      };
    }

    // Step 2: Try partial product match
    const partialMatch = await this.findPartialProduct(componentName, storeId);
    if (partialMatch) {
      console.log(`✅ PARTIAL MATCH: ${componentName} → ${partialMatch.product_name}`);
      return {
        success: true,
        components: [{ productId: partialMatch.id, productName: partialMatch.product_name }]
      };
    }

    // Step 3: Check if this is a Mix & Match pattern (contains "with" and "and")
    if (componentName.includes(' with ') && componentName.includes(' and ')) {
      console.log(`🎯 MIX & MATCH PATTERN DETECTED: ${componentName}`);
      return await this.resolveMixAndMatchComponent(componentName, storeId);
    }

    // Step 4: Failed to resolve
    return {
      success: false,
      components: [],
      error: `Component ${componentName} not found in product catalog`
    };
  }

  /**
   * Find exact product match
   */
  private static async findExactProduct(productName: string, storeId: string) {
    const { data } = await supabase
      .from('product_catalog')
      .select('id, product_name')
      .eq('store_id', storeId)
      .eq('product_name', productName)
      .eq('is_available', true)
      .maybeSingle();
    
    return data;
  }

  /**
   * Find partial product match
   */
  private static async findPartialProduct(productName: string, storeId: string) {
    const { data } = await supabase
      .from('product_catalog')
      .select('id, product_name')
      .eq('store_id', storeId)
      .eq('is_available', true)
      .ilike('product_name', `%${productName}%`)
      .limit(1)
      .maybeSingle();
    
    return data;
  }

  /**
   * Resolve Mix & Match component (e.g., "Mini Croffle with Marshmallow and Chocolate")
   */
  private static async resolveMixAndMatchComponent(
    componentName: string,
    storeId: string
  ): Promise<{
    success: boolean;
    components: Array<{ productId: string; productName: string }>;
    error?: string;
  }> {
    try {
      // Parse the Mix & Match pattern: "Base with Addon1 and Addon2"
      const parts = componentName.split(' with ');
      if (parts.length !== 2) {
        return {
          success: false,
          components: [],
          error: `Invalid Mix & Match pattern: ${componentName}`
        };
      }

      const baseName = parts[0].trim();
      const addonsString = parts[1].trim();
      
      // Split addons by "and"
      const addonNames = addonsString.split(' and ').map(name => name.trim());
      
      console.log(`📝 PARSED MIX & MATCH: Base="${baseName}", Addons=[${addonNames.join(', ')}]`);
      
      const components: Array<{ productId: string; productName: string }> = [];
      
      // Find base product
      const baseProduct = await this.findExactProduct(baseName, storeId) || 
                         await this.findPartialProduct(baseName, storeId);
      
      if (!baseProduct) {
        return {
          success: false,
          components: [],
          error: `Base product "${baseName}" not found`
        };
      }
      
      components.push({ productId: baseProduct.id, productName: baseProduct.product_name });
      console.log(`✅ BASE FOUND: ${baseName} → ${baseProduct.product_name}`);
      
      // Find each addon
      for (const addonName of addonNames) {
        const addonProduct = await this.findExactProduct(addonName, storeId) || 
                            await this.findPartialProduct(addonName, storeId);
        
        if (!addonProduct) {
          return {
            success: false,
            components: [],
            error: `Addon "${addonName}" not found`
          };
        }
        
        components.push({ productId: addonProduct.id, productName: addonProduct.product_name });
        console.log(`✅ ADDON FOUND: ${addonName} → ${addonProduct.product_name}`);
      }
      
      return {
        success: true,
        components
      };
      
    } catch (error) {
      console.error('❌ MIX & MATCH RESOLUTION ERROR:', error);
      return {
        success: false,
        components: [],
        error: error instanceof Error ? error.message : 'Unknown Mix & Match resolution error'
      };
    }
  }

  /**
   * Validate that all combo components have valid recipes
   */
  static async validateComboComponents(
    expandedItems: ComboExpansionItem[]
  ): Promise<{
    valid: boolean;
    invalidComponents: string[];
    warnings: string[];
  }> {
    const invalidComponents: string[] = [];
    const warnings: string[] = [];

    try {
      for (const item of expandedItems) {
        if (!item.isExpanded) continue; // Skip non-combo items
        
        // Check if component has a valid recipe
        const { data: productWithRecipe, error } = await supabase
          .from('product_catalog')
          .select(`
            product_name,
            recipe_id,
            recipes!recipe_id (
              id,
              name,
              recipe_ingredients (id)
            )
          `)
          .eq('id', item.productId)
          .maybeSingle();

        if (error) {
          warnings.push(`Error checking recipe for ${item.productName}: ${error.message}`);
          continue;
        }

        if (!productWithRecipe?.recipe_id || !productWithRecipe.recipes) {
          invalidComponents.push(item.productName);
          console.warn(`⚠️ COMBO VALIDATION: ${item.productName} has no recipe`);
        } else if (!productWithRecipe.recipes.recipe_ingredients?.length) {
          warnings.push(`${item.productName} recipe has no ingredients`);
          console.warn(`⚠️ COMBO VALIDATION: ${item.productName} recipe has no ingredients`);
        }
      }

      const valid = invalidComponents.length === 0;
      
      console.log(`${valid ? '✅' : '⚠️'} COMBO VALIDATION: ${invalidComponents.length} invalid components, ${warnings.length} warnings`);
      
      return {
        valid,
        invalidComponents,
        warnings
      };

    } catch (error) {
      console.error('❌ COMBO VALIDATION ERROR:', error);
      return {
        valid: false,
        invalidComponents: ['validation-error'],
        warnings: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}