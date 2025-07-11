import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

interface RecipeIngredient {
  ingredient_name: string;
  unit_of_measure: string;
  quantity: number;
  cost_per_unit: number;
}

interface DetailedRecipe {
  product: string;
  category: string;
  price: number;
  ingredients: RecipeIngredient[];
}

// Recipe data from the table
const DETAILED_RECIPES: DetailedRecipe[] = [
  {
    product: "Tiramisu",
    category: "Classic",
    price: 125,
    ingredients: [
      { ingredient_name: "Regular Croissant", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 30 },
      { ingredient_name: "Whipped Cream", unit_of_measure: "Serving", quantity: 1, cost_per_unit: 8 },
      { ingredient_name: "Tiramisu", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 3.5 },
      { ingredient_name: "Choco Flakes", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5 },
      { ingredient_name: "Chopstick", unit_of_measure: "Pair", quantity: 1, cost_per_unit: 0.6 },
      { ingredient_name: "Wax Paper", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    product: "Choco Nut",
    category: "Classic",
    price: 125,
    ingredients: [
      { ingredient_name: "Regular Croissant", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 30 },
      { ingredient_name: "Whipped Cream", unit_of_measure: "Serving", quantity: 1, cost_per_unit: 8 },
      { ingredient_name: "Chocolate", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5 },
      { ingredient_name: "Peanut", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5 },
      { ingredient_name: "Chopstick", unit_of_measure: "Pair", quantity: 1, cost_per_unit: 0.6 },
      { ingredient_name: "Wax Paper", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    product: "Caramel Delight",
    category: "Classic",
    price: 125,
    ingredients: [
      { ingredient_name: "Regular Croissant", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 30 },
      { ingredient_name: "Whipped Cream", unit_of_measure: "Serving", quantity: 1, cost_per_unit: 8 },
      { ingredient_name: "Caramel", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5 },
      { ingredient_name: "Colored Sprinkles", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5 },
      { ingredient_name: "Chopstick", unit_of_measure: "Pair", quantity: 1, cost_per_unit: 0.6 },
      { ingredient_name: "Wax Paper", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    product: "Choco Marshmallow",
    category: "Classic",
    price: 125,
    ingredients: [
      { ingredient_name: "Regular Croissant", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 30 },
      { ingredient_name: "Whipped Cream", unit_of_measure: "Serving", quantity: 1, cost_per_unit: 8 },
      { ingredient_name: "Chocolate", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5 },
      { ingredient_name: "Marshmallow", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5 },
      { ingredient_name: "Chopstick", unit_of_measure: "Pair", quantity: 1, cost_per_unit: 0.6 },
      { ingredient_name: "Wax Paper", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    product: "Strawberry",
    category: "Classic",
    price: 125,
    ingredients: [
      { ingredient_name: "Regular Croissant", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 30 },
      { ingredient_name: "Whipped Cream", unit_of_measure: "Serving", quantity: 1, cost_per_unit: 8 },
      { ingredient_name: "Strawberry Jam", unit_of_measure: "Scoop", quantity: 1, cost_per_unit: 5 },
      { ingredient_name: "Chopstick", unit_of_measure: "Pair", quantity: 1, cost_per_unit: 0.6 },
      { ingredient_name: "Wax Paper", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    product: "Mango",
    category: "Classic",
    price: 125,
    ingredients: [
      { ingredient_name: "Regular Croissant", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 30 },
      { ingredient_name: "Whipped Cream", unit_of_measure: "Serving", quantity: 1, cost_per_unit: 8 },
      { ingredient_name: "Mango Jam", unit_of_measure: "Scoop", quantity: 1, cost_per_unit: 7 },
      { ingredient_name: "Graham Crushed", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5 },
      { ingredient_name: "Chopstick", unit_of_measure: "Pair", quantity: 1, cost_per_unit: 0.6 },
      { ingredient_name: "Wax Paper", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    product: "Blueberry",
    category: "Classic",
    price: 125,
    ingredients: [
      { ingredient_name: "Regular Croissant", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 30 },
      { ingredient_name: "Whipped Cream", unit_of_measure: "Serving", quantity: 1, cost_per_unit: 8 },
      { ingredient_name: "Blueberry Jam", unit_of_measure: "Scoop", quantity: 1, cost_per_unit: 7.5 },
      { ingredient_name: "Graham Crushed", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5 },
      { ingredient_name: "Chopstick", unit_of_measure: "Pair", quantity: 1, cost_per_unit: 0.6 },
      { ingredient_name: "Wax Paper", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    product: "Biscoff",
    category: "Classic",
    price: 125,
    ingredients: [
      { ingredient_name: "Regular Croissant", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 30 },
      { ingredient_name: "Whipped Cream", unit_of_measure: "Serving", quantity: 1, cost_per_unit: 8 },
      { ingredient_name: "Biscoff Crushed", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 5 },
      { ingredient_name: "Biscoff", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 5.62 },
      { ingredient_name: "Chopstick", unit_of_measure: "Pair", quantity: 1, cost_per_unit: 0.6 },
      { ingredient_name: "Wax Paper", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    product: "Nutella",
    category: "Classic",
    price: 125,
    ingredients: [
      { ingredient_name: "Regular Croissant", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 30 },
      { ingredient_name: "Whipped Cream", unit_of_measure: "Serving", quantity: 1, cost_per_unit: 8 },
      { ingredient_name: "Nutella", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 4.5 },
      { ingredient_name: "Chopstick", unit_of_measure: "Pair", quantity: 1, cost_per_unit: 0.6 },
      { ingredient_name: "Wax Paper", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    product: "KitKat",
    category: "Classic",
    price: 125,
    ingredients: [
      { ingredient_name: "Regular Croissant", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 30 },
      { ingredient_name: "Whipped Cream", unit_of_measure: "Serving", quantity: 1, cost_per_unit: 8 },
      { ingredient_name: "Chocolate", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5 },
      { ingredient_name: "KitKat", unit_of_measure: "Piece", quantity: 0.5, cost_per_unit: 6.25 },
      { ingredient_name: "Chopstick", unit_of_measure: "Pair", quantity: 1, cost_per_unit: 0.6 },
      { ingredient_name: "Wax Paper", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    product: "Cookies & Cream",
    category: "Classic",
    price: 125,
    ingredients: [
      { ingredient_name: "Regular Croissant", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 30 },
      { ingredient_name: "Whipped Cream", unit_of_measure: "Serving", quantity: 1, cost_per_unit: 8 },
      { ingredient_name: "Oreo Crushed", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5 },
      { ingredient_name: "Oreo Cookies", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 2.9 },
      { ingredient_name: "Chopstick", unit_of_measure: "Pair", quantity: 1, cost_per_unit: 0.6 },
      { ingredient_name: "Wax Paper", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    product: "Choco Overload",
    category: "Classic",
    price: 125,
    ingredients: [
      { ingredient_name: "Regular Croissant", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 30 },
      { ingredient_name: "Whipped Cream", unit_of_measure: "Serving", quantity: 1, cost_per_unit: 8 },
      { ingredient_name: "Chocolate", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5 },
      { ingredient_name: "Choco Flakes", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5 },
      { ingredient_name: "Chopstick", unit_of_measure: "Pair", quantity: 1, cost_per_unit: 0.6 },
      { ingredient_name: "Wax Paper", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    product: "Matcha",
    category: "Classic",
    price: 125,
    ingredients: [
      { ingredient_name: "Regular Croissant", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 30 },
      { ingredient_name: "Whipped Cream", unit_of_measure: "Serving", quantity: 1, cost_per_unit: 8 },
      { ingredient_name: "Matcha Crumble", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5 },
      { ingredient_name: "Chopstick", unit_of_measure: "Pair", quantity: 1, cost_per_unit: 0.6 },
      { ingredient_name: "Wax Paper", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.7 }
    ]
  },
  {
    product: "Dark Chocolate",
    category: "Classic",
    price: 125,
    ingredients: [
      { ingredient_name: "Regular Croissant", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 30 },
      { ingredient_name: "Whipped Cream", unit_of_measure: "Serving", quantity: 1, cost_per_unit: 8 },
      { ingredient_name: "Dark Chocolate", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5 },
      { ingredient_name: "Chocolate Crumble", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5 },
      { ingredient_name: "Chopstick", unit_of_measure: "Pair", quantity: 1, cost_per_unit: 0.6 },
      { ingredient_name: "Wax Paper", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.7 }
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

async function uploadDetailedRecipeTemplate(recipe: DetailedRecipe, userId: string): Promise<boolean> {
  try {
    console.log(`Creating detailed recipe template: ${recipe.product}`);
    
    // Calculate total cost
    const totalCost = recipe.ingredients.reduce((sum, ing) => sum + (ing.quantity * ing.cost_per_unit), 0);
    
    // Create the recipe template
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .insert({
        name: recipe.product,
        description: `${recipe.product} croffle recipe with detailed ingredients`,
        category_name: recipe.category.toLowerCase(),
        instructions: `Prepare ${recipe.product} croffle with all specified ingredients`,
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

async function uploadDetailedRecipes() {
  try {
    console.log('🚀 Starting detailed recipe upload process...');
    
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
    console.log(`📊 Total detailed recipes to upload: ${DETAILED_RECIPES.length}`);

    let successCount = 0;
    let failCount = 0;

    // Upload each detailed recipe
    for (const recipe of DETAILED_RECIPES) {
      const success = await uploadDetailedRecipeTemplate(recipe, authData.user.id);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log('\n📈 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${successCount} detailed recipes`);
    console.log(`❌ Failed uploads: ${failCount} recipes`);
    console.log(`📊 Total processed: ${successCount + failCount} recipes`);

    if (failCount === 0) {
      console.log('\n🎉 All detailed recipes uploaded successfully!');
    } else {
      console.log('\n⚠️  Some recipes failed to upload. Check the logs above for details.');
    }

  } catch (error) {
    console.error('❌ Fatal error during upload:', error);
    process.exit(1);
  }
}

// Run the upload
uploadDetailedRecipes()
  .then(() => {
    console.log('\n✨ Detailed recipe upload process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Upload process failed:', error);
    process.exit(1);
  });
