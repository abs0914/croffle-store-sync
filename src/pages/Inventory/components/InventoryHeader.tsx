
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InventoryHeaderProps {
  title: string;
  description: string;
  onAddItem?: () => void;
  showAddButton?: boolean;
}

export default function InventoryHeader({ 
  title, 
  description,
  onAddItem,
  showAddButton = false
}: InventoryHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-croffle-accent" />
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground max-w-2xl">{description}</p>
        </div>
      </div>
      {showAddButton && onAddItem && (
        <Button onClick={onAddItem} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      )}
    </div>
  );
}
