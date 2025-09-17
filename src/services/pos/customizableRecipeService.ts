import { supabase } from '@/integrations/supabase/client';

export interface CustomizableIngredient {
  id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  ingredient_group_name?: string;
  group_selection_type?: string;
  is_optional: boolean;
}

export interface CustomizableRecipe {
  id: string;
  name: string;
  description?: string;
  category_name?: string;
  price: number;
  yield_quantity: number;
  serving_size?: number;
  instructions?: string;
  ingredients: CustomizableIngredient[];
  choice_groups: ChoiceGroup[];
}

export interface ChoiceGroup {
  name: string;
  selection_type: string;
  ingredients: CustomizableIngredient[];
  display_name: string;
}

export interface SelectedChoice {
  choice_group_name: string;
  selected_ingredient: CustomizableIngredient;
}

export interface CustomizedCartItem {
  recipe: CustomizableRecipe;
  selected_choices: SelectedChoice[];
  final_price: number;
  display_name: string;
  quantity: number;
}

/**
 * Fetch customizable recipes from recipe templates with choice groups
 */
export const fetchCustomizableRecipes = async (): Promise<CustomizableRecipe[]> => {
  try {
    console.log('Fetching customizable recipes...');
    
    const { data, error } = await supabase
      .from('recipe_templates')
      .select(`
        id,
        name,
        description,
        category_name,
        yield_quantity,
        serving_size,
        instructions,
        is_active,
        recipe_template_ingredients (
          id,
          ingredient_name,
          quantity,
          unit,
          cost_per_unit,
          ingredient_group_name,
          ingredient_group_id,
          group_selection_type,
          is_optional
        )
      `)
      .eq('is_active', true)
      .not('recipe_template_ingredients.ingredient_group_name', 'is', null)
      .limit(50); // Add reasonable limit

    if (error) {
      console.error('Error fetching customizable recipes:', error);
      throw error;
    }

    console.log('Raw customizable recipes data:', data);

    // Transform the data into CustomizableRecipe format
    const customizableRecipes: CustomizableRecipe[] = (data || []).map(template => {
      const ingredients: CustomizableIngredient[] = (template.recipe_template_ingredients || []).map(ing => ({
        id: ing.id,
        ingredient_name: ing.ingredient_name,
        quantity: ing.quantity,
        unit: ing.unit,
        cost_per_unit: ing.cost_per_unit,
        ingredient_group_name: ing.ingredient_group_name,
        group_selection_type: ing.group_selection_type,
        is_optional: ing.is_optional
      }));

      // Group ingredients by choice group
      const choiceGroups: ChoiceGroup[] = [];
      const choiceGroupMap = new Map<string, CustomizableIngredient[]>();

      ingredients.forEach(ingredient => {
        if (ingredient.ingredient_group_name) {
          if (!choiceGroupMap.has(ingredient.ingredient_group_name)) {
            choiceGroupMap.set(ingredient.ingredient_group_name, []);
          }
          choiceGroupMap.get(ingredient.ingredient_group_name)!.push(ingredient);
        }
      });

      // Create choice groups
      choiceGroupMap.forEach((groupIngredients, groupName) => {
        const firstIngredient = groupIngredients[0];
        choiceGroups.push({
          name: groupName,
          selection_type: firstIngredient.group_selection_type || 'required_one',
          ingredients: groupIngredients,
          display_name: formatChoiceGroupName(groupName)
        });
      });

      // Calculate base price (non-choice ingredients)
      const baseIngredients = ingredients.filter(ing => !ing.ingredient_group_name);
      const basePrice = baseIngredients.reduce((sum, ing) => sum + (ing.quantity * ing.cost_per_unit), 0);
      
      // For pricing, we'll use a markup. In a real system, this would come from the product catalog
      const markup = template.name.includes('Overload') ? 99 : 65; // Based on our uploaded recipes

      return {
        id: template.id,
        name: template.name,
        description: template.description,
        category_name: template.category_name,
        price: markup,
        yield_quantity: template.yield_quantity,
        serving_size: template.serving_size,
        instructions: template.instructions,
        ingredients,
        choice_groups: choiceGroups
      };
    });

    console.log('Processed customizable recipes:', customizableRecipes);
    return customizableRecipes;

  } catch (error) {
    console.error('Error in fetchCustomizableRecipes:', error);
    return [];
  }
};

/**
 * Check if a recipe has customizable choice groups
 */
export const isCustomizableRecipe = (recipe: any): boolean => {
  return recipe.choice_groups && recipe.choice_groups.length > 0;
};

/**
 * Calculate final price for a customized recipe
 */
export const calculateCustomizedPrice = (
  recipe: CustomizableRecipe,
  selectedChoices: SelectedChoice[]
): number => {
  // For our implementation, the price is fixed regardless of choice
  // In a more complex system, different choices might have different prices
  return recipe.price;
};

/**
 * Generate display name for customized item
 */
export const generateCustomizedDisplayName = (
  recipe: CustomizableRecipe,
  selectedChoices: SelectedChoice[]
): string => {
  if (selectedChoices.length === 0) {
    return recipe.name;
  }

  const choiceNames = selectedChoices.map(choice => choice.selected_ingredient.ingredient_name);
  return `${recipe.name} (${choiceNames.join(', ')})`;
};

/**
 * Validate that all required choice groups have selections
 */
export const validateChoiceSelections = (
  recipe: CustomizableRecipe,
  selectedChoices: SelectedChoice[]
): { isValid: boolean; missingGroups: string[] } => {
  const requiredGroups = recipe.choice_groups.filter(group => 
    group.selection_type === 'required_one' || group.selection_type === 'required_all'
  );

  const selectedGroupNames = selectedChoices.map(choice => choice.choice_group_name);
  const missingGroups = requiredGroups
    .filter(group => !selectedGroupNames.includes(group.name))
    .map(group => group.display_name);

  return {
    isValid: missingGroups.length === 0,
    missingGroups
  };
};

/**
 * Format choice group name for display
 */
function formatChoiceGroupName(groupName: string): string {
  return groupName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace('Topping Choice', 'Topping Selection');
}

/**
 * Get base ingredients (non-choice) for a recipe
 */
export const getBaseIngredients = (recipe: CustomizableRecipe): CustomizableIngredient[] => {
  return recipe.ingredients.filter(ing => !ing.ingredient_group_name);
};

/**
 * Get packaging ingredients for a recipe
 */
export const getPackagingIngredients = (recipe: CustomizableRecipe): CustomizableIngredient[] => {
  return recipe.ingredients.filter(ing => 
    ing.ingredient_name.includes('Box') || 
    ing.ingredient_name.includes('Cup') || 
    ing.ingredient_name.toLowerCase().includes('popsicle')
  );
};

/**
 * Create a customized cart item
 */
export const createCustomizedCartItem = (
  recipe: CustomizableRecipe,
  selectedChoices: SelectedChoice[],
  quantity: number = 1
): CustomizedCartItem => {
  const finalPrice = calculateCustomizedPrice(recipe, selectedChoices);
  const displayName = generateCustomizedDisplayName(recipe, selectedChoices);

  return {
    recipe,
    selected_choices: selectedChoices,
    final_price: finalPrice,
    display_name: displayName,
    quantity
  };
};
