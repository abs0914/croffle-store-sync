
import { useQuery } from "@tanstack/react-query";
import { fetchCashierById } from "@/services/cashier";
import { User, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ActiveCashierDisplayProps {
  cashierId?: string;
  className?: string;
}

export default function ActiveCashierDisplay({ cashierId, className = "" }: ActiveCashierDisplayProps) {
  const { data: cashier, isLoading } = useQuery({
    queryKey: ["cashier", cashierId],
    queryFn: () => cashierId ? fetchCashierById(cashierId) : Promise.resolve(null),
    enabled: !!cashierId
  });

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!cashier) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <User className="h-4 w-4 text-orange-500" />
        <span className="text-sm text-orange-600">No cashier assigned</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <User className="h-4 w-4 text-green-600" />
      <div className="flex items-center space-x-1">
        <span className="text-sm font-medium">{cashier.fullName}</span>
        <Badge variant="secondary" className="text-xs">Cashier</Badge>
      </div>
    </div>
  );
}
