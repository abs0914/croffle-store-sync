
import { Package, Warehouse } from "lucide-react";

export function CommissaryInventoryHeader() {
  return (
    <div className="flex items-center gap-3">
      <Warehouse className="h-8 w-8 text-croffle-accent" />
      <div>
        <h1 className="text-3xl font-bold">Commissary Inventory</h1>
        <p className="text-muted-foreground">
          Manage raw materials, purchasing, and supplier relationships. 
          Use Production Management to convert raw materials into finished products.
        </p>
      </div>
    </div>
  );
}
