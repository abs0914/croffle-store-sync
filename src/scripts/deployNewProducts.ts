import { supabase } from '@/integrations/supabase/client';
import { createRecipeTemplate } from '@/services/recipeManagement/recipeTemplateService';
import { toast } from 'sonner';

const NEW_PRODUCTS = [
  {
    name: 'Paper Bag #20',
    description: 'Paper bag size #20 for takeout orders',
    category_name: 'Packaging',
    yield_quantity: 1,
    serving_size: 1,
    price: 5.00,
    ingredients: [
      {
        ingredient_name: 'Paper Bag #20',
        quantity: 1,
        unit: 'piece',
        cost_per_unit: 3.00,
        location_type: 'all'
      }
    ]
  },
  {
    name: 'Rectangle',
    description: 'Rectangle shaped container for food items',
    category_name: 'Packaging',
    yield_quantity: 1,
    serving_size: 1,
    price: 8.00,
    ingredients: [
      {
        ingredient_name: 'Rectangle Container',
        quantity: 1,
        unit: 'piece',
        cost_per_unit: 5.00,
        location_type: 'all'
      }
    ]
  },
  {
    name: 'Take-out box with cover',
    description: 'Take-out box with cover for food delivery',
    category_name: 'Packaging',
    yield_quantity: 1,
    serving_size: 1,
    price: 12.00,
    ingredients: [
      {
        ingredient_name: 'Take-out Box with Cover',
        quantity: 1,
        unit: 'piece',
        cost_per_unit: 8.00,
        location_type: 'all'
      }
    ]
  }
];

export const deployNewProducts = async (): Promise<{
  success: boolean;
  templatesCreated: number;
  productsDeployed: number;
  error?: string;
}> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    let templatesCreated = 0;
    const createdTemplateIds: string[] = [];

    // Step 1: Create recipe templates
    console.log('Creating recipe templates...');
    for (const product of NEW_PRODUCTS) {
      try {
        // Check if recipe template already exists
        const { data: existingTemplate } = await supabase
          .from('recipe_templates')
          .select('id')
          .eq('name', product.name)
          .eq('created_by', user.id)
          .maybeSingle();

        if (existingTemplate) {
          console.log(`Template for ${product.name} already exists, skipping...`);
          templatesCreated++;
          createdTemplateIds.push(existingTemplate.id);
          continue;
        }

        const templateData = {
          name: product.name,
          description: product.description,
          category_name: product.category_name,
          yield_quantity: product.yield_quantity,
          serving_size: product.serving_size,
          price: product.price,
          created_by: user.id,
          is_active: true,
          version: 1
        };

        const template = await createRecipeTemplate(templateData, product.ingredients);
        if (template) {
          templatesCreated++;
          createdTemplateIds.push(template.id);
          console.log(`Created template for ${product.name}`);
        }
      } catch (error) {
        console.error(`Error creating template for ${product.name}:`, error);
      }
    }

    // Step 2: Deploy recipe templates to all stores
    console.log('Deploying recipe templates to all stores...');
    const { data: deploymentData } = await supabase
      .rpc('deploy_products_to_all_stores');

    // Step 3: Create inventory items for each store
    console.log('Creating inventory items for all stores...');
    let inventoryItemsCreated = 0;

    const { data: stores } = await supabase
      .from('stores')
      .select('id')
      .eq('is_active', true);

    if (stores) {
      for (const product of NEW_PRODUCTS) {
        for (const store of stores) {
          try {
            // Create inventory stock item for the product
            const { data: existingItem } = await supabase
              .from('inventory_stock')
              .select('id')
              .eq('store_id', store.id)
              .eq('item', product.ingredients[0].ingredient_name)
              .eq('unit', product.ingredients[0].unit)
              .maybeSingle();

            if (!existingItem) {
              const { error: inventoryError } = await supabase
                .from('inventory_stock')
                .insert({
                  store_id: store.id,
                  item: product.ingredients[0].ingredient_name,
                  unit: product.ingredients[0].unit,
                  stock_quantity: 100,
                  cost: product.ingredients[0].cost_per_unit,
                  is_active: true
                });

              if (!inventoryError) {
                inventoryItemsCreated++;
                console.log(`Created inventory item ${product.ingredients[0].ingredient_name} for store ${store.id}`);
              }
            }
          } catch (error) {
            console.error(`Error creating inventory item for store ${store.id}:`, error);
          }
        }
      }
    }

    // Step 4: Create product catalog entries for deployed recipes
    console.log('Creating product catalog entries...');
    let catalogEntriesCreated = 0;

    for (const product of NEW_PRODUCTS) {
      try {
        // Get all recipes for this product template
        const { data: recipes } = await supabase
          .from('recipes')
          .select('id, store_id, template_id')
          .eq('name', product.name)
          .not('template_id', 'is', null);

        if (recipes) {
          for (const recipe of recipes) {
            // Check if product catalog entry already exists
            const { data: existingCatalog } = await supabase
              .from('product_catalog')
              .select('id')
              .eq('recipe_id', recipe.id)
              .eq('store_id', recipe.store_id)
              .maybeSingle();

            if (!existingCatalog) {
              // Create product catalog entry
              const { error: catalogError } = await supabase
                .from('product_catalog')
                .insert({
                  product_name: product.name,
                  description: product.description,
                  price: product.price,
                  recipe_id: recipe.id,
                  store_id: recipe.store_id,
                  is_available: true,
                  display_order: 1
                });

              if (!catalogError) {
                catalogEntriesCreated++;
                console.log(`Created catalog entry for ${product.name} in store ${recipe.store_id}`);
              } else {
                console.error(`Error creating catalog entry for ${product.name}:`, catalogError);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error creating catalog entries for ${product.name}:`, error);
      }
    }

    // Step 5: Run product migration to ensure products are in products table
    console.log('Running product migration...');
    const { data: migrationData } = await supabase
      .rpc('migrate_product_catalog_to_products');

    if (templatesCreated > 0) {
      toast.success(`Successfully created ${templatesCreated} new product templates, ${inventoryItemsCreated} inventory items, and ${catalogEntriesCreated} catalog entries!`);
    } else {
      toast.error('Failed to create any product templates');
    }

    return {
      success: templatesCreated > 0,
      templatesCreated,
      productsDeployed: inventoryItemsCreated,
    };

  } catch (error) {
    console.error('Error deploying new products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`Failed to deploy new products: ${errorMessage}`);
    return {
      success: false,
      templatesCreated: 0,
      productsDeployed: 0,
      error: errorMessage
    };
  }
};