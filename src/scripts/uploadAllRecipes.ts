import { createClient } from '@supabase/supabase-js';

// Supabase configuration (from the existing client)
const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Recipe templates from menuRecipeService.ts
const CROFFLE_RECIPES = [
  { name: 'Mini Croffle', category: 'croffles', base_price: 45 },
  { name: 'Glaze Croffle', category: 'croffles', base_price: 60 },
  { name: 'Regular Croffle', category: 'croffles', base_price: 105 },
  { name: 'Nutella Croffle', category: 'croffles', base_price: 125 },
  { name: 'Biscoff Croffle', category: 'croffles', base_price: 125 },
  { name: 'Peanut Butter Croffle', category: 'croffles', base_price: 125 },
  { name: 'Strawberry Croffle', category: 'croffles', base_price: 125 },
  { name: 'Blueberry Croffle', category: 'croffles', base_price: 125 },
  { name: 'Chocolate Croffle', category: 'croffles', base_price: 125 },
  { name: 'Caramel Croffle', category: 'croffles', base_price: 125 },
  { name: 'Matcha Croffle', category: 'croffles', base_price: 125 },
  { name: 'Ube Croffle', category: 'croffles', base_price: 125 },
];

const DRINK_RECIPES = [
  { name: 'Americano', category: 'drinks', base_price: 65 },
  { name: 'Cappuccino', category: 'drinks', base_price: 75 },
  { name: 'Latte', category: 'drinks', base_price: 75 },
  { name: 'Macchiato', category: 'drinks', base_price: 80 },
  { name: 'Mocha', category: 'drinks', base_price: 85 },
  { name: 'Flat White', category: 'drinks', base_price: 80 },
  { name: 'Cortado', category: 'drinks', base_price: 75 },
  { name: 'Gibraltar', category: 'drinks', base_price: 75 },
  { name: 'Espresso Romano', category: 'drinks', base_price: 70 },
  { name: 'Affogato', category: 'drinks', base_price: 95 },
  { name: 'Hot Chocolate', category: 'drinks', base_price: 75 },
  { name: 'Chai Latte', category: 'drinks', base_price: 80 },
  { name: 'Matcha Latte', category: 'drinks', base_price: 85 },
  { name: 'Iced Coffee', category: 'drinks', base_price: 65 },
  { name: 'Cold Brew', category: 'drinks', base_price: 70 },
  { name: 'Frappuccino', category: 'drinks', base_price: 95 },
];

const ADD_ON_RECIPES = [
  { name: 'Extra Shot', category: 'add-ons', base_price: 15 },
  { name: 'Decaf Shot', category: 'add-ons', base_price: 0 },
  { name: 'Extra Hot', category: 'add-ons', base_price: 0 },
  { name: 'Extra Foam', category: 'add-ons', base_price: 0 },
  { name: 'No Foam', category: 'add-ons', base_price: 0 },
  { name: 'Oat Milk', category: 'add-ons', base_price: 20 },
  { name: 'Almond Milk', category: 'add-ons', base_price: 20 },
  { name: 'Soy Milk', category: 'add-ons', base_price: 20 },
  { name: 'Coconut Milk', category: 'add-ons', base_price: 20 },
  { name: 'Vanilla Syrup', category: 'add-ons', base_price: 15 },
  { name: 'Caramel Syrup', category: 'add-ons', base_price: 15 },
  { name: 'Hazelnut Syrup', category: 'add-ons', base_price: 15 },
  { name: 'Sugar-Free Vanilla', category: 'add-ons', base_price: 15 },
  { name: 'Whipped Cream', category: 'add-ons', base_price: 10 },
];

const COMBO_RECIPES = [
  { name: 'Mini Croffle + Any Hot Espresso', category: 'combos', base_price: 110 },
  { name: 'Mini Croffle + Any Iced Espresso', category: 'combos', base_price: 115 },
  { name: 'Glaze Croffle + Any Hot Espresso', category: 'combos', base_price: 125 },
  { name: 'Glaze Croffle + Any Iced Espresso', category: 'combos', base_price: 130 },
  { name: 'Regular Croffle + Any Hot Espresso', category: 'combos', base_price: 170 },
  { name: 'Regular Croffle + Any Iced Espresso', category: 'combos', base_price: 175 },
];

interface RecipeTemplate {
  name: string;
  category: string;
  base_price: number;
}

async function uploadRecipeTemplate(recipe: RecipeTemplate, userId: string): Promise<boolean> {
  try {
    console.log(`Creating recipe template: ${recipe.name}`);
    
    const { data, error } = await supabase
      .from('recipe_templates')
      .insert({
        name: recipe.name,
        description: `${recipe.name} recipe template`,
        category_name: recipe.category,
        instructions: 'Standard preparation method',
        yield_quantity: 1,
        serving_size: 1,
        version: 1,
        is_active: true,
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      console.error(`Error creating template for ${recipe.name}:`, error);
      return false;
    }

    console.log(`✅ Created recipe template: ${recipe.name} (ID: ${data.id})`);
    return true;
  } catch (error) {
    console.error(`Error processing ${recipe.name}:`, error);
    return false;
  }
}

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

async function uploadAllRecipes() {
  try {
    console.log('🚀 Starting recipe upload process...');

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

    // Combine all recipes
    const allRecipes = [
      ...CROFFLE_RECIPES,
      ...DRINK_RECIPES,
      ...ADD_ON_RECIPES,
      ...COMBO_RECIPES
    ];

    console.log(`📊 Total recipes to upload: ${allRecipes.length}`);

    let successCount = 0;
    let failCount = 0;

    // Upload each recipe
    for (const recipe of allRecipes) {
      const success = await uploadRecipeTemplate(recipe, authData.user.id);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log('\n📈 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${successCount} recipes`);
    console.log(`❌ Failed uploads: ${failCount} recipes`);
    console.log(`📊 Total processed: ${successCount + failCount} recipes`);

    if (failCount === 0) {
      console.log('\n🎉 All recipes uploaded successfully!');
    } else {
      console.log('\n⚠️  Some recipes failed to upload. Check the logs above for details.');
    }

  } catch (error) {
    console.error('❌ Fatal error during upload:', error);
    process.exit(1);
  }
}

// Run the upload
uploadAllRecipes()
  .then(() => {
    console.log('\n✨ Upload process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Upload process failed:', error);
    process.exit(1);
  });