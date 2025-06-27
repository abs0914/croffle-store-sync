
import { Package } from "lucide-react";

interface InventoryHeaderProps {
  title: string;
  description: string;
}

export default function InventoryHeader({ 
  title, 
  description
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
    </div>
  );
}
