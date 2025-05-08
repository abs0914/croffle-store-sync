
import { Ingredient } from "@/types";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Edit, Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";

interface IngredientListProps {
  ingredients: Ingredient[];
  isLoading: boolean;
  onEdit: (ingredient: Ingredient) => void;
  onStockAdjust: (ingredient: Ingredient) => void;
}

export const IngredientList = ({ 
  ingredients, 
  isLoading, 
  onEdit, 
  onStockAdjust 
}: IngredientListProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (ingredients.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <p>No inventory items found. Add your first item to get started.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableCaption>List of ingredients, supplies, and raw materials</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead className="text-right">Stock Quantity</TableHead>
          <TableHead className="text-right">Cost Per Unit</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ingredients.map((ingredient) => (
          <TableRow key={ingredient.id}>
            <TableCell className="font-medium">{ingredient.name}</TableCell>
            <TableCell>{ingredient.unit_type}</TableCell>
            <TableCell className="text-right">{ingredient.stock_quantity}</TableCell>
            <TableCell className="text-right">
              {ingredient.cost_per_unit 
                ? `₱${ingredient.cost_per_unit.toFixed(2)}` 
                : "—"}
            </TableCell>
            <TableCell>
              {ingredient.is_active ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Inactive
                </span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end space-x-2">
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => onStockAdjust(ingredient)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => onEdit(ingredient)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
