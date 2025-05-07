
import { InventoryStock } from "@/types";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Edit, Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface InventoryStockListProps {
  stockItems: InventoryStock[];
  isLoading: boolean;
  onEdit: (stockItem: InventoryStock) => void;
  onStockAdjust: (stockItem: InventoryStock) => void;
}

export const InventoryStockList = ({ 
  stockItems, 
  isLoading, 
  onEdit, 
  onStockAdjust 
}: InventoryStockListProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (stockItems.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <p>No inventory items found. Add your first item to get started.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableCaption>List of inventory items</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead className="text-right">Stock Quantity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stockItems.map((stockItem) => (
          <TableRow key={stockItem.id}>
            <TableCell className="font-medium">{stockItem.item}</TableCell>
            <TableCell>{stockItem.unit}</TableCell>
            <TableCell className="text-right">{stockItem.stock_quantity}</TableCell>
            <TableCell>
              {stockItem.is_active ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Inactive
                </span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end space-x-2">
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => onStockAdjust(stockItem)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => onEdit(stockItem)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
