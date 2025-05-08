
import { Button } from "@/components/ui/button";
import { Customer } from "@/types";

interface CustomerDisplayProps {
  customer: Customer;
  onClear: () => void;
}

export default function CustomerDisplay({ customer, onClear }: CustomerDisplayProps) {
  return (
    <div className="mt-2 p-2 border rounded-md bg-muted">
      <p className="font-medium">{customer.name}</p>
      <p className="text-sm text-muted-foreground">{customer.phone}</p>
      {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
      <Button 
        variant="ghost" 
        size="sm" 
        className="mt-1 h-8 text-xs"
        onClick={onClear}
      >
        Clear
      </Button>
    </div>
  );
}
