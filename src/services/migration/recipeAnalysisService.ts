import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecipeAnalysisResult {
  totalRecipes: number;
  duplicateGroups: RecipeDuplicateGroup[];
  ingredientAnalysis: IngredientAnalysis;
  storeDistribution: StoreRecipeCount[];
  migrationPlan: MigrationPlan;
}

export interface RecipeDuplicateGroup {
  suggestedTemplateName: string;
  confidence: number; // 0-100% similarity
  recipes: Array<{
    id: string;
    name: string;
    store_id: string;
    store_name: string;
    total_cost: number;
    ingredient_count: number;
    ingredients: string[];
  }>;
  standardizedIngredients: Array<{
    ingredient_name: string;
    average_quantity: number;
    unit: string;
    cost_range: { min: number; max: number };
    stores_using: string[];
  }>;
}

export interface IngredientAnalysis {
  totalUniqueIngredients: number;
  duplicateIngredients: Array<{
    standardName: string;
    variations: string[];
    usageCount: number;
  }>;
  unitMismatches: Array<{
    ingredient: string;
    units: string[];
    stores: string[];
  }>;
}

export interface StoreRecipeCount {
  store_id: string;
  store_name: string;
  recipe_count: number;
  unique_recipes: number;
  duplicate_recipes: number;
}

export interface MigrationPlan {
  estimatedTemplates: number;
  recipeReduction: number; // percentage
  phaseBreakdown: Array<{
    phase: number;
    description: string;
    templates_count: number;
    recipes_affected: number;
    estimated_hours: number;
  }>;
}

export const recipeAnalysisService = {
  /**
   * Perform comprehensive analysis of all legacy recipes
   */
  async analyzeAllRecipes(): Promise<RecipeAnalysisResult> {
    try {
      console.log('🔍 Starting comprehensive recipe analysis...');

      // Fetch all legacy recipes with ingredients
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select(`
          *,
          stores!inner (
            id,
            name
          ),
          recipe_ingredients (
            ingredient_name,
            quantity,
            unit,
            cost_per_unit
          )
        `)
        .eq('is_active', true);

      if (error) throw error;

      console.log(`📊 Analyzing ${recipes?.length || 0} recipes...`);

      const totalRecipes = recipes?.length || 0;
      
      // Analyze duplicates and create groups
      const duplicateGroups = await this.identifyDuplicateRecipes(recipes || []);
      
      // Analyze ingredients
      const ingredientAnalysis = await this.analyzeIngredients(recipes || []);
      
      // Calculate store distribution
      const storeDistribution = await this.calculateStoreDistribution(recipes || []);
      
      // Generate migration plan
      const migrationPlan = await this.generateMigrationPlan(duplicateGroups, totalRecipes);

      const result: RecipeAnalysisResult = {
        totalRecipes,
        duplicateGroups,
        ingredientAnalysis,
        storeDistribution,
        migrationPlan
      };

      console.log('✅ Recipe analysis complete:', {
        totalRecipes: result.totalRecipes,
        duplicateGroups: result.duplicateGroups.length,
        estimatedTemplates: result.migrationPlan.estimatedTemplates
      });

      return result;
    } catch (error) {
      console.error('❌ Error analyzing recipes:', error);
      toast.error('Failed to analyze recipes');
      throw error;
    }
  },

  /**
   * Identify recipes that are duplicates or very similar
   */
  async identifyDuplicateRecipes(recipes: any[]): Promise<RecipeDuplicateGroup[]> {
    const groups: RecipeDuplicateGroup[] = [];
    const processed = new Set<string>();

    for (const recipe of recipes) {
      if (processed.has(recipe.id)) continue;

      const similarRecipes = [recipe];
      processed.add(recipe.id);

      // Find similar recipes
      for (const otherRecipe of recipes) {
        if (processed.has(otherRecipe.id)) continue;

        const similarity = this.calculateRecipeSimilarity(recipe, otherRecipe);
        if (similarity >= 70) { // 70% similarity threshold
          similarRecipes.push(otherRecipe);
          processed.add(otherRecipe.id);
        }
      }

      if (similarRecipes.length > 1) {
        // Create duplicate group
        const group = await this.createDuplicateGroup(similarRecipes);
        groups.push(group);
      }
    }

    // Sort by number of duplicates (most impactful first)
    return groups.sort((a, b) => b.recipes.length - a.recipes.length);
  },

  /**
   * Calculate similarity between two recipes
   */
  calculateRecipeSimilarity(recipe1: any, recipe2: any): number {
    // Name similarity (40% weight)
    const nameSimilarity = this.calculateStringSimilarity(
      recipe1.name.toLowerCase(),
      recipe2.name.toLowerCase()
    );

    // Ingredient similarity (60% weight)
    const ingredients1 = (recipe1.recipe_ingredients || []).map((ing: any) => 
      ing.ingredient_name.toLowerCase()
    );
    const ingredients2 = (recipe2.recipe_ingredients || []).map((ing: any) => 
      ing.ingredient_name.toLowerCase()
    );

    const ingredientSimilarity = this.calculateArraySimilarity(ingredients1, ingredients2);

    return (nameSimilarity * 0.4) + (ingredientSimilarity * 0.6);
  },

  /**
   * Calculate string similarity using Levenshtein distance
   */
  calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 100;

    const distance = this.levenshteinDistance(longer, shorter);
    return ((longer.length - distance) / longer.length) * 100;
  },

  /**
   * Calculate similarity between two arrays
   */
  calculateArraySimilarity(arr1: string[], arr2: string[]): number {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size === 0 ? 0 : (intersection.size / union.size) * 100;
  },

  /**
   * Levenshtein distance calculation
   */
  levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  },

  /**
   * Create a duplicate group from similar recipes
   */
  async createDuplicateGroup(recipes: any[]): Promise<RecipeDuplicateGroup> {
    // Generate suggested template name (most common name or shortest)
    const nameFreq: Record<string, number> = {};
    recipes.forEach(recipe => {
      const cleanName = recipe.name.trim();
      nameFreq[cleanName] = (nameFreq[cleanName] || 0) + 1;
    });

    const suggestedTemplateName = Object.entries(nameFreq)
      .sort(([,a], [,b]) => b - a) // Sort by frequency
      .sort(([a], [b]) => a.length - b.length) // Then by length
      [0][0];

    // Calculate average confidence
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < recipes.length; i++) {
      for (let j = i + 1; j < recipes.length; j++) {
        totalSimilarity += this.calculateRecipeSimilarity(recipes[i], recipes[j]);
        comparisons++;
      }
    }

    const confidence = comparisons > 0 ? totalSimilarity / comparisons : 0;

    // Standardize ingredients across recipes
    const standardizedIngredients = this.standardizeGroupIngredients(recipes);

    return {
      suggestedTemplateName,
      confidence: Math.round(confidence),
      recipes: recipes.map(recipe => ({
        id: recipe.id,
        name: recipe.name,
        store_id: recipe.store_id,
        store_name: recipe.stores?.name || 'Unknown Store',
        total_cost: recipe.total_cost || 0,
        ingredient_count: recipe.recipe_ingredients?.length || 0,
        ingredients: (recipe.recipe_ingredients || []).map((ing: any) => ing.ingredient_name)
      })),
      standardizedIngredients
    };
  },

  /**
   * Standardize ingredients across a group of recipes
   */
  standardizeGroupIngredients(recipes: any[]): Array<{
    ingredient_name: string;
    average_quantity: number;
    unit: string;
    cost_range: { min: number; max: number };
    stores_using: string[];
  }> {
    const ingredientMap: Record<string, any> = {};

    recipes.forEach(recipe => {
      const storeName = recipe.stores?.name || 'Unknown';
      
      (recipe.recipe_ingredients || []).forEach((ingredient: any) => {
        const key = ingredient.ingredient_name.toLowerCase();
        
        if (!ingredientMap[key]) {
          ingredientMap[key] = {
            ingredient_name: ingredient.ingredient_name,
            quantities: [],
            units: new Set(),
            costs: [],
            stores: new Set()
          };
        }

        ingredientMap[key].quantities.push(ingredient.quantity);
        ingredientMap[key].units.add(ingredient.unit);
        ingredientMap[key].costs.push(ingredient.cost_per_unit);
        ingredientMap[key].stores.add(storeName);
      });
    });

    return Object.values(ingredientMap).map((data: any) => ({
      ingredient_name: data.ingredient_name as string,
      average_quantity: data.quantities.reduce((a: number, b: number) => a + b, 0) / data.quantities.length,
      unit: (Array.from(data.units)[0] as string) || 'pieces', // Use most common unit with fallback
      cost_range: {
        min: Math.min(...data.costs),
        max: Math.max(...data.costs)
      },
      stores_using: Array.from(data.stores) as string[]
    }));
  },

  /**
   * Analyze ingredients across all recipes
   */
  async analyzeIngredients(recipes: any[]): Promise<IngredientAnalysis> {
    const ingredientMap: Record<string, Set<string>> = {};
    const ingredientUnits: Record<string, Set<string>> = {};
    const ingredientStores: Record<string, Set<string>> = {};

    recipes.forEach(recipe => {
      const storeName = recipe.stores?.name || 'Unknown';
      
      (recipe.recipe_ingredients || []).forEach((ingredient: any) => {
        const name = ingredient.ingredient_name.toLowerCase().trim();
        const originalName = ingredient.ingredient_name;
        
        if (!ingredientMap[name]) {
          ingredientMap[name] = new Set();
        }
        ingredientMap[name].add(originalName);

        if (!ingredientUnits[name]) {
          ingredientUnits[name] = new Set();
        }
        ingredientUnits[name].add(ingredient.unit);

        if (!ingredientStores[name]) {
          ingredientStores[name] = new Set();
        }
        ingredientStores[name].add(storeName);
      });
    });

    const duplicateIngredients = Object.entries(ingredientMap)
      .filter(([, variations]) => variations.size > 1)
      .map(([standardName, variations]) => ({
        standardName: Array.from(variations)[0], // Use first variation as standard
        variations: Array.from(variations),
        usageCount: Array.from(variations).length
      }));

    const unitMismatches = Object.entries(ingredientUnits)
      .filter(([, units]) => units.size > 1)
      .map(([ingredient, units]) => ({
        ingredient: Array.from(ingredientMap[ingredient])[0],
        units: Array.from(units),
        stores: Array.from(ingredientStores[ingredient])
      }));

    return {
      totalUniqueIngredients: Object.keys(ingredientMap).length,
      duplicateIngredients,
      unitMismatches
    };
  },

  /**
   * Calculate recipe distribution by store
   */
  async calculateStoreDistribution(recipes: any[]): Promise<StoreRecipeCount[]> {
    const storeMap: Record<string, any> = {};

    recipes.forEach(recipe => {
      const storeId = recipe.store_id;
      const storeName = recipe.stores?.name || 'Unknown Store';
      
      if (!storeMap[storeId]) {
        storeMap[storeId] = {
          store_id: storeId,
          store_name: storeName,
          recipes: [],
          unique_names: new Set()
        };
      }

      storeMap[storeId].recipes.push(recipe);
      storeMap[storeId].unique_names.add(recipe.name.toLowerCase().trim());
    });

    return Object.values(storeMap).map((store: any) => ({
      store_id: store.store_id,
      store_name: store.store_name,
      recipe_count: store.recipes.length,
      unique_recipes: store.unique_names.size,
      duplicate_recipes: store.recipes.length - store.unique_names.size
    }));
  },

  /**
   * Generate migration plan based on analysis
   */
  async generateMigrationPlan(duplicateGroups: RecipeDuplicateGroup[], totalRecipes: number): Promise<MigrationPlan> {
    const estimatedTemplates = duplicateGroups.length + 
      (totalRecipes - duplicateGroups.reduce((sum, group) => sum + group.recipes.length, 0));

    const recipeReduction = totalRecipes > 0 
      ? ((totalRecipes - estimatedTemplates) / totalRecipes) * 100
      : 0;

    const phaseBreakdown = [
      {
        phase: 1,
        description: 'High-confidence duplicates (90%+ similarity)',
        templates_count: duplicateGroups.filter(g => g.confidence >= 90).length,
        recipes_affected: duplicateGroups
          .filter(g => g.confidence >= 90)
          .reduce((sum, g) => sum + g.recipes.length, 0),
        estimated_hours: 8
      },
      {
        phase: 2,
        description: 'Medium-confidence duplicates (70-89% similarity)',
        templates_count: duplicateGroups.filter(g => g.confidence >= 70 && g.confidence < 90).length,
        recipes_affected: duplicateGroups
          .filter(g => g.confidence >= 70 && g.confidence < 90)
          .reduce((sum, g) => sum + g.recipes.length, 0),
        estimated_hours: 16
      },
      {
        phase: 3,
        description: 'Unique recipes (no duplicates)',
        templates_count: totalRecipes - duplicateGroups.reduce((sum, g) => sum + g.recipes.length, 0),
        recipes_affected: totalRecipes - duplicateGroups.reduce((sum, g) => sum + g.recipes.length, 0),
        estimated_hours: 12
      }
    ];

    return {
      estimatedTemplates,
      recipeReduction: Math.round(recipeReduction),
      phaseBreakdown
    };
  }
};