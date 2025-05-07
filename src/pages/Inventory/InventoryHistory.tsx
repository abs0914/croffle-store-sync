
import { useState, useEffect } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useQuery } from "@tanstack/react-query";
import { fetchInventoryTransactions } from "@/services/productService";
import { format } from "date-fns";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileDown } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

export default function InventoryHistory() {
  const { currentStore } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["inventoryTransactions", currentStore?.id],
    queryFn: () => currentStore?.id ? fetchInventoryTransactions(currentStore.id) : Promise.resolve([]),
    enabled: !!currentStore?.id,
  });
  
  const filteredTransactions = transactions.filter(transaction => 
    transaction.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.transaction_type.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const getTransactionTypeStyles = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'sale':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'adjustment':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'return':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'transfer':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };
  
  const getFormattedDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };
  
  const exportToCSV = () => {
    // Simplified CSV export functionality
    const headers = ['Date', 'Product', 'Transaction Type', 'Quantity', 'Previous Stock', 'New Stock', 'Notes'];
    const rows = filteredTransactions.map(t => [
      getFormattedDate(t.created_at),
      t.products?.name,
      t.transaction_type,
      t.quantity,
      t.previous_quantity,
      t.new_quantity,
      t.notes || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory-history-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-croffle-primary">Inventory History</h1>
        <Button variant="outline" onClick={exportToCSV}>
          <FileDown className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
      
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search transactions..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Spinner className="h-8 w-8 text-croffle-accent" />
          <span className="ml-2 text-croffle-primary">Loading transactions...</span>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Previous Stock</TableHead>
                  <TableHead className="text-right">New Stock</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{getFormattedDate(transaction.created_at)}</TableCell>
                      <TableCell>{transaction.products?.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTransactionTypeStyles(transaction.transaction_type)}>
                          {transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.previous_quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.new_quantity}
                      </TableCell>
                      <TableCell>
                        {transaction.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </p>
        </>
      )}
    </div>
  );
}
