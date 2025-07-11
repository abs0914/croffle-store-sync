import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BulkRecipeData {
  name: string;
  category: string;
  price: number;
  ingredients: {
    name: string;
    unit: string;
    quantity: number;
    cost_per_unit: number;
  }[];
}

export const bulkUploadRecipeTemplates = async (recipes: BulkRecipeData[], createdBy: string) => {
  try {
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const recipe of recipes) {
      try {
        // Calculate total cost
        const totalCost = recipe.ingredients.reduce((sum, ing) => sum + (ing.quantity * ing.cost_per_unit), 0);
        
        // Create the recipe template
        const { data: template, error: templateError } = await supabase
          .from('recipe_templates')
          .insert({
            name: recipe.name,
            description: `${recipe.category} croffle recipe with premium ingredients`,
            instructions: `1. Prepare ${recipe.name} croffle\n2. Add toppings and ingredients\n3. Serve with chopstick and wax paper`,
            yield_quantity: 1,
            serving_size: 1,
            category_name: recipe.category,
            version: 1,
            is_active: true,
            created_by: createdBy,
            suggested_price: recipe.price,
            total_cost: totalCost
          })
          .select()
          .single();

        if (templateError) throw templateError;

        // Insert ingredients
        if (recipe.ingredients.length > 0) {
          const { error: ingredientsError } = await supabase
            .from('recipe_template_ingredients')
            .insert(
              recipe.ingredients.map(ing => ({
                recipe_template_id: template.id,
                ingredient_name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
                location_type: 'all',
                uses_store_inventory: false,
                cost_per_unit: ing.cost_per_unit
              }))
            );

          if (ingredientsError) throw ingredientsError;
        }

        successCount++;
      } catch (error: any) {
        errorCount++;
        errors.push(`${recipe.name}: ${error.message}`);
        console.error(`Error creating recipe ${recipe.name}:`, error);
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} recipe templates`);
    }
    
    if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} recipes. Check console for details.`);
      console.error('Upload errors:', errors);
    }

    return { successCount, errorCount, errors };
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    toast.error('Failed to upload recipes');
    return { successCount: 0, errorCount: recipes.length, errors: [error.message] };
  }
};

// Recipe data from the table
export const recipeData: BulkRecipeData[] = [
  {
    name: "Tiramisu",
    category: "Classic",
    price: 125,
    ingredients: [
      { name: "REGULAR CROISSANT", unit: "piece", quantity: 1, cost_per_unit: 30 },
      { name: "WHIPPED CREAM", unit: "serving", quantity: 1, cost_per_unit: 8 },
      { name: "Tiramisu", unit: "portion", quantity: 1, cost_per_unit: 3.5 },
      { name: "Choco Flakes", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Chopstick", unit: "pair", quantity: 1, cost_per_unit: 0.6 },
      { name: "Wax Paper", unit: "piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    name: "Choco Nut",
    category: "Classic",
    price: 125,
    ingredients: [
      { name: "REGULAR CROISSANT", unit: "piece", quantity: 1, cost_per_unit: 30 },
      { name: "WHIPPED CREAM", unit: "serving", quantity: 1, cost_per_unit: 8 },
      { name: "Chocolate", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Peanut", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Chopstick", unit: "pair", quantity: 1, cost_per_unit: 0.6 },
      { name: "Wax Paper", unit: "piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    name: "Caramel Delight",
    category: "Classic",
    price: 125,
    ingredients: [
      { name: "REGULAR CROISSANT", unit: "piece", quantity: 1, cost_per_unit: 30 },
      { name: "WHIPPED CREAM", unit: "serving", quantity: 1, cost_per_unit: 8 },
      { name: "Caramel", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Colored Sprinkles", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Chopstick", unit: "pair", quantity: 1, cost_per_unit: 0.6 },
      { name: "Wax Paper", unit: "piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    name: "Choco Marshmallow",
    category: "Classic",
    price: 125,
    ingredients: [
      { name: "REGULAR CROISSANT", unit: "piece", quantity: 1, cost_per_unit: 30 },
      { name: "WHIPPED CREAM", unit: "serving", quantity: 1, cost_per_unit: 8 },
      { name: "Chocolate", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Marshmallow", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Chopstick", unit: "pair", quantity: 1, cost_per_unit: 0.6 },
      { name: "Wax Paper", unit: "piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    name: "Strawberry",
    category: "Fruity",
    price: 125,
    ingredients: [
      { name: "REGULAR CROISSANT", unit: "piece", quantity: 1, cost_per_unit: 30 },
      { name: "WHIPPED CREAM", unit: "serving", quantity: 1, cost_per_unit: 8 },
      { name: "Strawberry Jam", unit: "scoop", quantity: 1, cost_per_unit: 5 },
      { name: "Chopstick", unit: "pair", quantity: 1, cost_per_unit: 0.6 },
      { name: "Wax Paper", unit: "piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    name: "Mango",
    category: "Fruity",
    price: 125,
    ingredients: [
      { name: "REGULAR CROISSANT", unit: "piece", quantity: 1, cost_per_unit: 30 },
      { name: "WHIPPED CREAM", unit: "serving", quantity: 1, cost_per_unit: 8 },
      { name: "Mango Jam", unit: "scoop", quantity: 1, cost_per_unit: 7 },
      { name: "Graham Crushed", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Chopstick", unit: "pair", quantity: 1, cost_per_unit: 0.6 },
      { name: "Wax Paper", unit: "piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    name: "Blueberry",
    category: "Fruity",
    price: 125,
    ingredients: [
      { name: "REGULAR CROISSANT", unit: "piece", quantity: 1, cost_per_unit: 30 },
      { name: "WHIPPED CREAM", unit: "serving", quantity: 1, cost_per_unit: 8 },
      { name: "Blueberry Jam", unit: "scoop", quantity: 1, cost_per_unit: 7.5 },
      { name: "Graham Crushed", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Chopstick", unit: "pair", quantity: 1, cost_per_unit: 0.6 },
      { name: "Wax Paper", unit: "piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    name: "Biscoff",
    category: "Premium",
    price: 125,
    ingredients: [
      { name: "REGULAR CROISSANT", unit: "piece", quantity: 1, cost_per_unit: 30 },
      { name: "WHIPPED CREAM", unit: "serving", quantity: 1, cost_per_unit: 8 },
      { name: "Biscoff Crushed", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Biscoff", unit: "piece", quantity: 1, cost_per_unit: 5.62 },
      { name: "Chopstick", unit: "pair", quantity: 1, cost_per_unit: 0.6 },
      { name: "Wax Paper", unit: "piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    name: "Nutella",
    category: "Premium",
    price: 125,
    ingredients: [
      { name: "REGULAR CROISSANT", unit: "piece", quantity: 1, cost_per_unit: 30 },
      { name: "WHIPPED CREAM", unit: "serving", quantity: 1, cost_per_unit: 8 },
      { name: "Nutella", unit: "portion", quantity: 1, cost_per_unit: 4.5 },
      { name: "Chopstick", unit: "pair", quantity: 1, cost_per_unit: 0.6 },
      { name: "Wax Paper", unit: "piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    name: "Kitkat",
    category: "Premium",
    price: 125,
    ingredients: [
      { name: "REGULAR CROISSANT", unit: "piece", quantity: 1, cost_per_unit: 30 },
      { name: "WHIPPED CREAM", unit: "serving", quantity: 1, cost_per_unit: 8 },
      { name: "Chocolate", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Kitkat", unit: "piece", quantity: 0.5, cost_per_unit: 6.25 },
      { name: "Chopstick", unit: "pair", quantity: 1, cost_per_unit: 0.6 },
      { name: "Wax Paper", unit: "piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    name: "Cookies & Cream",
    category: "Premium",
    price: 125,
    ingredients: [
      { name: "REGULAR CROISSANT", unit: "piece", quantity: 1, cost_per_unit: 30 },
      { name: "WHIPPED CREAM", unit: "serving", quantity: 1, cost_per_unit: 8 },
      { name: "Oreo Crushed", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Oreo Cookies", unit: "piece", quantity: 1, cost_per_unit: 2.9 },
      { name: "Chopstick", unit: "pair", quantity: 1, cost_per_unit: 0.6 },
      { name: "Wax Paper", unit: "piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    name: "Choco Overload",
    category: "Premium",
    price: 125,
    ingredients: [
      { name: "REGULAR CROISSANT", unit: "piece", quantity: 1, cost_per_unit: 30 },
      { name: "WHIPPED CREAM", unit: "serving", quantity: 1, cost_per_unit: 8 },
      { name: "Chocolate", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Choco Flakes", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Chopstick", unit: "pair", quantity: 1, cost_per_unit: 0.6 },
      { name: "Wax Paper", unit: "piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    name: "Matcha",
    category: "Premium",
    price: 125,
    ingredients: [
      { name: "REGULAR CROISSANT", unit: "piece", quantity: 1, cost_per_unit: 30 },
      { name: "WHIPPED CREAM", unit: "serving", quantity: 1, cost_per_unit: 8 },
      { name: "Matcha crumble", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Chopstick", unit: "pair", quantity: 1, cost_per_unit: 0.6 },
      { name: "Wax Paper", unit: "piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    name: "Dark Chocolate",
    category: "Premium",
    price: 125,
    ingredients: [
      { name: "REGULAR CROISSANT", unit: "piece", quantity: 1, cost_per_unit: 30 },
      { name: "WHIPPED CREAM", unit: "serving", quantity: 1, cost_per_unit: 8 },
      { name: "Dark Chocolate", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Chocolate crumble", unit: "portion", quantity: 1, cost_per_unit: 2.5 },
      { name: "Chopstick", unit: "pair", quantity: 1, cost_per_unit: 0.6 },
      { name: "Wax Paper", unit: "piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  }
];