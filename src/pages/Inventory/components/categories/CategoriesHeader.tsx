
import { Button } from "@/components/ui/button";
import { Package, Plus } from "lucide-react";

interface CategoriesHeaderProps {
  onAdd: () => void;
  onCreateDefault: () => void;
}

export const CategoriesHeader = ({ onAdd, onCreateDefault }: CategoriesHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold text-croffle-primary">Product Categories</h1>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCreateDefault}>
          <Package className="mr-2 h-4 w-4" />
          Add Default Categories
        </Button>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>
    </div>
  );
};
