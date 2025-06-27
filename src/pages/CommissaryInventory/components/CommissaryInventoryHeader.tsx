
import { Warehouse } from "lucide-react";

export function CommissaryInventoryHeader() {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <Warehouse className="h-8 w-8" />
        Commissary Inventory
      </h1>
      <p className="text-muted-foreground">
        Manage raw materials and supplies for conversion to store inventory. Use Production Management for bulk uploads.
      </p>
    </div>
  );
}
