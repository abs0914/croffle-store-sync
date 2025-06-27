
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { getCommissaryStockLevel } from "@/services/inventoryManagement/commissaryInventoryService";
import { formatCurrency } from "@/utils/format";

interface InventoryItemCardProps {
  item: CommissaryInventoryItem;
  onEdit: (item: CommissaryInventoryItem) => void;
  onStockAdjustment: (item: CommissaryInventoryItem) => void;
  onDelete: (item: CommissaryInventoryItem) => void;
}

export function InventoryItemCard({ 
  item, 
  onEdit, 
  onStockAdjustment, 
  onDelete 
}: InventoryItemCardProps) {
  const stockLevel = getCommissaryStockLevel(item);

  const getStockLevelIcon = (level: 'good' | 'low' | 'out') => {
    switch (level) {
      case 'good': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'low': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'out': return <Package className="h-4 w-4 text-red-600" />;
    }
  };

  const getStockLevelBadge = (level: 'good' | 'low' | 'out') => {
    const variants = {
      good: 'default',
      low: 'secondary',
      out: 'destructive'
    } as const;

    return (
      <Badge variant={variants[level]} className="flex items-center gap-1">
        {getStockLevelIcon(level)}
        {level.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold">{item.name}</h3>
            {getStockLevelBadge(stockLevel)}
            <Badge variant="outline">{item.category.replace('_', ' ')}</Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Current Stock:</span> {item.current_stock} {item.uom}
            </div>
            <div>
              <span className="font-medium">Min Threshold:</span> {item.minimum_threshold} {item.uom}
            </div>
            <div>
              <span className="font-medium">Unit Cost:</span> {item.unit_cost ? formatCurrency(item.unit_cost) : 'N/A'}
            </div>
            <div>
              <span className="font-medium">Supplier:</span> {item.supplier?.name || 'N/A'}
            </div>
          </div>
          
          {item.sku && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">SKU:</span> {item.sku}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(item)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStockAdjustment(item)}
          >
            <Package className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(item)}
            className="text-red-600 hover:text-red-700"
          >
            <AlertTriangle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
