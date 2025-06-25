
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InventoryHeaderProps {
  onAddProduct?: () => void;
  storeId?: string;
  storeName?: string;
  title?: string;
  description?: string;
}

export const InventoryHeader = ({ 
  onAddProduct,
  storeId,
  storeName,
  title,
  description
}: InventoryHeaderProps) => {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-croffle-accent" />
        <div>
          <h1 className="text-3xl font-bold">
            {title || "Inventory Management"}
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            {description || (storeName ? `Manage products, categories, and stock for ${storeName}` : "Manage your inventory")}
          </p>
        </div>
      </div>
      {onAddProduct && (
        <Button onClick={onAddProduct}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      )}
    </div>
  );
};

export default InventoryHeader;
