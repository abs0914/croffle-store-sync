import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

interface EspressoIngredient {
  ingredient_name: string;
  unit_of_measure: string;
  quantity: number;
  cost_per_unit: number;
}

interface EspressoRecipe {
  product: string;
  category: string;
  price: number;
  ingredients: EspressoIngredient[];
}

// Espresso recipe data from the table
const ESPRESSO_RECIPES: EspressoRecipe[] = [
  {
    product: "Americano (Hot)",
    category: "Espresso",
    price: 65,
    ingredients: [
      { ingredient_name: "Espresso Shot", unit_of_measure: "Shot", quantity: 1, cost_per_unit: 0 },
      { ingredient_name: "Hot Water", unit_of_measure: "Ml", quantity: 150, cost_per_unit: 0 }
    ]
  },
  {
    product: "Americano (Iced)",
    category: "Espresso",
    price: 70,
    ingredients: [
      { ingredient_name: "Espresso Shot", unit_of_measure: "Shot", quantity: 1, cost_per_unit: 0 },
      { ingredient_name: "Cold Water", unit_of_measure: "Ml", quantity: 100, cost_per_unit: 0 },
      { ingredient_name: "Ice", unit_of_measure: "Cubes", quantity: 5, cost_per_unit: 0 }
    ]
  },
  {
    product: "Cappuccino (Hot)",
    category: "Espresso",
    price: 75,
    ingredients: [
      { ingredient_name: "Espresso Shot", unit_of_measure: "Shot", quantity: 1, cost_per_unit: 0 },
      { ingredient_name: "Steamed Milk", unit_of_measure: "Ml", quantity: 120, cost_per_unit: 0 },
      { ingredient_name: "Milk Foam", unit_of_measure: "Ml", quantity: 30, cost_per_unit: 0 }
    ]
  },
  {
    product: "Cappuccino (Iced)",
    category: "Espresso",
    price: 80,
    ingredients: [
      { ingredient_name: "Espresso Shot", unit_of_measure: "Shot", quantity: 1, cost_per_unit: 0 },
      { ingredient_name: "Cold Milk", unit_of_measure: "Ml", quantity: 120, cost_per_unit: 0 },
      { ingredient_name: "Ice", unit_of_measure: "Cubes", quantity: 5, cost_per_unit: 0 }
    ]
  },
  {
    product: "Café Latte (Hot)",
    category: "Espresso",
    price: 75,
    ingredients: [
      { ingredient_name: "Espresso Shot", unit_of_measure: "Shot", quantity: 1, cost_per_unit: 0 },
      { ingredient_name: "Steamed Milk", unit_of_measure: "Ml", quantity: 180, cost_per_unit: 0 }
    ]
  },
  {
    product: "Café Latte (Iced)",
    category: "Espresso",
    price: 80,
    ingredients: [
      { ingredient_name: "Espresso Shot", unit_of_measure: "Shot", quantity: 1, cost_per_unit: 0 },
      { ingredient_name: "Cold Milk", unit_of_measure: "Ml", quantity: 180, cost_per_unit: 0 },
      { ingredient_name: "Ice", unit_of_measure: "Cubes", quantity: 5, cost_per_unit: 0 }
    ]
  },
  {
    product: "Café Mocha (Hot)",
    category: "Espresso",
    price: 80,
    ingredients: [
      { ingredient_name: "Espresso Shot", unit_of_measure: "Shot", quantity: 1, cost_per_unit: 0 },
      { ingredient_name: "Chocolate Syrup", unit_of_measure: "Pump (15 ml)", quantity: 1, cost_per_unit: 0 },
      { ingredient_name: "Steamed Milk", unit_of_measure: "Ml", quantity: 150, cost_per_unit: 0 }
    ]
  },
  {
    product: "Café Mocha (Iced)",
    category: "Espresso",
    price: 85,
    ingredients: [
      { ingredient_name: "Espresso Shot", unit_of_measure: "Shot", quantity: 1, cost_per_unit: 0 },
      { ingredient_name: "Chocolate Syrup", unit_of_measure: "Pump (15 ml)", quantity: 1, cost_per_unit: 0 },
      { ingredient_name: "Cold Milk", unit_of_measure: "Ml", quantity: 150, cost_per_unit: 0 },
      { ingredient_name: "Ice", unit_of_measure: "Cubes", quantity: 5, cost_per_unit: 0 }
    ]
  },
  {
    product: "Caramel Latte (Hot)",
    category: "Espresso",
    price: 80,
    ingredients: [
      { ingredient_name: "Espresso Shot", unit_of_measure: "Shot", quantity: 1, cost_per_unit: 0 },
      { ingredient_name: "Caramel Syrup", unit_of_measure: "Pump (15 ml)", quantity: 1, cost_per_unit: 0 },
      { ingredient_name: "Steamed Milk", unit_of_measure: "Ml", quantity: 150, cost_per_unit: 0 }
    ]
  },
  {
    product: "Caramel Latte (Iced)",
    category: "Espresso",
    price: 85,
    ingredients: [
      { ingredient_name: "Espresso Shot", unit_of_measure: "Shot", quantity: 1, cost_per_unit: 0 },
      { ingredient_name: "Caramel Syrup", unit_of_measure: "Pump (15 ml)", quantity: 1, cost_per_unit: 0 },
      { ingredient_name: "Cold Milk", unit_of_measure: "Ml", quantity: 150, cost_per_unit: 0 },
      { ingredient_name: "Ice", unit_of_measure: "Cubes", quantity: 5, cost_per_unit: 0 }
    ]
  }
];

async function createAdminUser() {
  console.log('👤 Creating admin user...');
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: 'admin@example.com',
    password: 'password123',
    options: {
      data: {
        name: 'Admin User',
        role: 'admin'
      }
    }
  });

  if (authError && !authError.message.includes('already registered')) {
    console.error('❌ Failed to create admin user:', authError.message);
    return null;
  }

  if (authError && authError.message.includes('already registered')) {
    console.log('✅ Admin user already exists');
  } else {
    console.log('✅ Admin user created successfully');
  }

  return true;
}

async function uploadEspressoRecipeTemplate(recipe: EspressoRecipe, userId: string): Promise<boolean> {
  try {
    console.log(`Creating espresso recipe template: ${recipe.product}`);
    
    // Calculate total cost (all ingredients have 0 cost in this case)
    const totalCost = recipe.ingredients.reduce((sum, ing) => sum + (ing.quantity * ing.cost_per_unit), 0);
    
    // Create the recipe template
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .insert({
        name: recipe.product,
        description: `${recipe.product} espresso drink recipe with detailed preparation instructions`,
        category_name: recipe.category.toLowerCase(),
        instructions: `Prepare ${recipe.product} following standard espresso preparation methods`,
        yield_quantity: 1,
        serving_size: 1,
        version: 1,
        is_active: true,
        created_by: userId
      })
      .select()
      .single();

    if (templateError) {
      console.error(`Error creating template for ${recipe.product}:`, templateError);
      return false;
    }

    console.log(`✅ Created recipe template: ${recipe.product} (ID: ${template.id})`);

    // Add ingredients to the template
    let ingredientCount = 0;
    for (const ingredient of recipe.ingredients) {
      const { error: ingredientError } = await supabase
        .from('recipe_template_ingredients')
        .insert({
          recipe_template_id: template.id,
          ingredient_name: ingredient.ingredient_name,
          commissary_item_name: ingredient.ingredient_name,
          quantity: ingredient.quantity,
          unit: ingredient.unit_of_measure,
          cost_per_unit: ingredient.cost_per_unit,
          ingredient_type: 'raw_material',
          uses_store_inventory: false
        });

      if (ingredientError) {
        console.error(`Error adding ingredient ${ingredient.ingredient_name}:`, ingredientError);
      } else {
        ingredientCount++;
      }
    }

    console.log(`   📦 Added ${ingredientCount}/${recipe.ingredients.length} ingredients`);
    console.log(`   💰 Total cost: ₱${totalCost.toFixed(2)} | Price: ₱${recipe.price}`);
    
    return true;
  } catch (error) {
    console.error(`Error processing ${recipe.product}:`, error);
    return false;
  }
}

async function uploadEspressoRecipes() {
  try {
    console.log('🚀 Starting espresso recipe upload process...');
    
    // First try to create admin user if it doesn't exist
    await createAdminUser();
    
    // Try to authenticate with admin credentials
    console.log('🔐 Authenticating with admin account...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'password123'
    });
    
    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      console.log('💡 If this persists, you may need to manually create the admin account in the Supabase dashboard.');
      process.exit(1);
    }

    if (!authData.user) {
      console.error('❌ No user data returned after authentication');
      process.exit(1);
    }

    console.log(`📝 Authenticated as: ${authData.user.email}`);
    console.log(`📊 Total espresso recipes to upload: ${ESPRESSO_RECIPES.length}`);

    let successCount = 0;
    let failCount = 0;

    // Upload each espresso recipe
    for (const recipe of ESPRESSO_RECIPES) {
      const success = await uploadEspressoRecipeTemplate(recipe, authData.user.id);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log('\n📈 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${successCount} espresso recipes`);
    console.log(`❌ Failed uploads: ${failCount} recipes`);
    console.log(`📊 Total processed: ${successCount + failCount} recipes`);

    if (failCount === 0) {
      console.log('\n🎉 All espresso recipes uploaded successfully!');
      console.log('\n☕ Uploaded recipes include:');
      console.log('   • Americano (Hot & Iced)');
      console.log('   • Cappuccino (Hot & Iced)');
      console.log('   • Café Latte (Hot & Iced)');
      console.log('   • Café Mocha (Hot & Iced)');
      console.log('   • Caramel Latte (Hot & Iced)');
      console.log('\n💡 These recipes are now ready for deployment to stores and POS integration!');
    } else {
      console.log('\n⚠️  Some recipes failed to upload. Check the logs above for details.');
    }

  } catch (error) {
    console.error('❌ Fatal error during upload:', error);
    process.exit(1);
  }
}

// Run the upload
uploadEspressoRecipes()
  .then(() => {
    console.log('\n✨ Espresso recipe upload process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Upload process failed:', error);
    process.exit(1);
  });
