import { supabase } from "@/integrations/supabase/client";

const drinksRecipes = [
  {
    name: "Coke",
    category_name: "Others",
    description: "Refreshing Coke",
    yield_quantity: 1,
    serving_size: 1,
    ingredients: [
      {
        ingredient_name: "Softdrinks",
        quantity: 20,
        unit: "piece",
        cost_per_unit: 11.3,
        location_type: "all",
        uses_store_inventory: true
      }
    ],
    price: 15
  },
  {
    name: "Spri",
    category_name: "Others", 
    description: "Refreshing Spri",
    yield_quantity: 1,
    serving_size: 1,
    ingredients: [
      {
        ingredient_name: "Softdrinks",
        quantity: 20,
        unit: "piece", 
        cost_per_unit: 11.3,
        location_type: "all",
        uses_store_inventory: true
      }
    ],
    price: 15
  },
  {
    name: "Bottled Water",
    category_name: "Others",
    description: "Pure bottled water",
    yield_quantity: 1,
    serving_size: 1,
    ingredients: [
      {
        ingredient_name: "Water",
        quantity: 20,
        unit: "piece",
        cost_per_unit: 0,
        location_type: "all", 
        uses_store_inventory: true
      }
    ],
    price: 20
  }
];

async function uploadDrinksRecipes() {
  try {
    console.log('Starting drinks recipes upload...');
    
    for (const recipe of drinksRecipes) {
      console.log(`Processing ${recipe.name}...`);
      
      // Calculate total cost
      const totalCost = recipe.ingredients.reduce((sum, ingredient) => {
        return sum + (ingredient.quantity * ingredient.cost_per_unit);
      }, 0);

      // Create recipe template
      const { data: template, error: templateError } = await supabase
        .from('recipe_templates')
        .insert({
          name: recipe.name,
          description: recipe.description,
          category_name: recipe.category_name,
          yield_quantity: recipe.yield_quantity,
          serving_size: recipe.serving_size,
          is_active: true,
          version: 1,
          created_by: '00000000-0000-0000-0000-000000000000'
        })
        .select()
        .single();

      if (templateError) {
        console.error(`Error creating template for ${recipe.name}:`, templateError);
        continue;
      }

      console.log(`Template created for ${recipe.name}: ${template.id}`);

      // Add ingredients
      const ingredientData = recipe.ingredients.map(ingredient => ({
        recipe_template_id: template.id,
        ingredient_name: ingredient.ingredient_name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        cost_per_unit: ingredient.cost_per_unit,
        location_type: ingredient.location_type,
        uses_store_inventory: ingredient.uses_store_inventory
      }));

      const { error: ingredientError } = await supabase
        .from('recipe_template_ingredients')
        .insert(ingredientData);

      if (ingredientError) {
        console.error(`Error adding ingredients for ${recipe.name}:`, ingredientError);
        continue;
      }

      console.log(`✅ Successfully uploaded ${recipe.name}`);
    }

    console.log('✅ All drinks recipes uploaded successfully!');
  } catch (error) {
    console.error('❌ Error uploading drinks recipes:', error);
  }
}

// Run the upload
uploadDrinksRecipes();