
/**
 * @deprecated This component has been moved to Order Management module.
 * Order management is now handled in the dedicated Order Management section.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ExternalLink } from "lucide-react";

interface OrdersTabProps {
  storeId: string;
}

export function OrdersTab({ storeId }: OrdersTabProps) {
  const handleNavigateToOrders = () => {
    window.location.href = '/order-management';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Orders - Moved to Order Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Order Management Has Moved</h3>
          <p className="text-muted-foreground mb-4">
            Purchase orders and order management are now part of the dedicated Order Management module.
          </p>
          <Button onClick={handleNavigateToOrders} className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Go to Order Management
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
