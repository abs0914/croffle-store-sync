import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductWithoutTemplate {
  id: string;
  name: string;
  store_id: string;
  product_type: string;
  recipe_id: string | null;
}

interface AvailableTemplate {
  id: string;
  name: string;
  is_active: boolean;
}

interface MatchResult {
  productId: string;
  productName: string;
  templateId: string;
  templateName: string;
  confidence: number;
  storeId: string;
}

interface AutoMatchingResult {
  success: boolean;
  message: string;
  matched: MatchResult[];
  unmatched: ProductWithoutTemplate[];
  totalProcessed: number;
  matchedCount: number;
}

/**
 * Automatic Template Matching Service for Phase 1
 */
export class AutomaticTemplateMatchingService {
  
  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s1 = normalize(str1);
    const s2 = normalize(str2);
    
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    // Levenshtein distance calculation
    const matrix: number[][] = [];
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const maxLength = Math.max(s1.length, s2.length);
    return (maxLength - matrix[s2.length][s1.length]) / maxLength;
  }

  /**
   * Find best template match for a product
   */
  private static findBestMatch(product: ProductWithoutTemplate, templates: AvailableTemplate[]): MatchResult | null {
    let bestMatch: MatchResult | null = null;
    let highestConfidence = 0;

    for (const template of templates) {
      const confidence = this.calculateSimilarity(product.name, template.name);
      
      if (confidence > highestConfidence && confidence >= 0.85) {
        highestConfidence = confidence;
        bestMatch = {
          productId: product.id,
          productName: product.name,
          templateId: template.id,
          templateName: template.name,
          confidence,
          storeId: product.store_id
        };
      }
    }

    return bestMatch;
  }

  /**
   * Get products missing proper recipe template associations
   */
  static async getProductsWithoutTemplates(): Promise<ProductWithoutTemplate[]> {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        store_id,
        product_type,
        recipe_id,
        recipes!left(
          id,
          template_id,
          recipe_templates!left(
            id,
            is_active
          )
        )
      `)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching products without templates:', error);
      throw error;
    }

    // Filter products that don't have proper recipe template associations
    return products?.filter(product => {
      const recipe = (product as any).recipes;
      const template = recipe?.recipe_templates;
      
      // Missing recipe completely OR recipe missing template OR template inactive
      return !recipe || !template || !template.is_active;
    }).map(p => ({
      id: p.id,
      name: p.name,
      store_id: p.store_id,
      product_type: p.product_type || 'direct',
      recipe_id: p.recipe_id
    })) || [];
  }

  /**
   * Get all available active recipe templates
   */
  static async getAvailableTemplates(): Promise<AvailableTemplate[]> {
    const { data: templates, error } = await supabase
      .from('recipe_templates')
      .select('id, name, is_active')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }

    return templates || [];
  }

  /**
   * Apply automatic matching with high confidence threshold
   */
  static async runAutomaticMatching(): Promise<AutoMatchingResult> {
    try {
      // Get products without proper templates
      const products = await this.getProductsWithoutTemplates();
      const templates = await this.getAvailableTemplates();

      if (products.length === 0) {
        return {
          success: true,
          message: 'No products need template matching',
          matched: [],
          unmatched: [],
          totalProcessed: 0,
          matchedCount: 0
        };
      }

      console.log(`🔍 Analyzing ${products.length} products against ${templates.length} templates...`);

      const matches: MatchResult[] = [];
      const unmatched: ProductWithoutTemplate[] = [];

      // Find matches for each product
      for (const product of products) {
        const match = this.findBestMatch(product, templates);
        if (match) {
          matches.push(match);
        } else {
          unmatched.push(product);
        }
      }

      console.log(`📊 Found ${matches.length} high-confidence matches, ${unmatched.length} unmatched`);

      // Apply matches - create recipes and associate them
      let successCount = 0;
      for (const match of matches) {
        try {
          // Create new recipe from template
          const { data: newRecipe, error: recipeError } = await supabase
            .from('recipes')
            .insert({
              name: match.productName,
              store_id: match.storeId,
              template_id: match.templateId,
              is_active: true,
              serving_size: 1,
              total_cost: 0,
              cost_per_serving: 0,
              instructions: `Auto-generated recipe from template: ${match.templateName}`
            })
            .select('id')
            .single();

          if (recipeError) throw recipeError;

          // Update product to link to new recipe
          const { error: productError } = await supabase
            .from('products')
            .update({
              recipe_id: newRecipe.id,
              product_type: 'recipe',
              updated_at: new Date().toISOString()
            })
            .eq('id', match.productId);

          if (productError) throw productError;

          successCount++;
          console.log(`✅ Matched "${match.productName}" with template "${match.templateName}" (${Math.round(match.confidence * 100)}% confidence)`);
        } catch (error) {
          console.error(`❌ Failed to apply match for ${match.productName}:`, error);
        }
      }

      return {
        success: true,
        message: `Automatic matching completed: ${successCount}/${matches.length} matches applied successfully`,
        matched: matches.slice(0, successCount),
        unmatched,
        totalProcessed: products.length,
        matchedCount: successCount
      };

    } catch (error) {
      console.error('Automatic matching failed:', error);
      return {
        success: false,
        message: 'Automatic matching failed',
        matched: [],
        unmatched: [],
        totalProcessed: 0,
        matchedCount: 0
      };
    }
  }

  /**
   * Get manual review candidates - products that need human review
   */
  static async getManualReviewCandidates(): Promise<{
    products: ProductWithoutTemplate[];
    templates: AvailableTemplate[];
    suggestions: Array<{
      product: ProductWithoutTemplate;
      suggestedTemplates: Array<{ template: AvailableTemplate; confidence: number }>;
    }>;
  }> {
    try {
      const products = await this.getProductsWithoutTemplates();
      const templates = await this.getAvailableTemplates();

      // Create suggestions for manual review (lower confidence matches)
      const suggestions = products.map(product => {
        const templateMatches = templates
          .map(template => ({
            template,
            confidence: this.calculateSimilarity(product.name, template.name)
          }))
          .filter(match => match.confidence > 0.3)
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5); // Top 5 suggestions

        return {
          product,
          suggestedTemplates: templateMatches
        };
      });

      return {
        products,
        templates,
        suggestions
      };
    } catch (error) {
      console.error('Error getting manual review candidates:', error);
      throw error;
    }
  }

  /**
   * Manually associate a product with a template
   */
  static async manuallyAssociateTemplate(
    productId: string,
    templateId: string,
    productName: string,
    storeId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Create new recipe from template
      const { data: newRecipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: productName,
          store_id: storeId,
          template_id: templateId,
          is_active: true,
          serving_size: 1,
          total_cost: 0,
          cost_per_serving: 0,
          instructions: `Manually associated recipe from template`
        })
        .select('id')
        .single();

      if (recipeError) throw recipeError;

      // Update product to link to new recipe
      const { error: productError } = await supabase
        .from('products')
        .update({
          recipe_id: newRecipe.id,
          product_type: 'recipe',
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (productError) throw productError;

      return {
        success: true,
        message: 'Template association successful'
      };
    } catch (error) {
      console.error('Manual association failed:', error);
      return {
        success: false,
        message: 'Failed to associate template'
      };
    }
  }
}