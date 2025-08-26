/**
 * Direct Bulk Recipe Upload Script
 * 
 * Instructions:
 * 1. Open your browser console (F12)
 * 2. Navigate to any page in your croffle-store-sync admin panel
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to execute
 * 
 * This will upload all 15 classic croffle recipes with ingredients.
 */

(async function bulkUploadRecipes() {
  console.log('🚀 Starting bulk recipe upload...');
  
  // Recipe data from the table
  const recipes = [
    {
      product: 'Tiramisu',
      category: 'Classic',
      price: 125,
      ingredients: [
        { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
        { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
        { name: 'Tiramisu', unit: 'portion', quantity: 1, cost: 3.5 },
        { name: 'Choco Flakes', unit: 'portion', quantity: 1, cost: 2.5 },
        { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
        { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
      ]
    },
    {
      product: 'Choco Nut',
      category: 'Classic',
      price: 125,
      ingredients: [
        { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
        { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
        { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
        { name: 'Peanut', unit: 'portion', quantity: 1, cost: 2.5 },
        { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
        { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
      ]
    },
    {
      product: 'Caramel Delight',
      category: 'Classic',
      price: 125,
      ingredients: [
        { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
        { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
        { name: 'Caramel', unit: 'portion', quantity: 1, cost: 2.5 },
        { name: 'Colored Sprinkles', unit: 'portion', quantity: 1, cost: 2.5 },
        { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
        { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
      ]
    },
    {
      product: 'Choco Marshmallow',
      category: 'Classic',
      price: 125,
      ingredients: [
        { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
        { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
        { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
        { name: 'Marshmallow', unit: 'portion', quantity: 1, cost: 2.5 },
        { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
        { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
      ]
    },
    {
      product: 'Strawberry',
      category: 'Classic',
      price: 125,
      ingredients: [
        { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
        { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
        { name: 'Strawberry Jam', unit: 'scoop', quantity: 1, cost: 5 },
        { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
        { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
      ]
    },
    {
      product: 'Mango',
      category: 'Classic',
      price: 125,
      ingredients: [
        { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
        { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
        { name: 'Mango Jam', unit: 'scoop', quantity: 1, cost: 7 },
        { name: 'Graham Crushed', unit: 'portion', quantity: 1, cost: 2.5 },
        { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
        { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
      ]
    },
    {
      product: 'Blueberry',
      category: 'Classic',
      price: 125,
      ingredients: [
        { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
        { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
        { name: 'Blueberry Jam', unit: 'scoop', quantity: 1, cost: 7.5 },
        { name: 'Graham Crushed', unit: 'portion', quantity: 1, cost: 2.5 },
        { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
        { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
      ]
    },
    {
      product: 'Biscoff',
      category: 'Classic',
      price: 125,
      ingredients: [
        { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
        { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
        { name: 'Biscoff Crushed', unit: 'portion', quantity: 1, cost: 5 },
        { name: 'Biscoff', unit: 'piece', quantity: 1, cost: 5.62 },
        { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
        { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
      ]
    },
    {
      product: 'Nutella',
      category: 'Classic',
      price: 125,
      ingredients: [
        { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
        { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
        { name: 'Nutella', unit: 'portion', quantity: 1, cost: 4.5 },
        { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
        { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
      ]
    },
    {
      product: 'KitKat',
      category: 'Classic',
      price: 125,
      ingredients: [
        { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
        { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
        { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
        { name: 'KitKat', unit: 'piece', quantity: 0.5, cost: 6.25 },
        { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
        { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
      ]
    },
    {
      product: 'Cookies & Cream',
      category: 'Classic',
      price: 125,
      ingredients: [
        { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
        { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
        { name: 'Oreo Crushed', unit: 'portion', quantity: 1, cost: 2.5 },
        { name: 'Oreo Cookies', unit: 'piece', quantity: 1, cost: 2.9 },
        { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
        { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
      ]
    },
    {
      product: 'Choco Overload',
      category: 'Classic',
      price: 125,
      ingredients: [
        { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
        { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
        { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
        { name: 'Choco Flakes', unit: 'portion', quantity: 1, cost: 2.5 },
        { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
        { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
      ]
    },
    {
      product: 'Matcha',
      category: 'Classic',
      price: 125,
      ingredients: [
        { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
        { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
        { name: 'Matcha Crumble', unit: 'portion', quantity: 1, cost: 2.5 },
        { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
        { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
      ]
    },
    {
      product: 'Dark Chocolate',
      category: 'Classic',
      price: 125,
      ingredients: [
        { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
        { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
        { name: 'Dark Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
        { name: 'Chocolate Crumble', unit: 'portion', quantity: 1, cost: 2.5 },
        { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
        { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
      ]
    }
  ];

  // Create Supabase client with the correct configuration
  let supabase;

  try {
    // Try to get existing client from window
    if (window.supabase) {
      supabase = window.supabase;
      console.log('✅ Using existing Supabase client');
    } else {
      // Import Supabase and create client
      const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js');
      supabase = createClient(
        'https://bwmkqscqkfoezcuzgpwq.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc',
        {
          auth: {
            storage: localStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'implicit'
          }
        }
      );
      console.log('✅ Created new Supabase client');
    }
  } catch (error) {
    console.error('❌ Error setting up Supabase client:', error);
    console.log('💡 Please make sure you are logged into the admin panel and try again.');
    return;
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ User not authenticated');
    return;
  }

  console.log(`👤 Authenticated as: ${user.email}`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Process each recipe
  for (const recipe of recipes) {
    try {
      console.log(`🔄 Processing: ${recipe.product}`);
      
      // Calculate total cost
      const totalCost = recipe.ingredients.reduce((sum, ing) => sum + (ing.cost * ing.quantity), 0);
      
      // Check if template exists
      const { data: existingTemplate } = await supabase
        .from('recipe_templates')
        .select('id')
        .eq('name', recipe.product)
        .single();

      let templateId;

      if (existingTemplate) {
        console.log(`📝 Updating existing template: ${recipe.product}`);
        templateId = existingTemplate.id;
        
        // Update template
        await supabase
          .from('recipe_templates')
          .update({
            description: `${recipe.product} croffle with detailed ingredients`,
            category_name: recipe.category.toLowerCase(),
            total_cost: totalCost,
            suggested_price: recipe.price,
            updated_at: new Date().toISOString()
          })
          .eq('id', templateId);

        // Delete existing ingredients
        await supabase
          .from('recipe_template_ingredients')
          .delete()
          .eq('recipe_template_id', templateId);
      } else {
        console.log(`➕ Creating new template: ${recipe.product}`);
        
        // Create new template
        const { data: newTemplate, error: templateError } = await supabase
          .from('recipe_templates')
          .insert({
            name: recipe.product,
            description: `${recipe.product} croffle with detailed ingredients`,
            category_name: recipe.category.toLowerCase(),
            instructions: `Prepare ${recipe.product} croffle with all specified ingredients`,
            yield_quantity: 1,
            serving_size: 1,
            total_cost: totalCost,
            suggested_price: recipe.price,
            version: 1,
            is_active: true,
            created_by: user.id
          })
          .select('id')
          .single();

        if (templateError) throw templateError;
        templateId = newTemplate.id;
      }

      // Process ingredients
      const ingredientInserts = [];
      
      for (const ingredient of recipe.ingredients) {
        // Find or create commissary item
        let { data: commissaryItem } = await supabase
          .from('commissary_inventory')
          .select('id')
          .eq('name', ingredient.name)
          .eq('is_active', true)
          .single();

        if (!commissaryItem) {
          console.log(`🔄 Creating commissary item: ${ingredient.name}`);
          
          const { data: newItem, error: itemError } = await supabase
            .from('commissary_inventory')
            .insert({
              name: ingredient.name,
              category: 'raw_materials',
              item_type: 'raw_material',
              current_stock: 100,
              minimum_threshold: 10,
              unit: ingredient.unit,
              unit_cost: ingredient.cost,
              is_active: true
            })
            .select('id')
            .single();

          if (itemError) {
            console.warn(`⚠️ Could not create commissary item: ${ingredient.name}`, itemError);
            continue;
          }
          commissaryItem = newItem;
        }

        ingredientInserts.push({
          recipe_template_id: templateId,
          commissary_item_id: commissaryItem.id,
          ingredient_name: ingredient.name,
          commissary_item_name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost_per_unit: ingredient.cost,
          recipe_unit: ingredient.unit,
          purchase_unit: ingredient.unit,
          conversion_factor: 1,
          location_type: 'all'
        });
      }

      // Insert ingredients
      if (ingredientInserts.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_template_ingredients')
          .insert(ingredientInserts);

        if (ingredientsError) throw ingredientsError;
      }

      console.log(`✅ Successfully processed: ${recipe.product} (${ingredientInserts.length} ingredients)`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Error processing ${recipe.product}:`, error);
      errorCount++;
      errors.push(recipe.product);
    }
  }

  // Summary
  console.log(`\n📊 UPLOAD SUMMARY:`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log(`❌ Failed recipes: ${errors.join(', ')}`);
  }

  console.log(`\n🎉 Bulk upload completed! You can now check the Recipe Templates page.`);
})();
