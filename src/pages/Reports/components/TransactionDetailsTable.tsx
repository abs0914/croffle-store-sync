import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/format";

interface Transaction {
  id: string;
  created_at: string;
  receipt_number: string;
  total: number;
  payment_method: string;
  items: any;
  cashier_name?: string;
  customer_name?: string;
}

interface TransactionDetailsTableProps {
  transactions: Transaction[];
}

const ITEMS_PER_PAGE = 20;

export function TransactionDetailsTable({ transactions }: TransactionDetailsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and search transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = tx.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (tx.cashier_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (tx.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPayment = paymentFilter === "all" || tx.payment_method === paymentFilter;
      
      return matchesSearch && matchesPayment;
    });
  }, [transactions, searchTerm, paymentFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  // Reset to first page when filters change
  useState(() => {
    setCurrentPage(1);
  });

  const exportToCSV = () => {
    const csvHeaders = [
      "Date/Time",
      "Receipt Number", 
      "Cashier",
      "Customer",
      "Items",
      "Payment Method",
      "Total"
    ].join(",");

    const csvData = filteredTransactions.map(tx => {
      const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
      const itemsText = items.map((item: any) => `${item.name} (${item.quantity})`).join("; ");
      
      return [
        format(new Date(tx.created_at), "MMM dd, yyyy HH:mm"),
        tx.receipt_number,
        tx.cashier_name || "N/A",
        tx.customer_name || "Walk-in",
        `"${itemsText}"`,
        tx.payment_method,
        tx.total
      ].join(",");
    }).join("\n");

    const csvContent = `${csvHeaders}\n${csvData}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPaymentMethodBadge = (method: string) => {
    const variants: Record<string, string> = {
      'cash': 'default',
      'card': 'secondary', 
      'e-wallet': 'outline'
    };
    
    return (
      <Badge variant={variants[method] as any || 'default'}>
        {method === 'cash' ? 'Cash' : 
         method === 'card' ? 'Card' : 
         method === 'e-wallet' ? 'E-Wallet' : method}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Transaction Details ({filteredTransactions.length})
          </CardTitle>
          <Button onClick={exportToCSV} size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by receipt, cashier, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="e-wallet">E-Wallet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transaction Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Receipt #</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead className="hidden sm:table-cell">Items</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((tx) => {
                const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
                const itemCount = items.length;
                const firstItem = items[0]?.name || 'N/A';
                
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">
                      {format(new Date(tx.created_at), "MMM dd, HH:mm")}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {tx.receipt_number}
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.cashier_name || 'N/A'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      <div className="max-w-48 truncate">
                        {itemCount === 1 ? firstItem : `${firstItem} +${itemCount - 1} more`}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPaymentMethodBadge(tx.payment_method)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(tx.total)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of{' '}
              {filteredTransactions.length} transactions
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    return page === 1 || 
                           page === totalPages || 
                           Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, index, visiblePages) => (
                    <div key={page} className="flex items-center">
                      {index > 0 && visiblePages[index - 1] < page - 1 && (
                        <span className="px-2 text-sm text-muted-foreground">...</span>
                      )}
                      <Button
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8"
                      >
                        {page}
                      </Button>
                    </div>
                  ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}