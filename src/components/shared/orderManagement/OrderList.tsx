import { OrderCard } from "./OrderCard";

interface OrderListProps {
  orders: any[];
  loading?: boolean;
  emptyMessage?: string;
  onView: (order: any) => void;
  onApprove?: (order: any) => void;
  onFulfill?: (order: any) => void;
  showActions?: boolean;
  userRole?: string;
}

export function OrderList({ 
  orders, 
  loading = false, 
  emptyMessage = "No orders found",
  onView,
  onApprove,
  onFulfill,
  showActions = true,
  userRole
}: OrderListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onView={onView}
          onApprove={onApprove}
          onFulfill={onFulfill}
          showActions={showActions}
          userRole={userRole}
        />
      ))}
    </div>
  );
}