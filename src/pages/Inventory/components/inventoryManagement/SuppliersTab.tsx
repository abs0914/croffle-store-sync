
/**
 * @deprecated This component has been moved to Order Management module.
 * Supplier management is now handled in the dedicated Order Management section.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ExternalLink } from "lucide-react";

export function SuppliersTab() {
  const handleNavigateToOrders = () => {
    window.location.href = '/order-management';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Suppliers - Moved to Order Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Supplier Management Has Moved</h3>
          <p className="text-muted-foreground mb-4">
            Supplier management is now part of the Order Management module for better organization.
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
