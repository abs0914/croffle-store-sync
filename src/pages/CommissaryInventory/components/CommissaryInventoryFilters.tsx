
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { CommissaryInventoryFilters } from "@/types/inventoryManagement";

interface CommissaryInventoryFiltersProps {
  filters: CommissaryInventoryFilters;
  setFilters: React.Dispatch<React.SetStateAction<CommissaryInventoryFilters>>;
  suppliers: any[];
}

export function CommissaryInventoryFiltersComponent({ 
  filters, 
  setFilters, 
  suppliers 
}: CommissaryInventoryFiltersProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>
          
          <Select
            value={filters.category || 'all'}
            onValueChange={(value) => setFilters(prev => ({ ...prev, category: value as any }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="raw_materials">Raw Materials</SelectItem>
              <SelectItem value="packaging_materials">Packaging Materials</SelectItem>
              <SelectItem value="supplies">Supplies</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.item_type || 'all'}
            onValueChange={(value) => setFilters(prev => ({ ...prev, item_type: value as any }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Item Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="raw_material">Raw Materials</SelectItem>
              <SelectItem value="supply">Supplies</SelectItem>
              <SelectItem value="orderable_item">Orderable Items</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.stockLevel || 'all'}
            onValueChange={(value) => setFilters(prev => ({ ...prev, stockLevel: value as any }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Stock Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock Levels</SelectItem>
              <SelectItem value="good">Good Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.supplier || 'none'}
            onValueChange={(value) => setFilters(prev => ({ ...prev, supplier: value === 'none' ? '' : value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All Suppliers</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>  
  );
}
