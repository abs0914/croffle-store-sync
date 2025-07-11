import { supabase } from "@/integrations/supabase/client";

const comboProductsData = [
  { product: "Croffle Overload", category: "Croffle Overload", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 0.5, costPerUnit: 15, price: 99, choice: "base" },
  { product: "Croffle Overload", category: "Croffle Overload", ingredient: "Vanilla Ice Cream", unit: "scoop", quantity: 1, costPerUnit: 15.44, price: 99, choice: "base" },
  { product: "Croffle Overload", category: "Croffle Overload", ingredient: "Colored Sprinkles", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 99, choice: "choice" },
  { product: "Croffle Overload", category: "Croffle Overload", ingredient: "Peanut", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 99, choice: "choice" },
  { product: "Croffle Overload", category: "Croffle Overload", ingredient: "Choco Flakes", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 99, choice: "choice" },
  { product: "Croffle Overload", category: "Croffle Overload", ingredient: "Marshmallow", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 99, choice: "choice" },
  { product: "Croffle Overload", category: "Croffle Overload", ingredient: "Overload Cup", unit: "piece", quantity: 1, costPerUnit: 4, price: 99, choice: "packaging" },
  { product: "Croffle Overload", category: "Croffle Overload", ingredient: "Popsicle stick", unit: "piece", quantity: 1, costPerUnit: 0.3, price: 99, choice: "packaging" },
  { product: "Croffle Overload", category: "Croffle Overload", ingredient: "Mini Spoon", unit: "piece", quantity: 1, costPerUnit: 0.5, price: 99, choice: "packaging" },
  { product: "Mini Croffle", category: "Mini Croffle", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 0.5, costPerUnit: 15, price: 65, choice: "base" },
  { product: "Mini Croffle", category: "Mini Croffle", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 0.5, costPerUnit: 4, price: 65, choice: "base" },
  { product: "Mini Croffle", category: "Mini Croffle", ingredient: "Chocolate", unit: "portion", quantity: 0.5, costPerUnit: 1.25, price: 65, choice: "choice" },
  { product: "Mini Croffle", category: "Mini Croffle", ingredient: "Caramel", unit: "portion", quantity: 0.5, costPerUnit: 1.25, price: 65, choice: "choice" },
  { product: "Mini Croffle", category: "Mini Croffle", ingredient: "Tiramisu", unit: "portion", quantity: 0.5, costPerUnit: 1.25, price: 65, choice: "choice" },
  { product: "Mini Croffle", category: "Mini Croffle", ingredient: "Colored Sprinkles", unit: "portion", quantity: 0.5, costPerUnit: 1.25, price: 65, choice: "choice" },
  { product: "Mini Croffle", category: "Mini Croffle", ingredient: "Peanut", unit: "portion", quantity: 0.5, costPerUnit: 1.25, price: 65, choice: "choice" },
  { product: "Mini Croffle", category: "Mini Croffle", ingredient: "Choco Flakes", unit: "portion", quantity: 0.5, costPerUnit: 1.25, price: 65, choice: "choice" },
  { product: "Mini Croffle", category: "Mini Croffle", ingredient: "Marshmallow", unit: "portion", quantity: 0.5, costPerUnit: 1.25, price: 65, choice: "choice" },
  { product: "Mini Croffle", category: "Mini Croffle", ingredient: "Mini Take Out Box", unit: "piece", quantity: 1, costPerUnit: 2.4, price: 65, choice: "packaging" },
  { product: "Mini Croffle", category: "Mini Croffle", ingredient: "Popsicle stick", unit: "piece", quantity: 1, costPerUnit: 0.3, price: 65, choice: "packaging" }
];

export const uploadComboProductTemplates = async () => {
  try {
    console.log("Starting combo product templates upload...");
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Group data by product
    const comboProducts = comboProductsData.reduce((acc, item) => {
      if (!acc[item.product]) {
        acc[item.product] = {
          name: item.product,
          category: item.category,
          price: item.price,
          ingredients: []
        };
      }
      acc[item.product].ingredients.push({
        ingredient_name: item.ingredient,
        quantity: item.quantity,
        unit: item.unit,
        cost_per_unit: item.costPerUnit,
        choice_type: item.choice, // Store the choice type for reference
        supports_fractional: item.quantity < 1 // Enable fractional support for Mini Croffle items
      });
      return acc;
    }, {} as Record<string, any>);

    let successCount = 0;
    let errorCount = 0;

    // Create each combo product recipe template
    for (const [productName, product] of Object.entries(comboProducts)) {
      try {
        console.log(`Creating combo template for ${productName}...`);
        
        // Create recipe template
        const { data: template, error: templateError } = await supabase
          .from('recipe_templates')
          .insert({
            name: product.name,
            description: `Combo product recipe template for ${product.name}`,
            category_name: product.category,
            instructions: 'Instructions to be added',
            yield_quantity: 1,
            serving_size: 1,
            version: 1,
            is_active: true,
            created_by: user.id
          })
          .select()
          .single();

        if (templateError) {
          console.error(`Error creating template for ${productName}:`, templateError);
          errorCount++;
          continue;
        }

        // Create ingredients with fractional support where needed
        const ingredientInserts = product.ingredients.map((ing: any) => ({
          recipe_template_id: template.id,
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit,
          cost_per_unit: ing.cost_per_unit,
          location_type: 'all',
          supports_fractional: ing.supports_fractional || false,
          notes: ing.choice_type // Store choice type in notes for reference
        }));

        const { error: ingredientsError } = await supabase
          .from('recipe_template_ingredients')
          .insert(ingredientInserts);

        if (ingredientsError) {
          console.error(`Error creating ingredients for ${productName}:`, ingredientsError);
          errorCount++;
        } else {
          console.log(`Successfully created combo template for ${productName} with ${product.ingredients.length} ingredients`);
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing ${productName}:`, error);
        errorCount++;
      }
    }

    console.log(`Combo upload complete! Successfully created ${successCount} templates, ${errorCount} errors`);
    return { success: successCount, errors: errorCount };
  } catch (error) {
    console.error('Combo upload failed:', error);
    throw error;
  }
};

// Auto-run the upload
uploadComboProductTemplates()
  .then(result => {
    console.log('Combo upload result:', result);
  })
  .catch(error => {
    console.error('Combo upload failed:', error);
  });