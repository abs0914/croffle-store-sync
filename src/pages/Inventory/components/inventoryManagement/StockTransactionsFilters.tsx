
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw } from "lucide-react";
import { InventoryItem } from "@/types/inventoryManagement";

interface StockTransactionsFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedItem: string;
  setSelectedItem: (value: string) => void;
  selectedType: string;
  setSelectedType: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  inventoryItems: InventoryItem[];
  onRefresh: () => void;
}

export function StockTransactionsFilters({
  searchTerm,
  setSearchTerm,
  selectedItem,
  setSelectedItem,
  selectedType,
  setSelectedType,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  inventoryItems,
  onRefresh
}: StockTransactionsFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64"
        />
      </div>
      
      <Select value={selectedItem || "all"} onValueChange={(value) => setSelectedItem(value === "all" ? "" : value)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Items" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Items</SelectItem>
          {inventoryItems.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={selectedType || "all"} onValueChange={(value) => setSelectedType(value === "all" ? "" : value)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="adjustment">Adjustment</SelectItem>
          <SelectItem value="transfer_in">Transfer In</SelectItem>
          <SelectItem value="transfer_out">Transfer Out</SelectItem>
          <SelectItem value="stock_out">Stock Out</SelectItem>
        </SelectContent>
      </Select>
      
      <Input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="w-48"
        placeholder="Start Date"
      />
      
      <Input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="w-48"
        placeholder="End Date"
      />
      
      <Button variant="outline" onClick={onRefresh}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
    </div>
  );
}
