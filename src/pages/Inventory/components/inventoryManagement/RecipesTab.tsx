
import { RecipesList } from "./RecipesList";
import { ProductSyncValidator } from "@/components/inventory/ProductSyncValidator";

interface RecipesTabProps {
  storeId: string;
}

export function RecipesTab({ storeId }: RecipesTabProps) {
  return (
    <div className="space-y-6">
      <ProductSyncValidator storeId={storeId} />
      <RecipesList storeId={storeId} />
    </div>
  );
}
