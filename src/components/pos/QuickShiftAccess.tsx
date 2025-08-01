import { Button } from "@/components/ui/button";
import { BarChart, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { useShift } from "@/contexts/shift";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/format";

export function QuickShiftAccess() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentShift } = useShift();

  // Only show for cashiers
  if (user?.role !== 'cashier') {
    return null;
  }

  const handleViewShiftReport = () => {
    navigate('/reports?type=daily_shift');
  };

  return (
    <div className="flex items-center gap-2">
      {currentShift && (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Active Shift
          </Badge>
          <span className="text-muted-foreground">
            Starting: {formatCurrency(currentShift.startingCash)}
          </span>
        </div>
      )}
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleViewShiftReport}
        className="flex items-center gap-2"
      >
        <BarChart className="h-4 w-4" />
        <span className="hidden sm:inline">Shift Report</span>
      </Button>
    </div>
  );
}