import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

interface AddonIngredient {
  ingredient_name: string;
  unit_of_measure: string;
  quantity: number;
  cost_per_unit: number;
}

interface AddonRecipe {
  product: string;
  category: string;
  price: number;
  ingredients: AddonIngredient[];
}

// Addon recipe data from the table
const ADDON_RECIPES: AddonRecipe[] = [
  {
    product: "Colored Sprinkles",
    category: "Addon",
    price: 6,
    ingredients: [
      { ingredient_name: "Colored Sprinkles", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 2.5 }
    ]
  },
  {
    product: "Marshmallow",
    category: "Addon",
    price: 6,
    ingredients: [
      { ingredient_name: "Marshmallow", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 2.5 }
    ]
  },
  {
    product: "Choco Flakes",
    category: "Addon",
    price: 6,
    ingredients: [
      { ingredient_name: "Choco Flakes", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 2.5 }
    ]
  },
  {
    product: "Peanut",
    category: "Addon",
    price: 6,
    ingredients: [
      { ingredient_name: "Peanut", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 2.5 }
    ]
  },
  {
    product: "Caramel",
    category: "Addon",
    price: 6,
    ingredients: [
      { ingredient_name: "Caramel", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 2.5 }
    ]
  },
  {
    product: "Chocolate",
    category: "Addon",
    price: 6,
    ingredients: [
      { ingredient_name: "Chocolate", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 2.5 }
    ]
  },
  {
    product: "Tiramisu",
    category: "Addon",
    price: 6,
    ingredients: [
      { ingredient_name: "Tiramisu", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 3.5 }
    ]
  },
  {
    product: "Biscoff Crushed",
    category: "Addon",
    price: 10,
    ingredients: [
      { ingredient_name: "Biscoff Crushed", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 5.62 }
    ]
  },
  {
    product: "Oreo Crushed",
    category: "Addon",
    price: 10,
    ingredients: [
      { ingredient_name: "Oreo Crushed", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 2.5 }
    ]
  },
  {
    product: "Strawberry Jam",
    category: "Addon",
    price: 10,
    ingredients: [
      { ingredient_name: "Strawberry Jam", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 5 }
    ]
  },
  {
    product: "Mango Jam",
    category: "Addon",
    price: 10,
    ingredients: [
      { ingredient_name: "Mango Jam", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 7 }
    ]
  },
  {
    product: "Blueberry Jam",
    category: "Addon",
    price: 10,
    ingredients: [
      { ingredient_name: "Blueberry Jam", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 7.5 }
    ]
  },
  {
    product: "Nutella",
    category: "Addon",
    price: 8,
    ingredients: [
      { ingredient_name: "Nutella", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 4.5 }
    ]
  },
  {
    product: "Dark Chocolate",
    category: "Addon",
    price: 8,
    ingredients: [
      { ingredient_name: "Dark Chocolate", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 2.5 }
    ]
  },
  {
    product: "Biscoff",
    category: "Addon",
    price: 10,
    ingredients: [
      { ingredient_name: "Biscoff", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 2.5 }
    ]
  },
  {
    product: "Oreo Cookies",
    category: "Addon",
    price: 10,
    ingredients: [
      { ingredient_name: "Oreo Cookies", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 2.9 }
    ]
  },
  {
    product: "KitKat",
    category: "Addon",
    price: 10,
    ingredients: [
      { ingredient_name: "KitKat", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 6.25 }
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

async function uploadAddonRecipeTemplate(recipe: AddonRecipe, userId: string): Promise<boolean> {
  try {
    console.log(`Creating addon recipe template: ${recipe.product}`);

    // Calculate total cost
    const totalCost = recipe.ingredients.reduce((sum, ing) => sum + (ing.quantity * ing.cost_per_unit), 0);
    const profitMargin = recipe.price - totalCost;
    const profitPercentage = totalCost > 0 ? ((profitMargin / totalCost) * 100) : 0;

    // Create the recipe template
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .insert({
        name: recipe.product,
        description: `${recipe.product} addon for croffle customization and enhancement`,
        category_name: recipe.category.toLowerCase(),
        instructions: `Apply ${recipe.product} as addon topping or ingredient enhancement`,
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
          uses_store_inventory: true
        });

      if (ingredientError) {
        console.error(`Error adding ingredient ${ingredient.ingredient_name}:`, ingredientError);
      } else {
        ingredientCount++;
      }
    }

    console.log(`   📦 Added ${ingredientCount}/${recipe.ingredients.length} ingredients`);
    console.log(`   💰 Cost: ₱${totalCost.toFixed(2)} | Price: ₱${recipe.price} | Profit: ₱${profitMargin.toFixed(2)} (${profitPercentage.toFixed(1)}%)`);

    return true;
  } catch (error) {
    console.error(`Error processing ${recipe.product}:`, error);
    return false;
  }
}

async function uploadAddonRecipes() {
  try {
    console.log('🚀 Starting addon recipe upload process...');

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
    console.log(`📊 Total addon recipes to upload: ${ADDON_RECIPES.length}`);

    let successCount = 0;
    let failCount = 0;

    // Upload each addon recipe
    for (const recipe of ADDON_RECIPES) {
      const success = await uploadAddonRecipeTemplate(recipe, authData.user.id);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log('\n📈 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${successCount} addon recipes`);
    console.log(`❌ Failed uploads: ${failCount} recipes`);
    console.log(`📊 Total processed: ${successCount + failCount} recipes`);

    if (failCount === 0) {
      console.log('\n🎉 All addon recipes uploaded successfully!');
      console.log('\n🧁 Uploaded addon categories:');
      console.log('   • Basic Toppings (₱6): Colored Sprinkles, Marshmallow, Choco Flakes, Peanut, Caramel, Chocolate, Tiramisu');
      console.log('   • Premium Spreads (₱8): Nutella, Dark Chocolate');
      console.log('   • Premium Toppings (₱10): Biscoff Crushed, Oreo Crushed, Biscoff, Oreo Cookies, KitKat');
      console.log('   • Fruit Jams (₱10): Strawberry Jam, Mango Jam, Blueberry Jam');
      console.log('\n💡 These addons are now ready for deployment and can be used as:');
      console.log('   • Standalone addon products');
      console.log('   • Customization options for croffles');
      console.log('   • Upsell items in the POS system');
    } else {
      console.log('\n⚠️  Some recipes failed to upload. Check the logs above for details.');
    }

  } catch (error) {
    console.error('❌ Fatal error during upload:', error);
    process.exit(1);
  }
}

// Run the upload
uploadAddonRecipes()
  .then(() => {
    console.log('\n✨ Addon recipe upload process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Upload process failed:', error);
    process.exit(1);
  });