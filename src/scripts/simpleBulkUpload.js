/**
 * Simple Bulk Recipe Upload Script
 * 
 * Instructions:
 * 1. Make sure you are logged into the croffle-store-sync admin panel
 * 2. Open browser console (F12)
 * 3. Copy and paste this script
 * 4. Press Enter
 */

// Recipe data
const recipes = [
  {
    product: 'Tiramisu',
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

// Simple upload function using fetch API
async function uploadRecipes() {
  console.log('🚀 Starting simple bulk upload...');
  
  // Get auth token from localStorage
  const authData = localStorage.getItem('sb-bwmkqscqkfoezcuzgpwq-auth-token');
  if (!authData) {
    console.error('❌ No auth token found. Please make sure you are logged in.');
    return;
  }
  
  const auth = JSON.parse(authData);
  const accessToken = auth.access_token;
  const userId = auth.user?.id;
  
  if (!accessToken || !userId) {
    console.error('❌ Invalid auth data. Please log in again.');
    return;
  }
  
  console.log(`👤 Authenticated as user: ${userId}`);
  
  const baseUrl = 'https://bwmkqscqkfoezcuzgpwq.supabase.co/rest/v1';
  const headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc',
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const recipe of recipes) {
    try {
      console.log(`🔄 Processing: ${recipe.product}`);
      
      const totalCost = recipe.ingredients.reduce((sum, ing) => sum + (ing.cost * ing.quantity), 0);
      
      // Check if template exists
      const checkResponse = await fetch(
        `${baseUrl}/recipe_templates?name=eq.${encodeURIComponent(recipe.product)}&select=id`,
        { method: 'GET', headers }
      );
      
      const existingTemplates = await checkResponse.json();
      let templateId;
      
      if (existingTemplates.length > 0) {
        templateId = existingTemplates[0].id;
        console.log(`📝 Updating existing template: ${recipe.product}`);
        
        // Update template
        await fetch(`${baseUrl}/recipe_templates?id=eq.${templateId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            description: `${recipe.product} croffle with detailed ingredients`,
            category_name: 'classic',
            total_cost: totalCost,
            suggested_price: 125,
            updated_at: new Date().toISOString()
          })
        });
        
        // Delete existing ingredients
        await fetch(`${baseUrl}/recipe_template_ingredients?recipe_template_id=eq.${templateId}`, {
          method: 'DELETE',
          headers
        });
      } else {
        console.log(`➕ Creating new template: ${recipe.product}`);
        
        // Create new template
        const createResponse = await fetch(`${baseUrl}/recipe_templates`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: recipe.product,
            description: `${recipe.product} croffle with detailed ingredients`,
            category_name: 'classic',
            instructions: `Prepare ${recipe.product} croffle with all specified ingredients`,
            yield_quantity: 1,
            serving_size: 1,
            total_cost: totalCost,
            suggested_price: 125,
            version: 1,
            is_active: true,
            created_by: userId
          })
        });
        
        const newTemplate = await createResponse.json();
        templateId = newTemplate[0].id;
      }
      
      // Process ingredients
      const ingredientInserts = [];
      
      for (const ingredient of recipe.ingredients) {
        // Find or create commissary item
        const itemResponse = await fetch(
          `${baseUrl}/commissary_inventory?name=eq.${encodeURIComponent(ingredient.name)}&is_active=eq.true&select=id`,
          { method: 'GET', headers }
        );
        
        let commissaryItems = await itemResponse.json();
        let commissaryItemId;
        
        if (commissaryItems.length === 0) {
          console.log(`🔄 Creating commissary item: ${ingredient.name}`);
          
          const createItemResponse = await fetch(`${baseUrl}/commissary_inventory`, {
            method: 'POST',
            headers,
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
          
          const newItem = await createItemResponse.json();
          commissaryItemId = newItem[0].id;
        } else {
          commissaryItemId = commissaryItems[0].id;
        }
        
        ingredientInserts.push({
          recipe_template_id: templateId,
          commissary_item_id: commissaryItemId,
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
          method: 'POST',
          headers,
          body: JSON.stringify(ingredientInserts)
        });
      }
      
      console.log(`✅ Successfully processed: ${recipe.product} (${ingredientInserts.length} ingredients)`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Error processing ${recipe.product}:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n📊 UPLOAD SUMMARY:`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`\n🎉 Upload completed! Check your Recipe Templates page.`);
}

// Run the upload
uploadRecipes();
