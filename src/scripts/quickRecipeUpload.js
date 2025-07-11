/**
 * Quick Recipe Upload - Console Script
 * 
 * Copy and paste this into browser console on any admin page to upload all recipes.
 */

async function quickUploadAllRecipes() {
  console.log('🚀 Quick Recipe Upload Starting...');

  // All recipe data in one place
  const recipes = [
    // Classic Croffles
    { product: 'Tiramisu', category: 'classic', price: 125, ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Tiramisu', unit: 'portion', quantity: 1, cost: 3.5 },
      { name: 'Choco Flakes', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]},
    { product: 'Choco Nut', category: 'classic', price: 125, ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Peanut', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]},
    { product: 'Caramel Delight', category: 'classic', price: 125, ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Caramel', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Colored Sprinkles', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]},
    { product: 'Choco Marshmallow', category: 'classic', price: 125, ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Marshmallow', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]},
    { product: 'Strawberry', category: 'classic', price: 125, ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Strawberry Jam', unit: 'scoop', quantity: 1, cost: 5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]},
    { product: 'Mango', category: 'classic', price: 125, ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Mango Jam', unit: 'scoop', quantity: 1, cost: 7 },
      { name: 'Graham Crushed', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]},
    { product: 'Blueberry', category: 'classic', price: 125, ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Blueberry Jam', unit: 'scoop', quantity: 1, cost: 7.5 },
      { name: 'Graham Crushed', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]},
    { product: 'Biscoff', category: 'classic', price: 125, ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Biscoff Crushed', unit: 'portion', quantity: 1, cost: 5 },
      { name: 'Biscoff', unit: 'piece', quantity: 1, cost: 5.62 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]},
    { product: 'Nutella', category: 'classic', price: 125, ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Nutella', unit: 'portion', quantity: 1, cost: 4.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]},
    { product: 'KitKat', category: 'classic', price: 125, ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'KitKat', unit: 'piece', quantity: 0.5, cost: 6.25 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]},
    { product: 'Cookies & Cream', category: 'classic', price: 125, ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Oreo Crushed', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Oreo Cookies', unit: 'piece', quantity: 1, cost: 2.9 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]},
    { product: 'Choco Overload', category: 'classic', price: 125, ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Choco Flakes', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]},
    { product: 'Matcha', category: 'classic', price: 125, ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Matcha Crumble', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]},
    { product: 'Dark Chocolate', category: 'classic', price: 125, ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Dark Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chocolate Crumble', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]},
    
    // Coffee Drinks
    { product: 'Americano (Hot)', category: 'espresso', price: 65, ingredients: [
      { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
      { name: 'Hot Water', unit: 'ml', quantity: 150, cost: 0 }
    ]},
    { product: 'Americano (Iced)', category: 'espresso', price: 70, ingredients: [
      { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
      { name: 'Cold Water', unit: 'ml', quantity: 100, cost: 0 },
      { name: 'Ice', unit: 'cubes', quantity: 5, cost: 0 }
    ]},
    { product: 'Cappuccino (Hot)', category: 'espresso', price: 75, ingredients: [
      { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
      { name: 'Steamed Milk', unit: 'ml', quantity: 120, cost: 0 },
      { name: 'Milk Foam', unit: 'ml', quantity: 30, cost: 0 }
    ]},
    { product: 'Cappuccino (Iced)', category: 'espresso', price: 80, ingredients: [
      { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
      { name: 'Cold Milk', unit: 'ml', quantity: 120, cost: 0 },
      { name: 'Ice', unit: 'cubes', quantity: 5, cost: 0 }
    ]},
    { product: 'Café Latte (Hot)', category: 'espresso', price: 75, ingredients: [
      { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
      { name: 'Steamed Milk', unit: 'ml', quantity: 180, cost: 0 }
    ]},
    { product: 'Café Latte (Iced)', category: 'espresso', price: 80, ingredients: [
      { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
      { name: 'Cold Milk', unit: 'ml', quantity: 180, cost: 0 },
      { name: 'Ice', unit: 'cubes', quantity: 5, cost: 0 }
    ]},
    { product: 'Café Mocha (Hot)', category: 'espresso', price: 80, ingredients: [
      { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
      { name: 'Chocolate Syrup', unit: 'pump', quantity: 1, cost: 0 },
      { name: 'Steamed Milk', unit: 'ml', quantity: 150, cost: 0 }
    ]},
    { product: 'Café Mocha (Iced)', category: 'espresso', price: 85, ingredients: [
      { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
      { name: 'Chocolate Syrup', unit: 'pump', quantity: 1, cost: 0 },
      { name: 'Cold Milk', unit: 'ml', quantity: 150, cost: 0 },
      { name: 'Ice', unit: 'cubes', quantity: 5, cost: 0 }
    ]},
    { product: 'Caramel Latte (Hot)', category: 'espresso', price: 80, ingredients: [
      { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
      { name: 'Caramel Syrup', unit: 'pump', quantity: 1, cost: 0 },
      { name: 'Steamed Milk', unit: 'ml', quantity: 150, cost: 0 }
    ]},
    { product: 'Caramel Latte (Iced)', category: 'espresso', price: 85, ingredients: [
      { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
      { name: 'Caramel Syrup', unit: 'pump', quantity: 1, cost: 0 },
      { name: 'Cold Milk', unit: 'ml', quantity: 150, cost: 0 },
      { name: 'Ice', unit: 'cubes', quantity: 5, cost: 0 }
    ]},
    
    // Other Drinks
    { product: 'Coke', category: 'others', price: 15, ingredients: [
      { name: 'Softdrinks', unit: 'piece', quantity: 20, cost: 11.3 }
    ]},
    { product: 'Sprite', category: 'others', price: 15, ingredients: [
      { name: 'Softdrinks', unit: 'piece', quantity: 20, cost: 11.3 }
    ]},
    { product: 'Bottled Water', category: 'others', price: 20, ingredients: [
      { name: 'Water', unit: 'piece', quantity: 20, cost: 15 }
    ]}
  ];

  // Get auth info
  const authData = localStorage.getItem('sb-bwmkqscqkfoezcuzgpwq-auth-token');
  if (!authData) {
    console.error('❌ Not logged in');
    return;
  }
  
  const auth = JSON.parse(authData);
  const accessToken = auth.access_token;
  const userId = auth.user?.id;
  
  const baseUrl = 'https://bwmkqscqkfoezcuzgpwq.supabase.co/rest/v1';
  const headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc',
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  let success = 0;
  let failed = 0;
  let commissaryCreated = 0;

  console.log(`📊 Processing ${recipes.length} recipes...`);

  for (const recipe of recipes) {
    try {
      console.log(`🔄 ${recipe.product}`);
      
      const totalCost = recipe.ingredients.reduce((sum, ing) => sum + (ing.cost * ing.quantity), 0);
      
      // Check existing template
      const checkResp = await fetch(`${baseUrl}/recipe_templates?name=eq.${encodeURIComponent(recipe.product)}&select=id`, { method: 'GET', headers });
      const existing = await checkResp.json();
      
      let templateId;
      if (existing.length > 0) {
        templateId = existing[0].id;
        // Update existing
        await fetch(`${baseUrl}/recipe_templates?id=eq.${templateId}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({
            category_name: recipe.category,
            total_cost: totalCost,
            suggested_price: recipe.price,
            updated_at: new Date().toISOString()
          })
        });
        // Delete old ingredients
        await fetch(`${baseUrl}/recipe_template_ingredients?recipe_template_id=eq.${templateId}`, { method: 'DELETE', headers });
      } else {
        // Create new template
        const createResp = await fetch(`${baseUrl}/recipe_templates`, {
          method: 'POST', headers,
          body: JSON.stringify({
            name: recipe.product,
            description: `${recipe.product} recipe`,
            category_name: recipe.category,
            instructions: `Prepare ${recipe.product}`,
            yield_quantity: 1,
            serving_size: 1,
            total_cost: totalCost,
            suggested_price: recipe.price,
            version: 1,
            is_active: true,
            created_by: userId
          })
        });
        const newTemplate = await createResp.json();
        templateId = newTemplate[0].id;
      }
      
      // Process ingredients
      const ingredientInserts = [];
      for (const ingredient of recipe.ingredients) {
        // Find or create commissary item
        const itemResp = await fetch(`${baseUrl}/commissary_inventory?name=eq.${encodeURIComponent(ingredient.name)}&is_active=eq.true&select=id`, { method: 'GET', headers });
        let items = await itemResp.json();
        let itemId;
        
        if (items.length === 0) {
          // Create commissary item
          const createItemResp = await fetch(`${baseUrl}/commissary_inventory`, {
            method: 'POST', headers,
            body: JSON.stringify({
              name: ingredient.name,
              category: 'raw_materials',
              item_type: 'raw_material',
              current_stock: 100,
              minimum_threshold: 10,
              unit: ingredient.unit,
              unit_cost: ingredient.cost,
              is_active: true
            })
          });
          const newItem = await createItemResp.json();
          itemId = newItem[0].id;
          commissaryCreated++;
        } else {
          itemId = items[0].id;
        }
        
        ingredientInserts.push({
          recipe_template_id: templateId,
          commissary_item_id: itemId,
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
        await fetch(`${baseUrl}/recipe_template_ingredients`, {
          method: 'POST', headers,
          body: JSON.stringify(ingredientInserts)
        });
      }
      
      success++;
      
    } catch (error) {
      console.error(`❌ ${recipe.product}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 RESULTS:`);
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📦 Commissary items created: ${commissaryCreated}`);
  console.log(`\n🎉 Upload complete! Your Mango recipe now has all ingredients.`);
  
  return { success, failed, commissaryCreated };
}

// Run the upload
quickUploadAllRecipes();
