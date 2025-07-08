import { Badge } from "@/components/ui/badge";

interface OrderStatusBadgeProps {
  status: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export function OrderStatusBadge({ status, variant }: OrderStatusBadgeProps) {
  const getStatusColor = (status: string): typeof variant => {
    switch (status.toLowerCase()) {
      case 'draft': return 'secondary';
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'in_progress': return 'default';
      case 'fulfilled': return 'default';
      case 'completed': return 'default';
      case 'delivered': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Badge variant={variant || getStatusColor(status)} className="text-xs">
      {status.replace('_', ' ')}
    </Badge>
  );
}