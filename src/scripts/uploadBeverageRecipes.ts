import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

interface BeverageIngredient {
  ingredient_name: string;
  unit_of_measure: string;
  quantity: number;
  cost_per_unit: number;
}

interface BeverageRecipe {
  product: string;
  category: string;
  price: number;
  ingredients: BeverageIngredient[];
}

// Beverage recipe data from the table
const BEVERAGE_RECIPES: BeverageRecipe[] = [
  {
    product: "Coke",
    category: "Others",
    price: 15,
    ingredients: [
      { ingredient_name: "Softdrinks", unit_of_measure: "piece", quantity: 20, cost_per_unit: 11.3 }
    ]
  },
  {
    product: "Sprite",
    category: "Others",
    price: 15,
    ingredients: [
      { ingredient_name: "Softdrinks", unit_of_measure: "piece", quantity: 20, cost_per_unit: 11.3 }
    ]
  },
  {
    product: "Bottled Water",
    category: "Others",
    price: 20,
    ingredients: [
      { ingredient_name: "Water", unit_of_measure: "piece", quantity: 20, cost_per_unit: 0 }
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

async function uploadBeverageRecipeTemplate(recipe: BeverageRecipe, userId: string): Promise<boolean> {
  try {
    console.log(`Creating beverage recipe template: ${recipe.product}`);
    
    // Calculate total cost
    const totalCost = recipe.ingredients.reduce((sum, ing) => sum + (ing.quantity * ing.cost_per_unit), 0);
    
    // Create the recipe template
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .insert({
        name: recipe.product,
        description: `${recipe.product} beverage recipe for retail service`,
        category_name: recipe.category.toLowerCase(),
        instructions: `Serve ${recipe.product} chilled as a ready-to-drink beverage`,
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
          ingredient_type: 'finished_good',
          uses_store_inventory: true
        });

      if (ingredientError) {
        console.error(`Error adding ingredient ${ingredient.ingredient_name}:`, ingredientError);
      } else {
        ingredientCount++;
      }
    }

    console.log(`   📦 Added ${ingredientCount}/${recipe.ingredients.length} ingredients`);
    console.log(`   💰 Total cost: ₱${totalCost.toFixed(2)} | Price: ₱${recipe.price} | Profit: ₱${(recipe.price - totalCost).toFixed(2)}`);
    
    return true;
  } catch (error) {
    console.error(`Error processing ${recipe.product}:`, error);
    return false;
  }
}

async function uploadBeverageRecipes() {
  try {
    console.log('🚀 Starting beverage recipe upload process...');
    
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
    console.log(`📊 Total beverage recipes to upload: ${BEVERAGE_RECIPES.length}`);

    let successCount = 0;
    let failCount = 0;

    // Upload each beverage recipe
    for (const recipe of BEVERAGE_RECIPES) {
      const success = await uploadBeverageRecipeTemplate(recipe, authData.user.id);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log('\n📈 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${successCount} beverage recipes`);
    console.log(`❌ Failed uploads: ${failCount} recipes`);
    console.log(`📊 Total processed: ${successCount + failCount} recipes`);

    if (failCount === 0) {
      console.log('\n🎉 All beverage recipes uploaded successfully!');
      console.log('\n🥤 Uploaded beverages include:');
      console.log('   • Coke - ₱15 (Ready-to-serve soft drink)');
      console.log('   • Sprite - ₱15 (Ready-to-serve soft drink)');
      console.log('   • Bottled Water - ₱20 (Ready-to-serve water)');
      console.log('\n💡 These beverages are now ready for deployment to stores and POS integration!');
      console.log('📋 Note: These are finished products that require inventory tracking.');
    } else {
      console.log('\n⚠️  Some recipes failed to upload. Check the logs above for details.');
    }

  } catch (error) {
    console.error('❌ Fatal error during upload:', error);
    process.exit(1);
  }
}

// Run the upload
uploadBeverageRecipes()
  .then(() => {
    console.log('\n✨ Beverage recipe upload process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Upload process failed:', error);
    process.exit(1);
  });
