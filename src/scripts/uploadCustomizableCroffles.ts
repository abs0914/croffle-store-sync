import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

interface CustomizableIngredient {
  ingredient_name: string;
  unit_of_measure: string;
  quantity: number;
  cost_per_unit: number;
  choice_type: 'Base' | 'Choice' | 'Packaging';
}

interface CustomizableRecipe {
  product: string;
  category: string;
  price: number;
  ingredients: CustomizableIngredient[];
}

// Recipe data from the table with choice group configurations
const CUSTOMIZABLE_RECIPES: CustomizableRecipe[] = [
  {
    product: "Croffle Overload",
    category: "Croffle Overload",
    price: 99,
    ingredients: [
      // Base ingredients (always included)
      { ingredient_name: "Regular Croissant", unit_of_measure: "Piece", quantity: 0.5, cost_per_unit: 15, choice_type: "Base" },
      { ingredient_name: "Vanilla Ice Cream", unit_of_measure: "Scoop", quantity: 1, cost_per_unit: 15.44, choice_type: "Base" },
      
      // Choice ingredients (customer selects 1)
      { ingredient_name: "Colored Sprinkles", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5, choice_type: "Choice" },
      { ingredient_name: "Peanut", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5, choice_type: "Choice" },
      { ingredient_name: "Choco Flakes", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5, choice_type: "Choice" },
      { ingredient_name: "Marshmallow", unit_of_measure: "Portion", quantity: 1, cost_per_unit: 2.5, choice_type: "Choice" },
      
      // Packaging ingredients (always included)
      { ingredient_name: "Overload Cup", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 4, choice_type: "Packaging" },
      { ingredient_name: "Popsicle Stick", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.3, choice_type: "Packaging" },
      { ingredient_name: "Mini Spoon", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.5, choice_type: "Packaging" }
    ]
  },
  {
    product: "Mini Croffle",
    category: "Mini Croffle",
    price: 65,
    ingredients: [
      // Base ingredients (always included)
      { ingredient_name: "Regular Croissant", unit_of_measure: "Piece", quantity: 0.5, cost_per_unit: 15, choice_type: "Base" },
      { ingredient_name: "Whipped Cream", unit_of_measure: "Serving", quantity: 0.5, cost_per_unit: 4, choice_type: "Base" },
      
      // Choice ingredients (customer selects 1)
      { ingredient_name: "Chocolate", unit_of_measure: "Portion", quantity: 0.5, cost_per_unit: 1.25, choice_type: "Choice" },
      { ingredient_name: "Caramel", unit_of_measure: "Portion", quantity: 0.5, cost_per_unit: 1.25, choice_type: "Choice" },
      { ingredient_name: "Tiramisu", unit_of_measure: "Portion", quantity: 0.5, cost_per_unit: 1.25, choice_type: "Choice" },
      { ingredient_name: "Colored Sprinkles", unit_of_measure: "Portion", quantity: 0.5, cost_per_unit: 1.25, choice_type: "Choice" },
      { ingredient_name: "Peanut", unit_of_measure: "Portion", quantity: 0.5, cost_per_unit: 1.25, choice_type: "Choice" },
      { ingredient_name: "Choco Flakes", unit_of_measure: "Portion", quantity: 0.5, cost_per_unit: 1.25, choice_type: "Choice" },
      { ingredient_name: "Marshmallow", unit_of_measure: "Portion", quantity: 0.5, cost_per_unit: 1.25, choice_type: "Choice" },
      
      // Packaging ingredients (always included)
      { ingredient_name: "Mini Take-Out Box", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 2.4, choice_type: "Packaging" },
      { ingredient_name: "Popsicle Stick", unit_of_measure: "Piece", quantity: 1, cost_per_unit: 0.3, choice_type: "Packaging" }
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

async function uploadCustomizableRecipeTemplate(recipe: CustomizableRecipe, userId: string): Promise<boolean> {
  try {
    console.log(`Creating customizable recipe template: ${recipe.product}`);
    
    // Calculate base cost (required ingredients only)
    const baseCost = recipe.ingredients
      .filter(ing => ing.choice_type === 'Base' || ing.choice_type === 'Packaging')
      .reduce((sum, ing) => sum + (ing.quantity * ing.cost_per_unit), 0);
    
    // Calculate choice ingredient costs (for reference)
    const choiceIngredients = recipe.ingredients.filter(ing => ing.choice_type === 'Choice');
    const avgChoiceCost = choiceIngredients.length > 0 
      ? choiceIngredients.reduce((sum, ing) => sum + (ing.quantity * ing.cost_per_unit), 0) / choiceIngredients.length 
      : 0;
    
    // Create the recipe template
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .insert({
        name: recipe.product,
        description: `Customizable ${recipe.product} with choice groups for toppings/sauces`,
        category_name: recipe.category.toLowerCase().replace(' ', '_'),
        instructions: `Prepare ${recipe.product} with customer's selected topping/sauce choice`,
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

    // Add ingredients with choice group configurations
    let ingredientCount = 0;
    
    for (const ingredient of recipe.ingredients) {
      let choiceGroupName = null;
      let choiceGroupType = null;
      let isOptional = false;
      
      // Configure choice groups based on ingredient type
      if (ingredient.choice_type === 'Choice') {
        choiceGroupName = `${recipe.product.toLowerCase().replace(' ', '_')}_topping_choice`;
        choiceGroupType = 'required_one'; // Customer must select exactly one
        isOptional = false;
      }
      
      const { error: ingredientError } = await supabase
        .from('recipe_template_ingredients')
        .insert({
          recipe_template_id: template.id,
          ingredient_name: ingredient.ingredient_name,
          commissary_item_name: ingredient.ingredient_name,
          quantity: ingredient.quantity,
          unit: ingredient.unit_of_measure,
          cost_per_unit: ingredient.cost_per_unit,
          ingredient_type: ingredient.choice_type === 'Packaging' ? 'packaging' : 'raw_material',
          uses_store_inventory: false,
          choice_group_name: choiceGroupName,
          group_selection_type: choiceGroupType,
          is_optional: isOptional,
          display_order: ingredient.choice_type === 'Base' ? 1 : 
                        ingredient.choice_type === 'Choice' ? 2 : 3
        });

      if (ingredientError) {
        console.error(`Error adding ingredient ${ingredient.ingredient_name}:`, ingredientError);
      } else {
        ingredientCount++;
      }
    }

    // Count ingredients by type
    const baseCount = recipe.ingredients.filter(ing => ing.choice_type === 'Base').length;
    const choiceCount = recipe.ingredients.filter(ing => ing.choice_type === 'Choice').length;
    const packagingCount = recipe.ingredients.filter(ing => ing.choice_type === 'Packaging').length;

    console.log(`   📦 Added ${ingredientCount}/${recipe.ingredients.length} ingredients`);
    console.log(`   🔧 Base: ${baseCount} | Choice: ${choiceCount} | Packaging: ${packagingCount}`);
    console.log(`   💰 Base cost: ₱${baseCost.toFixed(2)} | Avg choice cost: ₱${avgChoiceCost.toFixed(2)} | Price: ₱${recipe.price}`);
    console.log(`   🎯 Choice group: "${recipe.product.toLowerCase().replace(' ', '_')}_topping_choice" (select 1 required)`);
    
    return true;
  } catch (error) {
    console.error(`Error processing ${recipe.product}:`, error);
    return false;
  }
}

async function uploadCustomizableRecipes() {
  try {
    console.log('🚀 Starting customizable recipe upload process...');
    
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
    console.log(`📊 Total customizable recipes to upload: ${CUSTOMIZABLE_RECIPES.length}`);

    let successCount = 0;
    let failCount = 0;

    // Upload each customizable recipe
    for (const recipe of CUSTOMIZABLE_RECIPES) {
      const success = await uploadCustomizableRecipeTemplate(recipe, authData.user.id);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log('\n📈 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${successCount} customizable recipes`);
    console.log(`❌ Failed uploads: ${failCount} recipes`);
    console.log(`📊 Total processed: ${successCount + failCount} recipes`);

    if (failCount === 0) {
      console.log('\n🎉 All customizable recipes uploaded successfully!');
      console.log('\n🔧 Features implemented:');
      console.log('   • Choice groups for customer topping/sauce selection');
      console.log('   • Required base ingredients (always included)');
      console.log('   • Optional choice ingredients (select exactly 1)');
      console.log('   • Packaging ingredients (always included)');
      console.log('   • Proper cost calculation and pricing');
      console.log('\n💡 These recipes are now ready for POS system integration with customization options!');
    } else {
      console.log('\n⚠️  Some recipes failed to upload. Check the logs above for details.');
    }

  } catch (error) {
    console.error('❌ Fatal error during upload:', error);
    process.exit(1);
  }
}

// Run the upload
uploadCustomizableRecipes()
  .then(() => {
    console.log('\n✨ Customizable recipe upload process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Upload process failed:', error);
    process.exit(1);
  });
