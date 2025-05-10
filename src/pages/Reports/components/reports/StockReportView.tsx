
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Warehouse, ChevronDown, ChevronRight } from "lucide-react";
import { StockReport } from "@/types/reports";
import { format } from "date-fns";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface StockReportViewProps {
  data: StockReport | null;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export function StockReportView({
  data,
  dateRange
}: StockReportViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "low" | "out">("all");
  
  if (!data) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-10">
            <p>No stock data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const dateRangeText = dateRange.from && dateRange.to 
    ? `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}` 
    : 'Custom Range';

  // Filter items based on search and active tab
  const filteredItems = data.stockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (activeTab) {
      case "low":
        return matchesSearch && item.currentStock > 0 && item.currentStock <= item.threshold;
      case "out":
        return matchesSearch && item.currentStock <= 0;
      default:
        return matchesSearch;
    }
  });

  const getStockStatusColor = (quantity: number, threshold: number) => {
    if (quantity <= 0) return "bg-red-50 text-red-600 border-red-200";
    if (quantity <= threshold) return "bg-yellow-50 text-yellow-600 border-yellow-200";
    return "bg-green-50 text-green-600 border-green-200";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Stock Status: {dateRangeText}</CardTitle>
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
          <CardTitle className="text-lg">Stock Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Search Stock Items..." 
                  className="pl-8" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>

              <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="low">Low Stock</TabsTrigger>
                  <TabsTrigger value="out">Out of Stock</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Initial Stock</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Consumed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No stock items found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow 
                        key={item.id} 
                        className={selectedItem === item.id ? "bg-muted" : ""}
                        onClick={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
                      >
                        <TableCell className="font-medium cursor-pointer">
                          <div className="flex items-center">
                            {selectedItem === item.id ? (
                              <ChevronDown className="h-4 w-4 mr-2" />
                            ) : (
                              <ChevronRight className="h-4 w-4 mr-2" />
                            )}
                            {item.name}
                          </div>
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">{item.initialStock}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-medium ${item.currentStock <= item.threshold ? 'text-yellow-600' : ''}`}>
                            {item.currentStock}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{item.consumed}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStockStatusColor(item.currentStock, item.threshold)}>
                            {item.currentStock <= 0 ? 'Out of Stock' : item.currentStock <= item.threshold ? 'Low Stock' : 'In Stock'}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.lastUpdated}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            <p className="text-sm text-muted-foreground mt-2">
              Showing {filteredItems.length} of {data.stockItems.length} items
            </p>
          </div>

          {/* Transaction and Shift Details Section */}
          {selectedItem && (
            <div className="mt-6 border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">
                {data.stockItems.find(item => item.id === selectedItem)?.name} Details
              </h3>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="transactions">
                  <AccordionTrigger>Transaction History</AccordionTrigger>
                  <AccordionContent>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Transaction Type</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Previous Stock</TableHead>
                            <TableHead className="text-right">New Stock</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.stockItems.find(item => item.id === selectedItem)?.transactions.map((tx, index) => (
                            <TableRow key={index}>
                              <TableCell>{tx.date}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  tx.type === 'adjustment' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                  tx.type === 'transfer_in' ? 'bg-green-50 text-green-600 border-green-200' :
                                  tx.type === 'transfer_out' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                                  'bg-gray-50 text-gray-600 border-gray-200'
                                }>
                                  {tx.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{tx.quantity}</TableCell>
                              <TableCell className="text-right">{tx.previousStock}</TableCell>
                              <TableCell className="text-right">{tx.newStock}</TableCell>
                            </TableRow>
                          ))}
                          {(data.stockItems.find(item => item.id === selectedItem)?.transactions.length || 0) === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-4">
                                No transactions recorded for this item in the selected date range
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </CardContent>
      </Card>

      {data.shiftData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shift Inventory Counts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Inventory Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.shiftData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No shift data available for the selected period
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.shiftData.map((shift) => (
                      <TableRow key={shift.shiftId}>
                        <TableCell>{shift.userName}</TableCell>
                        <TableCell>{shift.startTime}</TableCell>
                        <TableCell>{shift.endTime || 'Active'}</TableCell>
                        <TableCell>
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="changes">
                              <AccordionTrigger className="py-2">View Inventory Changes</AccordionTrigger>
                              <AccordionContent>
                                {Object.keys(shift.startInventory).length === 0 ? (
                                  <p className="text-sm text-muted-foreground py-2">No inventory count recorded</p>
                                ) : (
                                  <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Item ID</TableHead>
                                          <TableHead className="text-right">Start Count</TableHead>
                                          <TableHead className="text-right">End Count</TableHead>
                                          <TableHead className="text-right">Difference</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {Object.keys(shift.startInventory).map((itemId) => {
                                          const startCount = shift.startInventory[itemId] || 0;
                                          const endCount = shift.endInventory ? (shift.endInventory[itemId] || 0) : null;
                                          const difference = endCount !== null ? endCount - startCount : null;
                                          
                                          return (
                                            <TableRow key={itemId}>
                                              <TableCell>{itemId}</TableCell>
                                              <TableCell className="text-right">{startCount}</TableCell>
                                              <TableCell className="text-right">{endCount !== null ? endCount : 'N/A'}</TableCell>
                                              <TableCell className="text-right">
                                                {difference !== null ? (
                                                  <span className={
                                                    difference < 0 ? 'text-red-600' : 
                                                    difference > 0 ? 'text-green-600' : ''
                                                  }>
                                                    {difference}
                                                  </span>
                                                ) : 'N/A'}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
