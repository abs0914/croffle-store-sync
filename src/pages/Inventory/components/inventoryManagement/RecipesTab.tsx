
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat } from "lucide-react";

interface RecipesTabProps {
  storeId: string;
}

export function RecipesTab({ storeId }: RecipesTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChefHat className="h-5 w-5" />
          Recipes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Recipe management coming in Phase 2</p>
        </div>
      </CardContent>
    </Card>
  );
}
