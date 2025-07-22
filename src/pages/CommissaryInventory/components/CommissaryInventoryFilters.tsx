
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, AlertTriangle, Calendar, Package } from "lucide-react";
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
  const clearFilters = () => {
    setFilters({
      search: '',
      item_type: 'all',
      category: 'all',
      stockLevel: 'all',
      supplier: '',
      expiring: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.item_type && filters.item_type !== 'all') count++;
    if (filters.category && filters.category !== 'all') count++;
    if (filters.stockLevel && filters.stockLevel !== 'all') count++;
    if (filters.supplier) count++;
    if (filters.expiring && filters.expiring !== 'all') count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle>Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} active</Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
              <Package className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="raw_materials">Raw Materials</SelectItem>
              <SelectItem value="packaging_materials">Packaging Materials</SelectItem>
              <SelectItem value="supplies">Supplies</SelectItem>
              <SelectItem value="finished_goods">Finished Goods</SelectItem>
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
              <SelectItem value="orderable_item">Finished Products</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            value={filters.stockLevel || 'all'}
            onValueChange={(value) => setFilters(prev => ({ ...prev, stockLevel: value as any }))}
          >
            <SelectTrigger>
              <AlertTriangle className="h-4 w-4 mr-2" />
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
            value={filters.expiring || 'all'}
            onValueChange={(value) => setFilters(prev => ({ ...prev, expiring: value as any }))}
          >
            <SelectTrigger>
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Expiry Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="expiring_soon">Expiring Soon (30 days)</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sortBy || 'name'}
            onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value as any }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="stock">Stock Level</SelectItem>
              <SelectItem value="expiry_date">Expiry Date</SelectItem>
              <SelectItem value="updated_at">Last Updated</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sortOrder || 'asc'}
            onValueChange={(value) => setFilters(prev => ({ ...prev, sortOrder: value as any }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>  
  );
}
