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
        
        // Find the product in the catalog for this component
        const { data: componentProduct, error: productError } = await supabase
          .from('product_catalog')
          .select('id, product_name')
          .eq('store_id', comboItem.storeId)
          .eq('is_available', true)
          .ilike('product_name', `%${componentName}%`)
          .limit(1)
          .maybeSingle();

        if (productError) {
          console.error(`❌ COMPONENT LOOKUP ERROR: ${componentName}:`, productError);
          return {
            success: false,
            components: [],
            error: `Failed to lookup component ${componentName}: ${productError.message}`
          };
        }

        if (!componentProduct) {
          console.warn(`⚠️ COMPONENT NOT FOUND: ${componentName} in store ${comboItem.storeId}`);
          
          // Try exact name match as fallback
          const { data: exactMatch } = await supabase
            .from('product_catalog')
            .select('id, product_name')
            .eq('store_id', comboItem.storeId)
            .eq('product_name', componentName)
            .eq('is_available', true)
            .maybeSingle();

          if (!exactMatch) {
            return {
              success: false,
              components: [],
              error: `Component ${componentName} not found in product catalog`
            };
          }
          
          console.log(`✅ EXACT MATCH FOUND: ${componentName}`);
          components.push({
            productId: exactMatch.id,
            productName: exactMatch.product_name,
            quantity: comboItem.quantity,
            storeId: comboItem.storeId,
            isExpanded: true,
            originalComboName: comboItem.productName,
            componentType: i === 0 ? 'base' : 'addon'
          });
        } else {
          console.log(`✅ COMPONENT FOUND: ${componentName} → ${componentProduct.product_name}`);
          components.push({
            productId: componentProduct.id,
            productName: componentProduct.product_name,
            quantity: comboItem.quantity,
            storeId: comboItem.storeId,
            isExpanded: true,
            originalComboName: comboItem.productName,
            componentType: i === 0 ? 'base' : 'addon'
          });
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