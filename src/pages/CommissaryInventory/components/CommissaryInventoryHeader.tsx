
import { Warehouse, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CommissaryInventoryHeader() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <Warehouse className="h-8 w-8 text-croffle-accent" />
        <h1 className="text-3xl font-bold">Commissary Inventory</h1>
        <Badge variant="secondary" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Centralized
        </Badge>
      </div>
      <p className="text-muted-foreground">
        Manage raw materials and finished products for distribution to stores
      </p>
    </div>
  );
}
