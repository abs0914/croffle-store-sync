
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, TrendingUp, Trash2, AlertTriangle } from "lucide-react";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";

interface InventoryItemCardProps {
  item: CommissaryInventoryItem;
  onEdit: (item: CommissaryInventoryItem) => void;
  onStockAdjustment: (item: CommissaryInventoryItem) => void;
  onDelete: (item: CommissaryInventoryItem) => void;
}

export function InventoryItemCard({ item, onEdit, onStockAdjustment, onDelete }: InventoryItemCardProps) {
  const getStockStatus = () => {
    if (item.current_stock <= 0) return { status: 'out', color: 'destructive', icon: AlertTriangle };
    if (item.current_stock <= item.minimum_threshold) return { status: 'low', color: 'warning', icon: AlertTriangle };
    return { status: 'good', color: 'default', icon: null };
  };

  const stockStatus = getStockStatus();
  const StatusIcon = stockStatus.icon;

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatItemType = (itemType: string) => {
    return itemType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg">{item.name}</h3>
              <Badge variant="outline">{formatCategory(item.category)}</Badge>
              <Badge variant="secondary">{formatItemType(item.item_type)}</Badge>
              {StatusIcon && (
                <Badge variant={stockStatus.color as any} className="flex items-center gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {stockStatus.status}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Current Stock</p>
                <p className="font-medium">{item.current_stock} {item.uom}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Min Threshold</p>
                <p className="font-medium">{item.minimum_threshold} {item.uom}</p>
              </div>
              {item.unit_cost && (
                <div>
                  <p className="text-muted-foreground">Unit Cost</p>
                  <p className="font-medium">₱{item.unit_cost.toFixed(2)}</p>
                </div>
              )}
              {item.sku && (
                <div>
                  <p className="text-muted-foreground">SKU</p>
                  <p className="font-medium">{item.sku}</p>
                </div>
              )}
            </div>

            {item.storage_location && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">
                  Location: {item.storage_location}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(item)}
              className="flex items-center gap-1"
            >
              <Edit className="h-3 w-3" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStockAdjustment(item)}
              className="flex items-center gap-1"
            >
              <TrendingUp className="h-3 w-3" />
              Adjust
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(item)}
              className="flex items-center gap-1 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
