
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Warehouse } from "lucide-react";

export default function CommissaryInventory() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Warehouse className="h-8 w-8" />
            Commissary Inventory
          </h1>
          <p className="text-muted-foreground">
            Manage raw materials, packaging, and supplies
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commissary Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Commissary inventory functionality is being developed. This will allow you to manage raw ingredients, packaging materials, and supplies used across all stores.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
