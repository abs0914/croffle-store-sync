import { supabase } from '@/integrations/supabase/client';

/**
 * Validates product data before creation/update to prevent duplicates
 */
export class ProductValidationService {
  /**
   * Check if a product with the same name already exists in the store
   */
  static async validateUniqueProduct(
    productName: string,
    storeId: string,
    excludeId?: string
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      let query = supabase
        .from('product_catalog')
        .select('id, product_name')
        .eq('store_id', storeId)
        .eq('is_available', true)
        .ilike('product_name', productName);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        return { isValid: false, error: `Validation error: ${error.message}` };
      }

      if (data) {
        return { 
          isValid: false, 
          error: `Product "${productName}" already exists in this store` 
        };
      }

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Validate product has required recipe association for inventory tracking
   */
  static validateRecipeAssociation(recipeId?: string | null): { isValid: boolean; error?: string } {
    if (!recipeId) {
      return {
        isValid: false,
        error: 'Products must have a recipe association for proper inventory tracking'
      };
    }
    return { isValid: true };
  }

  /**
   * Validate category assignment aligns with combo pricing rules
   */
  static validateCategoryAlignment(
    productName: string,
    categoryName: string
  ): { isValid: boolean; warning?: string } {
    const productLower = productName.toLowerCase();
    const categoryLower = categoryName.toLowerCase();

    // Check for known product-category mismatches
    if (productLower.includes('mini croffle') && !categoryLower.includes('mini croffle')) {
      return {
        isValid: false,
        warning: 'Mini Croffle products should be in "Mini Croffle" category for combo pricing'
      };
    }

    if (productLower.includes('croffle overload') && !categoryLower.includes('premium')) {
      return {
        isValid: false,
        warning: 'Croffle Overload products should be in "Premium" category for combo pricing'
      };
    }

    return { isValid: true };
  }

  /**
   * Complete product validation before creation/update
   */
  static async validateProduct(data: {
    productName: string;
    storeId: string;
    categoryName?: string;
    recipeId?: string | null;
    excludeId?: string;
  }): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check uniqueness
    const uniqueCheck = await this.validateUniqueProduct(
      data.productName,
      data.storeId,
      data.excludeId
    );

    if (!uniqueCheck.isValid && uniqueCheck.error) {
      errors.push(uniqueCheck.error);
    }

    // Check recipe association
    const recipeCheck = this.validateRecipeAssociation(data.recipeId);
    if (!recipeCheck.isValid && recipeCheck.error) {
      warnings.push(recipeCheck.error); // Recipe is warning, not blocking error
    }

    // Check category alignment
    if (data.categoryName) {
      const categoryCheck = this.validateCategoryAlignment(
        data.productName,
        data.categoryName
      );
      if (!categoryCheck.isValid && categoryCheck.warning) {
        warnings.push(categoryCheck.warning);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}