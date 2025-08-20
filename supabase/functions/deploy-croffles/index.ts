import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CroffleProduct {
  product_name: string;
  description: string | null;
  price: number;
  category_name: string;
  image_url: string | null;
  recipe_id: string | null;
}

interface DeploymentResult {
  success: boolean;
  message: string;
  deployed_products: Array<{
    store_name: string;
    products_added: string[];
    categories_created: string[];
  }>;
  errors: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting croffle deployment process...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Define the standard croffle products we want to deploy
    const standardCroffleNames = [
      'Biscoff Croffle',
      'Nutella Croffle', 
      'KitKat Croffle',
      'Choco Overload Croffle',
      'Matcha Croffle',
      'Dark Chocolate Croffle',
      'Tiramisu Croffle',
      'Choco Nut Croffle',
      'Caramel Delight Croffle',
      'Choco Marshmallow Croffle',
      'Mango Croffle',
      'Strawberry Croffle',
      'Blueberry Croffle'
    ];

    // Get stores that need croffle deployment
    const targetStores = [
      { id: 'c3bfe728-1550-4f4d-af04-12899f3b276b', name: 'SM City Cebu' },
      { id: '607c00e4-59ff-4e97-83f7-579409fd1f6a', name: 'SM Savemore Tacloban' },
      { id: 'd7c47e6b-f20a-4543-a6bd-000398f72df5', name: 'Sugbo Mercado (IT Park, Cebu)' }
    ];

    console.log('📍 Target stores for deployment:', targetStores.map(s => s.name));

    // Get template croffle products from a store that has them (Robinsons North)
    const { data: templateProducts, error: templateError } = await supabaseClient
      .from('product_catalog')
      .select(`
        product_name,
        description,
        price,
        image_url,
        recipe_id,
        categories!inner(name)
      `)
      .eq('store_id', 'fd45e07e-7832-4f51-b46b-7ef604359b86') // Robinsons North as template
      .in('product_name', standardCroffleNames);

    if (templateError) {
      throw new Error(`Failed to fetch template products: ${templateError.message}`);
    }

    console.log(`📦 Found ${templateProducts?.length || 0} template croffle products`);

    const deploymentResults: DeploymentResult['deployed_products'] = [];
    const errors: string[] = [];

    // Deploy to each target store
    for (const store of targetStores) {
      console.log(`🏪 Deploying croffles to ${store.name}...`);
      
      const storeResult = {
        store_name: store.name,
        products_added: [] as string[],
        categories_created: [] as string[]
      };

      try {
        // Get existing categories for this store
        const { data: existingCategories, error: categoriesError } = await supabaseClient
          .from('categories')
          .select('id, name')
          .eq('store_id', store.id);

        if (categoriesError) {
          throw new Error(`Failed to fetch categories for ${store.name}: ${categoriesError.message}`);
        }

        const categoryMap = new Map(existingCategories?.map(cat => [cat.name, cat.id]) || []);

        // Process each template product
        for (const product of templateProducts || []) {
          try {
            const categoryName = (product.categories as any)?.name;
            let categoryId = categoryMap.get(categoryName);

            // Create category if it doesn't exist
            if (!categoryId && categoryName) {
              console.log(`📂 Creating category "${categoryName}" for ${store.name}`);
              
              const { data: newCategory, error: categoryCreateError } = await supabaseClient
                .from('categories')
                .insert({
                  name: categoryName,
                  description: `${categoryName} category for croffle products`,
                  store_id: store.id,
                  is_active: true
                })
                .select()
                .single();

              if (categoryCreateError) {
                console.error(`Failed to create category ${categoryName}:`, categoryCreateError);
                errors.push(`Failed to create category ${categoryName} for ${store.name}`);
                continue;
              }

              categoryId = newCategory.id;
              categoryMap.set(categoryName, categoryId);
              storeResult.categories_created.push(categoryName);
            }

            // Check if product already exists in this store
            const { data: existingProduct } = await supabaseClient
              .from('product_catalog')
              .select('id')
              .eq('store_id', store.id)
              .eq('product_name', product.product_name)
              .single();

            if (existingProduct) {
              console.log(`⚠️ Product ${product.product_name} already exists in ${store.name}, skipping`);
              continue;
            }

            // Insert the product into product_catalog
            const { error: insertError } = await supabaseClient
              .from('product_catalog')
              .insert({
                store_id: store.id,
                product_name: product.product_name,
                description: product.description,
                price: product.price,
                category_id: categoryId,
                image_url: product.image_url,
                recipe_id: product.recipe_id,
                is_available: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (insertError) {
              console.error(`Failed to insert ${product.product_name}:`, insertError);
              errors.push(`Failed to deploy ${product.product_name} to ${store.name}: ${insertError.message}`);
              continue;
            }

            storeResult.products_added.push(product.product_name);
            console.log(`✅ Successfully deployed ${product.product_name} to ${store.name}`);

          } catch (productError) {
            console.error(`Error processing product ${product.product_name}:`, productError);
            errors.push(`Error processing ${product.product_name} for ${store.name}: ${productError}`);
          }
        }

        deploymentResults.push(storeResult);
        console.log(`✅ Completed deployment to ${store.name}: ${storeResult.products_added.length} products added`);

      } catch (storeError) {
        console.error(`Error deploying to store ${store.name}:`, storeError);
        errors.push(`Failed to deploy to ${store.name}: ${storeError}`);
      }
    }

    // Add missing "Cookies & Cream Croffle" to all stores (including template stores)
    console.log('🍪 Adding missing Cookies & Cream Croffle to all stores...');
    
    const allStores = [
      ...targetStores,
      { id: 'fd45e07e-7832-4f51-b46b-7ef604359b86', name: 'Robinsons North' },
      { id: 'a12a8269-5cbc-4a78-bae0-d6f166e1446d', name: 'Robinsons Marasbaras' },
      { id: 'f6ce7fa1-7218-46b3-838d-a9e77ccdb0cd', name: 'Robinsons Cybergate Cebu' },
      { id: 'b9c95682-895c-488b-a39a-d62d1d2036ff', name: 'Molave Kaffee and Bistro (Main Office)' },
      { id: 'e78ad702-1135-482d-a508-88104e2706cf', name: 'Gaisano Capital SRP' }
    ];

    let cookiesCreamAdded = 0;
    for (const store of allStores) {
      try {
        // Check if Cookies & Cream already exists
        const { data: existingCookiesCream } = await supabaseClient
          .from('product_catalog')
          .select('id')
          .eq('store_id', store.id)
          .eq('product_name', 'Cookies & Cream Croffle')
          .single();

        if (existingCookiesCream) {
          console.log(`Cookies & Cream Croffle already exists in ${store.name}`);
          continue;
        }

        // Get Premium category for this store
        const { data: premiumCategory } = await supabaseClient
          .from('categories')
          .select('id')
          .eq('store_id', store.id)
          .eq('name', 'Premium')
          .single();

        if (!premiumCategory) {
          console.log(`No Premium category found for ${store.name}, skipping Cookies & Cream`);
          continue;
        }

        // Add Cookies & Cream Croffle
        const { error: cookiesError } = await supabaseClient
          .from('product_catalog')
          .insert({
            store_id: store.id,
            product_name: 'Cookies & Cream Croffle',
            description: 'Delicious croffle with cookies and cream topping',
            price: 125.00,
            category_id: premiumCategory.id,
            is_available: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (!cookiesError) {
          cookiesCreamAdded++;
          console.log(`✅ Added Cookies & Cream Croffle to ${store.name}`);
        }

      } catch (error) {
        console.error(`Error adding Cookies & Cream to ${store.name}:`, error);
      }
    }

    const totalProductsDeployed = deploymentResults.reduce((sum, store) => sum + store.products_added.length, 0);
    const totalCategoriesCreated = deploymentResults.reduce((sum, store) => sum + store.categories_created.length, 0);

    const result: DeploymentResult = {
      success: errors.length === 0 || totalProductsDeployed > 0,
      message: `Deployment completed! ${totalProductsDeployed} products deployed across ${deploymentResults.length} stores. ${cookiesCreamAdded} stores now have Cookies & Cream Croffle. ${totalCategoriesCreated} categories created.`,
      deployed_products: deploymentResults,
      errors
    };

    console.log('🎉 Croffle deployment completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Critical error in croffle deployment:', error);
    
    const errorResult: DeploymentResult = {
      success: false,
      message: `Deployment failed: ${error instanceof Error ? error.message : String(error)}`,
      deployed_products: [],
      errors: [String(error)]
    };

    return new Response(JSON.stringify(errorResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});