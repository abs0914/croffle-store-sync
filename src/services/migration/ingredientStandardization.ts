import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface IngredientStandardizationRule {
  id?: string;
  pattern: string;
  standardName: string;
  standardUnit: string;
  conversionFactor?: number;
  category?: string;
  priority: number;
  isActive: boolean;
}

export interface IngredientSuggestion {
  originalName: string;
  suggestedName: string;
  confidence: number;
  rule?: string;
  occurrences: number;
  stores: string[];
}

export const ingredientStandardization = {
  /**
   * Built-in standardization rules
   */
  getBuiltInRules(): IngredientStandardizationRule[] {
    return [
      // Common ingredient variations
      { pattern: 'chicken.*breast', standardName: 'Chicken Breast', standardUnit: 'kg', priority: 10, isActive: true },
      { pattern: 'chicken.*thigh', standardName: 'Chicken Thigh', standardUnit: 'kg', priority: 10, isActive: true },
      { pattern: 'pork.*shoulder', standardName: 'Pork Shoulder', standardUnit: 'kg', priority: 10, isActive: true },
      { pattern: 'beef.*ground', standardName: 'Ground Beef', standardUnit: 'kg', priority: 10, isActive: true },
      
      // Rice variations
      { pattern: '.*rice.*jasmine', standardName: 'Jasmine Rice', standardUnit: 'kg', priority: 9, isActive: true },
      { pattern: '.*rice.*white', standardName: 'White Rice', standardUnit: 'kg', priority: 9, isActive: true },
      { pattern: '.*rice.*brown', standardName: 'Brown Rice', standardUnit: 'kg', priority: 9, isActive: true },
      
      // Flour variations  
      { pattern: '.*flour.*all.purpose', standardName: 'All Purpose Flour', standardUnit: 'kg', priority: 9, isActive: true },
      { pattern: '.*flour.*bread', standardName: 'Bread Flour', standardUnit: 'kg', priority: 9, isActive: true },
      { pattern: '.*flour.*cake', standardName: 'Cake Flour', standardUnit: 'kg', priority: 9, isActive: true },
      
      // Oil variations
      { pattern: '.*oil.*vegetable', standardName: 'Vegetable Oil', standardUnit: 'liters', priority: 9, isActive: true },
      { pattern: '.*oil.*olive', standardName: 'Olive Oil', standardUnit: 'liters', priority: 9, isActive: true },
      { pattern: '.*oil.*coconut', standardName: 'Coconut Oil', standardUnit: 'liters', priority: 9, isActive: true },
      
      // Sugar variations
      { pattern: '.*sugar.*white', standardName: 'White Sugar', standardUnit: 'kg', priority: 9, isActive: true },
      { pattern: '.*sugar.*brown', standardName: 'Brown Sugar', standardUnit: 'kg', priority: 9, isActive: true },
      { pattern: '.*sugar.*granulated', standardName: 'Granulated Sugar', standardUnit: 'kg', priority: 9, isActive: true },
      
      // Salt variations
      { pattern: '.*salt.*table', standardName: 'Table Salt', standardUnit: 'kg', priority: 9, isActive: true },
      { pattern: '.*salt.*sea', standardName: 'Sea Salt', standardUnit: 'kg', priority: 9, isActive: true },
      { pattern: '.*salt.*rock', standardName: 'Rock Salt', standardUnit: 'kg', priority: 9, isActive: true },
      
      // Milk variations
      { pattern: '.*milk.*whole', standardName: 'Whole Milk', standardUnit: 'liters', priority: 9, isActive: true },
      { pattern: '.*milk.*evaporated', standardName: 'Evaporated Milk', standardUnit: 'ml', priority: 9, isActive: true },
      { pattern: '.*milk.*condensed', standardName: 'Condensed Milk', standardUnit: 'ml', priority: 9, isActive: true },
      
      // Egg variations
      { pattern: '.*egg.*chicken', standardName: 'Chicken Eggs', standardUnit: 'pieces', priority: 10, isActive: true },
      { pattern: '.*egg.*duck', standardName: 'Duck Eggs', standardUnit: 'pieces', priority: 10, isActive: true },
      
      // Butter variations
      { pattern: '.*butter.*unsalted', standardName: 'Unsalted Butter', standardUnit: 'kg', priority: 9, isActive: true },
      { pattern: '.*butter.*salted', standardName: 'Salted Butter', standardUnit: 'kg', priority: 9, isActive: true },
      
      // Cheese variations
      { pattern: '.*cheese.*cheddar', standardName: 'Cheddar Cheese', standardUnit: 'kg', priority: 9, isActive: true },
      { pattern: '.*cheese.*mozzarella', standardName: 'Mozzarella Cheese', standardUnit: 'kg', priority: 9, isActive: true },
      
      // Vegetable variations
      { pattern: '.*onion.*white', standardName: 'White Onion', standardUnit: 'kg', priority: 8, isActive: true },
      { pattern: '.*onion.*red', standardName: 'Red Onion', standardUnit: 'kg', priority: 8, isActive: true },
      { pattern: '.*tomato.*fresh', standardName: 'Fresh Tomatoes', standardUnit: 'kg', priority: 8, isActive: true },
      { pattern: '.*garlic.*fresh', standardName: 'Fresh Garlic', standardUnit: 'kg', priority: 8, isActive: true },
      
      // Spice variations
      { pattern: '.*pepper.*black', standardName: 'Black Pepper', standardUnit: 'g', priority: 8, isActive: true },
      { pattern: '.*pepper.*white', standardName: 'White Pepper', standardUnit: 'g', priority: 8, isActive: true },
      { pattern: '.*cinnamon.*ground', standardName: 'Ground Cinnamon', standardUnit: 'g', priority: 8, isActive: true },
      
      // Generic patterns (lower priority)
      { pattern: '(.+)\\s+(powder|ground)', standardName: '{1} Powder', standardUnit: 'g', priority: 5, isActive: true },
      { pattern: '(.+)\\s+(fresh|raw)', standardName: 'Fresh {1}', standardUnit: 'kg', priority: 5, isActive: true },
      { pattern: '(.+)\\s+(dried|dry)', standardName: 'Dried {1}', standardUnit: 'g', priority: 5, isActive: true }
    ];
  },

  /**
   * Analyze ingredients and suggest standardizations
   */
  async analyzeIngredientStandardization(recipes: any[]): Promise<IngredientSuggestion[]> {
    try {
      const ingredientOccurrences: Record<string, {
        occurrences: number;
        stores: Set<string>;
        originalNames: Set<string>;
      }> = {};

      // Collect all ingredients
      recipes.forEach(recipe => {
        const storeName = recipe.stores?.name || 'Unknown Store';
        
        (recipe.recipe_ingredients || []).forEach((ingredient: any) => {
          const originalName = ingredient.ingredient_name.trim();
          const normalizedName = originalName.toLowerCase();
          
          if (!ingredientOccurrences[normalizedName]) {
            ingredientOccurrences[normalizedName] = {
              occurrences: 0,
              stores: new Set(),
              originalNames: new Set()
            };
          }

          ingredientOccurrences[normalizedName].occurrences++;
          ingredientOccurrences[normalizedName].stores.add(storeName);
          ingredientOccurrences[normalizedName].originalNames.add(originalName);
        });
      });

      const rules = this.getBuiltInRules();
      const suggestions: IngredientSuggestion[] = [];

      // Apply standardization rules
      Object.entries(ingredientOccurrences).forEach(([normalizedName, data]) => {
        const bestMatch = this.findBestMatchingRule(normalizedName, rules);
        
        if (bestMatch) {
          // Get the most common original name variation
          const originalNamesArray = Array.from(data.originalNames);
          const mostCommonOriginal = originalNamesArray.length === 1 
            ? originalNamesArray[0]
            : originalNamesArray.sort((a, b) => a.length - b.length)[0]; // Prefer shorter names

          suggestions.push({
            originalName: mostCommonOriginal,
            suggestedName: bestMatch.standardName,
            confidence: bestMatch.confidence,
            rule: bestMatch.pattern,
            occurrences: data.occurrences,
            stores: Array.from(data.stores)
          });
        }
      });

      // Sort by confidence and occurrences (highest impact first)
      return suggestions.sort((a, b) => {
        if (a.confidence !== b.confidence) {
          return b.confidence - a.confidence;
        }
        return b.occurrences - a.occurrences;
      });

    } catch (error) {
      console.error('Error analyzing ingredient standardization:', error);
      return [];
    }
  },

  /**
   * Find the best matching rule for an ingredient name
   */
  findBestMatchingRule(ingredientName: string, rules: IngredientStandardizationRule[]): {
    standardName: string;
    pattern: string;
    confidence: number;
  } | null {
    const activeRules = rules.filter(rule => rule.isActive);
    
    for (const rule of activeRules.sort((a, b) => b.priority - a.priority)) {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        const match = ingredientName.match(regex);
        
        if (match) {
          let standardName = rule.standardName;
          
          // Handle template replacements like {1}, {2}
          if (match.length > 1 && standardName.includes('{')) {
            for (let i = 1; i < match.length; i++) {
              standardName = standardName.replace(`{${i}}`, match[i]);
            }
          }

          // Calculate confidence based on rule priority and match quality
          const baseConfidence = rule.priority * 10; // Priority 10 = 100% confidence
          const matchQuality = match[0].length / ingredientName.length;
          const confidence = Math.min(100, baseConfidence * matchQuality);

          return {
            standardName,
            pattern: rule.pattern,
            confidence: Math.round(confidence)
          };
        }
      } catch (error) {
        console.warn(`Invalid regex pattern: ${rule.pattern}`, error);
        continue;
      }
    }

    return null;
  },

  /**
   * Apply standardization to a recipe's ingredients
   */
  async standardizeRecipeIngredients(ingredients: any[]): Promise<any[]> {
    const rules = this.getBuiltInRules();
    
    return ingredients.map(ingredient => {
      const match = this.findBestMatchingRule(ingredient.ingredient_name.toLowerCase(), rules);
      
      if (match && match.confidence >= 80) {
        return {
          ...ingredient,
          ingredient_name: match.standardName,
          standardization_applied: true,
          original_name: ingredient.ingredient_name
        };
      }

      return {
        ...ingredient,
        standardization_applied: false
      };
    });
  },

  /**
   * Create custom standardization rule
   */
  async createCustomRule(rule: Omit<IngredientStandardizationRule, 'id'>): Promise<boolean> {
    try {
      // Test the regex pattern
      new RegExp(rule.pattern, 'i');

      // In a real implementation, this would save to the database
      // For now, we'll store in localStorage as a demo
      const existingRules = this.getCustomRules();
      const newRule: IngredientStandardizationRule = {
        ...rule,
        id: `custom_${Date.now()}`
      };

      existingRules.push(newRule);
      localStorage.setItem('custom_ingredient_rules', JSON.stringify(existingRules));

      toast.success('Custom standardization rule created');
      return true;
    } catch (error) {
      console.error('Error creating custom rule:', error);
      toast.error('Invalid regex pattern');
      return false;
    }
  },

  /**
   * Get custom rules from localStorage (demo implementation)
   */
  getCustomRules(): IngredientStandardizationRule[] {
    try {
      const stored = localStorage.getItem('custom_ingredient_rules');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  /**
   * Get all rules (built-in + custom)
   */
  getAllRules(): IngredientStandardizationRule[] {
    return [...this.getBuiltInRules(), ...this.getCustomRules()];
  },

  /**
   * Test standardization rules against sample data
   */
  async testStandardization(sampleIngredients: string[]): Promise<Array<{
    original: string;
    standardized: string | null;
    confidence: number;
    rule?: string;
  }>> {
    const rules = this.getAllRules();
    
    return sampleIngredients.map(ingredient => {
      const match = this.findBestMatchingRule(ingredient.toLowerCase(), rules);
      
      return {
        original: ingredient,
        standardized: match ? match.standardName : null,
        confidence: match ? match.confidence : 0,
        rule: match ? match.pattern : undefined
      };
    });
  }
};