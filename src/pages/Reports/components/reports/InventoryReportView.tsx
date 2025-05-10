import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { InventoryReport } from "@/types/reports";
import { useState } from "react";
import { format } from "date-fns";

interface InventoryReportViewProps {
  data: InventoryReport | null;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}
export function InventoryReportView({
  data,
  dateRange
}: InventoryReportViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  if (!data) {
    return <Card>
        <CardContent className="p-4">
          <div className="text-center py-10">
            <p>No inventory data available for the selected period</p>
          </div>
        </CardContent>
      </Card>;
  }
  const filteredItems = data.inventoryItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const getStockStatusColor = (quantity: number, threshold: number) => {
    if (quantity <= 0) return "bg-red-50 text-red-600 border-red-200";
    if (quantity <= threshold) return "bg-yellow-50 text-yellow-600 border-yellow-200";
    return "bg-green-50 text-green-600 border-green-200";
  };
  const dateRangeText = dateRange.from && dateRange.to ? `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}` : 'Custom Range';
  return <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Inventory Status: {dateRangeText}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Items</p>
              <h3 className="text-2xl font-bold text-croffle-primary">{data.totalItems}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Low Stock Items</p>
              <h3 className="text-2xl font-bold text-croffle-primary">{data.lowStockItems}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Out of Stock Items</p>
              <h3 className="text-2xl font-bold text-croffle-primary">{data.outOfStockItems}</h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Menu Management List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search Menu Items.." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Initial Stock</TableHead>
                  <TableHead>Units Sold</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No items found matching your search
                    </TableCell>
                  </TableRow> : filteredItems.map((item, index) => <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.currentStock}</TableCell>
                      <TableCell>{item.initialStock}</TableCell>
                      <TableCell>{item.soldUnits}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStockStatusColor(item.currentStock, item.threshold)}>
                          {item.currentStock <= 0 ? 'Out of Stock' : item.currentStock <= item.threshold ? 'Low Stock' : 'In Stock'}
                        </Badge>
                      </TableCell>
                    </TableRow>)}
              </TableBody>
            </Table>
          </div>
          
          <p className="text-sm text-muted-foreground mt-2">
            Showing {filteredItems.length} of {data.inventoryItems.length} items
          </p>
        </CardContent>
      </Card>
    </div>;
}
