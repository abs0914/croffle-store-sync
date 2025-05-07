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
import { Edit, Plus, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface InventoryStockListProps {
  stockItems: InventoryStock[];
  isLoading: boolean;
  onEdit: (stockItem: InventoryStock) => void;
  onStockAdjust: (stockItem: InventoryStock) => void;
  onStockTransfer?: (stockItem: InventoryStock) => void;
  onDelete?: (stockItem: InventoryStock) => void; // Changed from (id: string) => void to match how it's used
  hasMultipleStores?: boolean;
}

export const InventoryStockList = ({ 
  stockItems, 
  isLoading, 
  onEdit, 
  onStockAdjust,
  onStockTransfer,
  onDelete,
  hasMultipleStores = false
}: InventoryStockListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof InventoryStock; direction: 'asc' | 'desc' }>({
    key: 'item',
    direction: 'asc'
  });

  // Filter items based on search
  const filteredItems = stockItems.filter(item => 
    item.item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort items based on the current sort configuration
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key: keyof InventoryStock) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

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

  const getSortIcon = (key: keyof InventoryStock) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div>
      <div className="mb-4">
        <Input
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      
      <Table>
        <TableCaption>List of inventory items</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('item')}
            >
              Item {getSortIcon('item')}
            </TableHead>
            <TableHead>Unit</TableHead>
            <TableHead 
              className="text-right cursor-pointer"
              onClick={() => handleSort('stock_quantity')}
            >
              Stock Quantity {getSortIcon('stock_quantity')}
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('updated_at')}
            >
              Last Updated {getSortIcon('updated_at')}
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.map((stockItem) => (
            <TableRow key={stockItem.id}>
              <TableCell className="font-medium">{stockItem.item}</TableCell>
              <TableCell>{stockItem.unit}</TableCell>
              <TableCell className="text-right">
                <span className={`font-medium ${stockItem.stock_quantity <= 5 ? 'text-destructive' : ''}`}>
                  {stockItem.stock_quantity}
                </span>
              </TableCell>
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
              <TableCell>
                {stockItem.updated_at ? format(new Date(stockItem.updated_at), 'MMM dd, yyyy') : 'N/A'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => onStockAdjust(stockItem)}
                    title="Adjust Stock"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="outline"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white">
                      <DropdownMenuItem onClick={() => onEdit(stockItem)}>
                        Edit Details
                      </DropdownMenuItem>
                      
                      {hasMultipleStores && onStockTransfer && (
                        <DropdownMenuItem onClick={() => onStockTransfer(stockItem)}>
                          Transfer to Another Store
                        </DropdownMenuItem>
                      )}
                      
                      {onDelete && (
                        <DropdownMenuItem 
                          className="text-destructive" 
                          onClick={() => onDelete(stockItem)} // Changed from onDelete(stockItem.id) to pass the whole object
                        >
                          Delete Item
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
