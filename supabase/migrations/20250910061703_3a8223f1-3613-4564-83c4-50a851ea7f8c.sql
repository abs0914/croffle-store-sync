-- Ensure trigger is properly attached to transaction_items table
DROP TRIGGER IF EXISTS trigger_deduct_recipe_ingredients ON transaction_items;

-- Create the trigger on transaction_items table
CREATE TRIGGER trigger_deduct_recipe_ingredients
  AFTER INSERT ON transaction_items
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_recipe_ingredients_on_sale();