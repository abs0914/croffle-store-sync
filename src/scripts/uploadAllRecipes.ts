import { createClient } from '@supabase/supabase-js';

// Supabase configuration (from the existing client)
const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Recipe templates with ingredients from individual scripts
const CROFFLE_RECIPES = [
  {
    name: 'Mini Croffle',
    category: 'croffles',
    base_price: 45,
    ingredients: [
      { ingredient_name: 'REGULAR CROISSANT', quantity: 0.5, unit: 'piece', cost_per_unit: 15 },
      { ingredient_name: 'WHIPPED CREAM', quantity: 0.5, unit: 'serving', cost_per_unit: 4 }
    ]
  },
  {
    name: 'Glaze Croffle',
    category: 'croffles',
    base_price: 60,
    ingredients: [
      { ingredient_name: 'REGULAR CROISSANT', quantity: 0.5, unit: 'piece', cost_per_unit: 15 },
      { ingredient_name: 'WHIPPED CREAM', quantity: 0.5, unit: 'serving', cost_per_unit: 4 },
      { ingredient_name: 'Glaze', quantity: 1, unit: 'portion', cost_per_unit: 2 }
    ]
  },
  {
    name: 'Regular Croffle',
    category: 'croffles',
    base_price: 105,
    ingredients: [
      { ingredient_name: 'REGULAR CROISSANT', quantity: 1, unit: 'piece', cost_per_unit: 15 },
      { ingredient_name: 'WHIPPED CREAM', quantity: 1, unit: 'serving', cost_per_unit: 4 }
    ]
  },
  {
    name: 'Nutella Croffle',
    category: 'croffles',
    base_price: 125,
    ingredients: [
      { ingredient_name: 'REGULAR CROISSANT', quantity: 1, unit: 'piece', cost_per_unit: 15 },
      { ingredient_name: 'WHIPPED CREAM', quantity: 1, unit: 'serving', cost_per_unit: 4 },
      { ingredient_name: 'Nutella', quantity: 1, unit: 'portion', cost_per_unit: 4.5 }
    ]
  },
  {
    name: 'Biscoff Croffle',
    category: 'croffles',
    base_price: 125,
    ingredients: [
      { ingredient_name: 'REGULAR CROISSANT', quantity: 1, unit: 'piece', cost_per_unit: 15 },
      { ingredient_name: 'WHIPPED CREAM', quantity: 1, unit: 'serving', cost_per_unit: 4 },
      { ingredient_name: 'Biscoff', quantity: 1, unit: 'portion', cost_per_unit: 2.5 }
    ]
  },
  {
    name: 'Peanut Butter Croffle',
    category: 'croffles',
    base_price: 125,
    ingredients: [
      { ingredient_name: 'REGULAR CROISSANT', quantity: 1, unit: 'piece', cost_per_unit: 15 },
      { ingredient_name: 'WHIPPED CREAM', quantity: 1, unit: 'serving', cost_per_unit: 4 },
      { ingredient_name: 'Peanut Butter', quantity: 1, unit: 'portion', cost_per_unit: 3 }
    ]
  },
  {
    name: 'Strawberry Croffle',
    category: 'croffles',
    base_price: 125,
    ingredients: [
      { ingredient_name: 'REGULAR CROISSANT', quantity: 1, unit: 'piece', cost_per_unit: 15 },
      { ingredient_name: 'WHIPPED CREAM', quantity: 1, unit: 'serving', cost_per_unit: 4 },
      { ingredient_name: 'Strawberry Jam', quantity: 1, unit: 'portion', cost_per_unit: 5 }
    ]
  },
  {
    name: 'Blueberry Croffle',
    category: 'croffles',
    base_price: 125,
    ingredients: [
      { ingredient_name: 'REGULAR CROISSANT', quantity: 1, unit: 'piece', cost_per_unit: 15 },
      { ingredient_name: 'WHIPPED CREAM', quantity: 1, unit: 'serving', cost_per_unit: 4 },
      { ingredient_name: 'Blueberry Jam', quantity: 1, unit: 'portion', cost_per_unit: 7.5 }
    ]
  },
  {
    name: 'Chocolate Croffle',
    category: 'croffles',
    base_price: 125,
    ingredients: [
      { ingredient_name: 'REGULAR CROISSANT', quantity: 1, unit: 'piece', cost_per_unit: 15 },
      { ingredient_name: 'WHIPPED CREAM', quantity: 1, unit: 'serving', cost_per_unit: 4 },
      { ingredient_name: 'Chocolate', quantity: 1, unit: 'portion', cost_per_unit: 2.5 }
    ]
  },
  {
    name: 'Caramel Croffle',
    category: 'croffles',
    base_price: 125,
    ingredients: [
      { ingredient_name: 'REGULAR CROISSANT', quantity: 1, unit: 'piece', cost_per_unit: 15 },
      { ingredient_name: 'WHIPPED CREAM', quantity: 1, unit: 'serving', cost_per_unit: 4 },
      { ingredient_name: 'Caramel', quantity: 1, unit: 'portion', cost_per_unit: 2.5 }
    ]
  },
  {
    name: 'Matcha Croffle',
    category: 'croffles',
    base_price: 125,
    ingredients: [
      { ingredient_name: 'REGULAR CROISSANT', quantity: 1, unit: 'piece', cost_per_unit: 15 },
      { ingredient_name: 'WHIPPED CREAM', quantity: 1, unit: 'serving', cost_per_unit: 4 },
      { ingredient_name: 'Matcha Powder', quantity: 1, unit: 'portion', cost_per_unit: 3 }
    ]
  },
  {
    name: 'Ube Croffle',
    category: 'croffles',
    base_price: 125,
    ingredients: [
      { ingredient_name: 'REGULAR CROISSANT', quantity: 1, unit: 'piece', cost_per_unit: 15 },
      { ingredient_name: 'WHIPPED CREAM', quantity: 1, unit: 'serving', cost_per_unit: 4 },
      { ingredient_name: 'Ube Flavor', quantity: 1, unit: 'portion', cost_per_unit: 3 }
    ]
  }
];

const DRINK_RECIPES = [
  {
    name: 'Coke',
    category: 'drinks',
    base_price: 15,
    ingredients: [
      { ingredient_name: 'Softdrinks', quantity: 1, unit: 'piece', cost_per_unit: 11.3 }
    ]
  },
  {
    name: 'Sprite',
    category: 'drinks',
    base_price: 15,
    ingredients: [
      { ingredient_name: 'Softdrinks', quantity: 1, unit: 'piece', cost_per_unit: 11.3 }
    ]
  },
  {
    name: 'Bottled Water',
    category: 'drinks',
    base_price: 20,
    ingredients: [
      { ingredient_name: 'Water', quantity: 1, unit: 'piece', cost_per_unit: 0 }
    ]
  },
  {
    name: 'Americano',
    category: 'drinks',
    base_price: 65,
    ingredients: [
      { ingredient_name: 'Coffee Beans', quantity: 1, unit: 'serving', cost_per_unit: 15 },
      { ingredient_name: 'Hot Water', quantity: 150, unit: 'ml', cost_per_unit: 0.01 }
    ]
  },
  {
    name: 'Cappuccino',
    category: 'drinks',
    base_price: 75,
    ingredients: [
      { ingredient_name: 'Coffee Beans', quantity: 1, unit: 'serving', cost_per_unit: 15 },
      { ingredient_name: 'Milk', quantity: 100, unit: 'ml', cost_per_unit: 0.05 }
    ]
  },
  {
    name: 'Latte',
    category: 'drinks',
    base_price: 75,
    ingredients: [
      { ingredient_name: 'Coffee Beans', quantity: 1, unit: 'serving', cost_per_unit: 15 },
      { ingredient_name: 'Milk', quantity: 150, unit: 'ml', cost_per_unit: 0.05 }
    ]
  }
];

const ADD_ON_RECIPES = [
  {
    name: 'Colored Sprinkles',
    category: 'add-ons',
    base_price: 6,
    ingredients: [
      { ingredient_name: 'Colored Sprinkles', quantity: 1, unit: 'portion', cost_per_unit: 2.5 }
    ]
  },
  {
    name: 'Marshmallow',
    category: 'add-ons',
    base_price: 6,
    ingredients: [
      { ingredient_name: 'Marshmallow', quantity: 1, unit: 'portion', cost_per_unit: 2.5 }
    ]
  },
  {
    name: 'Choco Flakes',
    category: 'add-ons',
    base_price: 6,
    ingredients: [
      { ingredient_name: 'Choco Flakes', quantity: 1, unit: 'portion', cost_per_unit: 2.5 }
    ]
  },
  {
    name: 'Peanut',
    category: 'add-ons',
    base_price: 6,
    ingredients: [
      { ingredient_name: 'Peanut', quantity: 1, unit: 'portion', cost_per_unit: 2.5 }
    ]
  },
  {
    name: 'Nutella',
    category: 'add-ons',
    base_price: 8,
    ingredients: [
      { ingredient_name: 'Nutella', quantity: 1, unit: 'portion', cost_per_unit: 4.5 }
    ]
  },
  {
    name: 'Whipped Cream',
    category: 'add-ons',
    base_price: 10,
    ingredients: [
      { ingredient_name: 'WHIPPED CREAM', quantity: 1, unit: 'serving', cost_per_unit: 4 }
    ]
  }
];

const COMBO_RECIPES = [
  {
    name: 'Mini Croffle + Any Hot Espresso',
    category: 'combos',
    base_price: 110,
    ingredients: [
      { ingredient_name: 'REGULAR CROISSANT', quantity: 0.5, unit: 'piece', cost_per_unit: 15 },
      { ingredient_name: 'WHIPPED CREAM', quantity: 0.5, unit: 'serving', cost_per_unit: 4 },
      { ingredient_name: 'Coffee Beans', quantity: 1, unit: 'serving', cost_per_unit: 15 }
    ]
  },
  {
    name: 'Regular Croffle + Any Hot Espresso',
    category: 'combos',
    base_price: 170,
    ingredients: [
      { ingredient_name: 'REGULAR CROISSANT', quantity: 1, unit: 'piece', cost_per_unit: 15 },
      { ingredient_name: 'WHIPPED CREAM', quantity: 1, unit: 'serving', cost_per_unit: 4 },
      { ingredient_name: 'Coffee Beans', quantity: 1, unit: 'serving', cost_per_unit: 15 }
    ]
  }
];

interface RecipeTemplate {
  name: string;
  category: string;
  base_price: number;
  ingredients: Array<{
    ingredient_name: string;
    quantity: number;
    unit: string;
    cost_per_unit: number;
  }>;
}

async function uploadRecipeTemplate(recipe: RecipeTemplate, userId: string): Promise<boolean> {
  try {
    console.log(`Creating recipe template: ${recipe.name}`);
    
    // Calculate total cost from ingredients
    const totalCost = recipe.ingredients.reduce((sum, ingredient) => {
      return sum + (ingredient.quantity * ingredient.cost_per_unit);
    }, 0);
    
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

    console.log(`Template created for ${recipe.name}: ${data.id}`);

    // Add ingredients
    const ingredientData = recipe.ingredients.map(ingredient => ({
      recipe_template_id: data.id,
      ingredient_name: ingredient.ingredient_name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      cost_per_unit: ingredient.cost_per_unit,
      location_type: 'all',
      supports_fractional: ingredient.quantity < 1
    }));

    const { error: ingredientError } = await supabase
      .from('recipe_template_ingredients')
      .insert(ingredientData);

    if (ingredientError) {
      console.error(`Error adding ingredients for ${recipe.name}:`, ingredientError);
      return false;
    }

    console.log(`✅ Created recipe template: ${recipe.name} with ${recipe.ingredients.length} ingredients`);
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

async function deployRecipesToStores(authData: any) {
  console.log('🏪 Deploying recipes to all stores...');
  
  // Get all stores
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('*')
    .eq('is_active', true);

  if (storesError) {
    console.error('❌ Error fetching stores:', storesError);
    return false;
  }

  console.log(`📍 Found ${stores.length} active stores`);

  // Get all recipe templates
  const { data: templates, error: templatesError } = await supabase
    .from('recipe_templates')
    .select('*')
    .eq('is_active', true);

  if (templatesError) {
    console.error('❌ Error fetching templates:', templatesError);
    return false;
  }

  console.log(`📋 Found ${templates.length} recipe templates`);

  let deployedCount = 0;
  let catalogCount = 0;

  for (const store of stores) {
    console.log(`\n🏪 Deploying to store: ${store.name}`);
    
    for (const template of templates) {
      try {
        // Check if recipe already exists for this store
        const { data: existingRecipe } = await supabase
          .from('recipes')
          .select('id')
          .eq('template_id', template.id)
          .eq('store_id', store.id)
          .maybeSingle();

        if (existingRecipe) {
          console.log(`  ⏭️  Recipe "${template.name}" already exists for ${store.name}`);
          continue;
        }

        // Deploy recipe to store
        const { data: recipe, error: recipeError } = await supabase
          .from('recipes')
          .insert({
            template_id: template.id,
            name: template.name,
            description: template.description,
            instructions: template.instructions,
            store_id: store.id,
            serving_size: template.serving_size,
            yield_quantity: template.yield_quantity,
            total_cost: 0, // Will be calculated by triggers
            cost_per_serving: 0,
            suggested_price: template.base_price || 0,
            sku: `${template.id.slice(0, 8)}-${store.id.slice(0, 8)}`,
            is_active: true,
            approval_status: 'approved'
          })
          .select()
          .single();

        if (recipeError) {
          console.error(`  ❌ Error deploying "${template.name}" to ${store.name}:`, recipeError);
          continue;
        }

        deployedCount++;
        console.log(`  ✅ Deployed "${template.name}" to ${store.name}`);

        // Get category for this recipe based on template category
        const categoryMapping = {
          'croffles': 'Classic',
          'drinks': 'Beverages', 
          'add-ons': 'Add-ons',
          'combos': 'Combo'
        };

        const categoryName = categoryMapping[template.category_name as keyof typeof categoryMapping] || 'Classic';
        
        const { data: category } = await supabase
          .from('categories')
          .select('id')
          .eq('store_id', store.id)
          .eq('name', categoryName)
          .eq('is_active', true)
          .maybeSingle();

        // Create product catalog entry with category
        const { data: catalogEntry, error: catalogError } = await supabase
          .from('product_catalog')
          .insert({
            store_id: store.id,
            recipe_id: recipe.id,
            product_name: template.name,
            description: template.description,
            price: template.base_price || 0,
            category_id: category?.id || null,
            is_available: true,
            display_order: 0
          })
          .select()
          .single();

        if (catalogError) {
          console.error(`  ❌ Error creating catalog entry for "${template.name}":`, catalogError);
        } else {
          catalogCount++;
          console.log(`  ✅ Created catalog entry for "${template.name}" (Category: ${categoryName})`);
        }

      } catch (error) {
        console.error(`  ❌ Error processing "${template.name}" for ${store.name}:`, error);
      }
    }
  }

  console.log(`\n📊 Deployment Summary:`);
  console.log(`✅ Recipes deployed: ${deployedCount}`);
  console.log(`✅ Catalog entries created: ${catalogCount}`);
  
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

    // Upload each recipe template
    for (const recipe of allRecipes) {
      const success = await uploadRecipeTemplate(recipe, authData.user.id);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log('\n📈 Template Upload Summary:');
    console.log(`✅ Successfully uploaded: ${successCount} templates`);
    console.log(`❌ Failed uploads: ${failCount} templates`);
    console.log(`📊 Total processed: ${successCount + failCount} templates`);

    if (failCount === 0) {
      console.log('\n🎉 All recipe templates uploaded successfully!');
      
      // Now deploy to stores
      const deploymentSuccess = await deployRecipesToStores(authData);
      
      if (deploymentSuccess) {
        console.log('\n🎊 All recipes deployed to stores and product catalog entries created!');
      } else {
        console.log('\n⚠️  Template upload completed but deployment had issues.');
      }
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