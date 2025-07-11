import { supabase } from "@/integrations/supabase/client";

const addonRecipes = [
  { name: "Colored Sprinkles", cost_per_unit: 2.5, price: 6 },
  { name: "Marshmallow", cost_per_unit: 2.5, price: 6 },
  { name: "Choco Flakes", cost_per_unit: 2.5, price: 6 },
  { name: "Peanut", cost_per_unit: 2.5, price: 6 },
  { name: "Caramel", cost_per_unit: 2.5, price: 6 },
  { name: "Chocolate", cost_per_unit: 2.5, price: 6 },
  { name: "Tiramisu", cost_per_unit: 3.5, price: 6 },
  { name: "Biscoff Crushed", cost_per_unit: 5.62, price: 10 },
  { name: "Oreo Crushed", cost_per_unit: 2.5, price: 10 },
  { name: "Strawberry Jam", cost_per_unit: 5, price: 10 },
  { name: "Mango Jam", cost_per_unit: 7, price: 10 },
  { name: "Blueberry Jam", cost_per_unit: 7.5, price: 10 },
  { name: "Nutella", cost_per_unit: 4.5, price: 8 },
  { name: "Dark Chocolate", cost_per_unit: 2.5, price: 8 },
  { name: "Biscoff", cost_per_unit: 2.5, price: 10 },
  { name: "Oreo Cookies", cost_per_unit: 2.9, price: 10 },
  { name: "Kitkat", cost_per_unit: 6.25, price: 10 }
];

async function uploadAddonRecipes() {
  try {
    console.log('Starting addon recipes upload...');
    
    for (const addon of addonRecipes) {
      console.log(`Processing ${addon.name}...`);
      
      // Create recipe template
      const { data: template, error: templateError } = await supabase
        .from('recipe_templates')
        .insert({
          name: addon.name,
          description: `${addon.name} addon`,
          category_name: "addon",
          yield_quantity: 1,
          serving_size: 1,
          is_active: true,
          version: 1,
          created_by: '00000000-0000-0000-0000-000000000000'
        })
        .select()
        .single();

      if (templateError) {
        console.error(`Error creating template for ${addon.name}:`, templateError);
        continue;
      }

      console.log(`Template created for ${addon.name}: ${template.id}`);

      // Add single ingredient (the addon itself)
      const { error: ingredientError } = await supabase
        .from('recipe_template_ingredients')
        .insert({
          recipe_template_id: template.id,
          ingredient_name: addon.name,
          quantity: 1,
          unit: "portion",
          cost_per_unit: addon.cost_per_unit,
          location_type: "all",
          uses_store_inventory: true
        });

      if (ingredientError) {
        console.error(`Error adding ingredient for ${addon.name}:`, ingredientError);
        continue;
      }

      console.log(`✅ Successfully uploaded ${addon.name}`);
    }

    console.log('✅ All addon recipes uploaded successfully!');
  } catch (error) {
    console.error('❌ Error uploading addon recipes:', error);
  }
}

// Run the upload
uploadAddonRecipes();