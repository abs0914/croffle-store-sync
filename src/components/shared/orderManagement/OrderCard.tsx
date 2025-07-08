import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, Package } from "lucide-react";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { formatCurrency } from "@/utils/format";

interface OrderCardProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    total_amount: number;
    items?: any[];
    created_at: string;
    requested_delivery_date?: string;
    notes?: string;
  };
  onView: (order: any) => void;
  onApprove?: (order: any) => void;
  onFulfill?: (order: any) => void;
  showActions?: boolean;
  userRole?: string;
}

export function OrderCard({ 
  order, 
  onView, 
  onApprove, 
  onFulfill, 
  showActions = true,
  userRole 
}: OrderCardProps) {
  return (
    <Card className="border rounded-lg">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-sm sm:text-base truncate">
                {order.order_number}
              </h3>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-4">
              <p className="text-sm text-muted-foreground">
                Total: {formatCurrency(order.total_amount)}
              </p>
              <p className="text-sm text-muted-foreground">
                Items: {order.items?.length || 0}
              </p>
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center gap-2 sm:flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(order)}
                className="flex-1 sm:flex-none"
              >
                <Eye className="h-4 w-4 sm:mr-0 mr-2" />
                <span className="sm:hidden">View</span>
              </Button>
              
              {order.status === 'pending' && onApprove && (userRole === 'admin' || userRole === 'owner') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onApprove(order)}
                  className="flex-1 sm:flex-none"
                >
                  <CheckCircle className="h-4 w-4 sm:mr-0 mr-2" />
                  <span className="sm:hidden">Approve</span>
                </Button>
              )}
              
              {order.status === 'approved' && onFulfill && (userRole === 'admin' || userRole === 'owner') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFulfill(order)}
                  className="flex-1 sm:flex-none"
                >
                  <Package className="h-4 w-4 sm:mr-0 mr-2" />
                  <span className="sm:hidden">Fulfill</span>
                </Button>
              )}
            </div>
          )}
        </div>
        
        {order.notes && (
          <p className="text-sm">{order.notes}</p>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1 sm:space-y-0">
          <div>Created: {new Date(order.created_at).toLocaleDateString()}</div>
          {order.requested_delivery_date && (
            <div className="sm:inline sm:ml-4">
              Requested Delivery: {new Date(order.requested_delivery_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}