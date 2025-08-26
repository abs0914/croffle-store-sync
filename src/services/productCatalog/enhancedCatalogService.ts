import { supabase } from "@/integrations/supabase/client";
import { ProductCatalog } from "./types";
import { toast } from "sonner";

export interface EnhancedProductCatalog extends ProductCatalog {
  // Inventory status indicators
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'missing_inventory' | 'direct_product';
  stock_count?: number;
  missing_ingredients?: string[];
  insufficient_ingredients?: string[];
  
  // Recipe template status
  has_recipe_template: boolean;
  template_name?: string;
  template_status?: 'active' | 'inactive' | 'missing';
  
  // POS readiness
  pos_ready: boolean;
  pos_issues?: string[];
  
  // Health indicators
  health_score: number; // 0-100
  health_issues: string[];
}

export interface ProductHealthSummary {
  total_products: number;
  healthy_products: number;
  products_with_issues: number;
  missing_templates: number;
  missing_inventory: number;
  out_of_stock: number;
  pos_ready: number;
}

/**
 * Enhanced Product Catalog Service with inventory integration and health monitoring
 */
export const fetchEnhancedProductCatalog = async (storeId: string): Promise<EnhancedProductCatalog[]> => {
  try {
    console.log('🔍 Fetching enhanced product catalog for store:', storeId);
    
    // Fetch products with recipe template and ingredient information
    const { data: products, error } = await supabase
      .from('product_catalog')
      .select(`
        *,
        recipe:recipes(
          id,
          template_id,
          name,
          is_active,
          template:recipe_templates(
            id,
            name,
            is_active
          )
        ),
        ingredients:product_ingredients(
          *,
          inventory_item:inventory_stock(
            id,
            item,
            unit,
            stock_quantity,
            minimum_threshold,
            is_active
          )
        )
      `)
      .eq('store_id', storeId)
      .order('display_order', { nullsFirst: false });

    if (error) throw error;

    if (!products) return [];

    console.log('📊 Processing', products.length, 'products for enhanced status');

    // Process each product to determine enhanced status
    const enhancedProducts: EnhancedProductCatalog[] = products.map(product => {
      const enhanced: EnhancedProductCatalog = {
        ...product,
        product_status: (product.product_status as any) || 'available',
        stock_status: 'missing_inventory' as const,
        has_recipe_template: false,
        pos_ready: false,
        health_score: 0,
        health_issues: []
      };
      
      // Initialize health tracking
      let healthScore = 100;
      const healthIssues: string[] = [];
      const posIssues: string[] = [];

      // Check recipe template status - Updated logic after recipe linking migration
      const hasRecipe = !!(product.recipe?.id || product.recipe_id);
      const hasTemplate = !!(product.recipe?.template?.id);
      const templateActive = product.recipe?.template?.is_active === true;
      
      enhanced.has_recipe_template = hasTemplate && templateActive;
      enhanced.template_name = product.recipe?.template?.name;
      enhanced.template_status = hasTemplate 
        ? (templateActive ? 'active' : 'inactive')
        : 'missing';

      // Updated health scoring - be more lenient for products with recipe_id
      if (!hasRecipe) {
        healthScore -= 30;
        healthIssues.push('Missing recipe association');
        posIssues.push('No recipe defined');
      } else if (!hasTemplate) {
        // If we have a recipe_id but no template, it's still considered acceptable
        // This happens with our migrated recipes
        console.log(`⚠️ Product ${product.product_name} has recipe but no template - treating as functional`);
        enhanced.has_recipe_template = true; // Consider it functional
        enhanced.template_status = 'active'; // Treat as active for POS purposes
        // Don't penalize health score as heavily
        healthScore -= 5;
        healthIssues.push('Recipe template missing but recipe exists');
      } else if (!templateActive) {
        healthScore -= 10; // Reduced penalty
        healthIssues.push('Recipe template inactive');
        posIssues.push('Recipe template disabled');
      }

      // Check inventory status for recipe-based products
      if (hasRecipe && product.ingredients && product.ingredients.length > 0) {
        const missingIngredients: string[] = [];
        const insufficientIngredients: string[] = [];
        let totalStock = 0;
        let hasStock = false;

        product.ingredients.forEach((ingredient: any) => {
          const inventoryItem = ingredient.inventory_item;
          
          if (!inventoryItem) {
            missingIngredients.push(`${ingredient.unit} (ID: ${ingredient.inventory_stock_id})`);
          } else if (!inventoryItem.is_active) {
            missingIngredients.push(`${inventoryItem.item} (inactive)`);
          } else {
            const currentStock = inventoryItem.stock_quantity || 0;
            const requiredQuantity = ingredient.required_quantity || 1;
            
            totalStock += currentStock;
            hasStock = true;
            
            if (currentStock < requiredQuantity) {
              insufficientIngredients.push(
                `${inventoryItem.item} (need: ${requiredQuantity}, have: ${currentStock})`
              );
            }
          }
        });

        // Determine stock status
        if (missingIngredients.length > 0) {
          enhanced.stock_status = 'missing_inventory';
          healthScore -= 40;
          healthIssues.push(`Missing inventory items: ${missingIngredients.length}`);
          posIssues.push('Inventory mapping incomplete');
        } else if (insufficientIngredients.length > 0) {
          enhanced.stock_status = totalStock === 0 ? 'out_of_stock' : 'low_stock';
          healthScore -= 15;
          healthIssues.push(`Insufficient stock for ${insufficientIngredients.length} ingredients`);
          posIssues.push('Insufficient inventory');
        } else if (hasStock) {
          enhanced.stock_status = 'in_stock';
        } else {
          enhanced.stock_status = 'out_of_stock';
          healthScore -= 10;
          healthIssues.push('No inventory stock available');
        }

        enhanced.stock_count = totalStock;
        enhanced.missing_ingredients = missingIngredients;
        enhanced.insufficient_ingredients = insufficientIngredients;
      } else if (hasRecipe && (!product.ingredients || product.ingredients.length === 0)) {
        // Recipe exists but no ingredients defined
        enhanced.stock_status = 'missing_inventory';
        healthScore -= 35;
        healthIssues.push('Recipe has no ingredients defined');
        posIssues.push('Recipe ingredients not configured');
      } else {
        // Direct product (no recipe needed)
        enhanced.stock_status = 'direct_product';
        enhanced.template_status = 'active'; // Direct products don't need templates
      }

      // Check availability status
      if (!enhanced.is_available) {
        healthScore -= 5;
        healthIssues.push('Product disabled');
        posIssues.push('Product not available');
      }

      // Determine POS readiness
      enhanced.pos_ready = posIssues.length === 0 && enhanced.is_available;
      enhanced.pos_issues = posIssues;
      
      // Finalize health score
      enhanced.health_score = Math.max(0, Math.min(100, healthScore));
      enhanced.health_issues = healthIssues;

      return enhanced;
    });

    console.log('✅ Enhanced product catalog processed successfully');
    return enhancedProducts;

  } catch (error) {
    console.error('❌ Error fetching enhanced product catalog:', error);
    toast.error('Failed to fetch enhanced product catalog');
    return [];
  }
};

/**
 * Get product health summary for dashboard - Updated for post-migration state
 */
export const getProductHealthSummary = async (storeId: string): Promise<ProductHealthSummary> => {
  try {
    const products = await fetchEnhancedProductCatalog(storeId);
    
    // Updated calculation to account for products with recipe_id
    const posReadyProducts = products.filter(p => p.pos_ready || p.recipe_id);
    
    const summary: ProductHealthSummary = {
      total_products: products.length,
      healthy_products: products.filter(p => p.health_score >= 80).length,
      products_with_issues: products.filter(p => p.health_score < 80).length,
      missing_templates: products.filter(p => p.template_status === 'missing' && !p.recipe_id).length, // Don't count products with recipe_id
      missing_inventory: products.filter(p => p.stock_status === 'missing_inventory').length,
      out_of_stock: products.filter(p => p.stock_status === 'out_of_stock').length,
      pos_ready: posReadyProducts.length, // Updated to include products with recipe_id
    };

    console.log('📊 Health Summary Updated:', summary);
    return summary;
  } catch (error) {
    console.error('Error getting product health summary:', error);
    return {
      total_products: 0,
      healthy_products: 0,
      products_with_issues: 0,
      missing_templates: 0,
      missing_inventory: 0,
      out_of_stock: 0,
      pos_ready: 0,
    };
  }
};