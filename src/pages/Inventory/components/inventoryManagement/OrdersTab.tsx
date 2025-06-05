
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

interface OrdersTabProps {
  storeId: string;
}

export function OrdersTab({ storeId }: OrdersTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Orders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Order management coming in Phase 4</p>
        </div>
      </CardContent>
    </Card>
  );
}
