
import { OrdersList } from "./OrdersList";

interface OrdersTabProps {
  storeId: string;
}

export function OrdersTab({ storeId }: OrdersTabProps) {
  return <OrdersList storeId={storeId} />;
}
