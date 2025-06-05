
import { RecipesList } from "./RecipesList";

interface RecipesTabProps {
  storeId: string;
}

export function RecipesTab({ storeId }: RecipesTabProps) {
  return <RecipesList storeId={storeId} />;
}
