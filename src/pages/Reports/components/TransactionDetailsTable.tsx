import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Filter, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trash2, Printer, FileDown } from "lucide-react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth";
import { VoidTransactionDialog } from "@/components/pos/void/VoidTransactionDialog";
import { voidTransaction, VoidRequestData } from "@/services/transactions/voidTransactionService";
import { toast } from "sonner";
import { hasPermission } from "@/types/rolePermissions";
import { supabase } from "@/integrations/supabase/client";
import { formatInTimeZone as formatInTZ } from "date-fns-tz";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { BluetoothPrinterService } from "@/services/printer/BluetoothPrinterService";
import { Transaction as PosTransaction } from "@/types";
import { Store } from "@/types/store";
import { ReceiptPdfGenerator, ReceiptData } from "@/services/reports/receiptPdfGenerator";

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
  onTransactionVoided?: () => void; // Callback to refresh transactions after voiding
}

const ITEMS_PER_PAGE = 20;

export function TransactionDetailsTable({ transactions, onTransactionVoided }: TransactionDetailsTableProps) {
  const { user } = useAuth();
  const { isConnected, connectedPrinter } = useThermalPrinter();
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set());
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);
  const [isReprinting, setIsReprinting] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Check if user can void transactions (managers, admins, owners)
  const canVoidTransactions = user?.role ? 
    hasPermission(user.role, 'order_management') || 
    hasPermission(user.role, 'user_management') : false;

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

  const toggleTransactionExpansion = (transactionId: string) => {
    const newExpanded = new Set(expandedTransactions);
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId);
    } else {
      newExpanded.add(transactionId);
    }
    setExpandedTransactions(newExpanded);
  };

  const handleVoidClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setVoidDialogOpen(true);
  };

  const handleVoidConfirm = async (voidData: VoidRequestData) => {
    setIsVoiding(true);
    try {
      const result = await voidTransaction(voidData);
      
      if (result.success) {
        toast.success('Transaction voided successfully');
        setVoidDialogOpen(false);
        setSelectedTransaction(null);
        // Call the callback to refresh transactions
        if (onTransactionVoided) {
          onTransactionVoided();
        }
      } else {
        toast.error(result.message || 'Failed to void transaction');
      }
    } catch (error) {
      console.error('Error voiding transaction:', error);
      toast.error('An error occurred while voiding the transaction');
    } finally {
      setIsVoiding(false);
    }
  };

  const handleReprintReceipt = async (transaction: Transaction) => {
    setIsReprinting(transaction.id);
    try {
      console.log('🖨️ Reprinting receipt for transaction:', transaction.receipt_number);
      
      // Fetch complete transaction details with all relationships
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select(`
          *,
          stores:store_id (
            id,
            name,
            address,
            phone,
            bir_store_config (
              tin,
              business_name,
              business_address,
              accreditation_number,
              permit_number,
              machine_identification_number,
              machine_serial_number
            )
          ),
          customers:customer_id (
            id,
            name,
            phone,
            email,
            tin
          )
        `)
        .eq('id', transaction.id)
        .single();

      if (txError || !txData) {
        console.error('Failed to fetch transaction:', txError);
        throw new Error('Failed to fetch complete transaction details');
      }

      console.log('✅ Transaction data fetched:', txData);

      // Parse items if they're stored as JSON string
      const items = typeof transaction.items === 'string' 
        ? JSON.parse(transaction.items) 
        : transaction.items;

      // Extract store and BIR config
      const storeData = txData.stores as any;
      const birConfig = storeData?.bir_store_config?.[0] || storeData?.bir_store_config;

      // Transform database transaction to POS Transaction type
      const posTransaction: PosTransaction = {
        id: txData.id,
        receiptNumber: txData.receipt_number,
        items: items.map((item: any) => ({
          productId: item.productId || item.id || '',
          variationId: item.variationId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice || item.unit_price || 0,
          totalPrice: item.totalPrice || item.total_price || (item.unitPrice * item.quantity),
          category: item.category,
          customizations: item.customizations || []
        })),
        subtotal: txData.subtotal || txData.total,
        total: txData.total,
        tax: txData.tax || 0,
        discount: txData.discount || txData.discount_amount || 0,
        discountType: (txData.discount_type as any) || undefined,
        discountIdNumber: txData.discount_id_number,
        amountTendered: txData.amount_tendered,
        change: txData.change,
        paymentMethod: txData.payment_method as 'cash' | 'card' | 'e-wallet',
        paymentDetails: (txData.payment_details as any) || undefined,
        status: txData.status as 'completed' | 'voided',
        createdAt: txData.created_at,
        storeId: txData.store_id,
        userId: txData.user_id,
        shiftId: txData.shift_id,
        customerId: txData.customer_id,
        
        // Order type info
        orderType: (txData.order_type as any) || undefined,
        deliveryPlatform: (txData.delivery_platform as any) || undefined,
        deliveryOrderNumber: txData.delivery_order_number,
        
        // BIR compliance fields - use database field names
        vat_sales: txData.vat_sales || 0,
        vat_exempt_sales: txData.vat_exempt_sales || 0,
        zero_rated_sales: txData.zero_rated_sales || 0,
        senior_citizen_discount: txData.senior_citizen_discount || txData.senior_discount || 0,
        pwd_discount: txData.pwd_discount || 0,
        sequence_number: txData.sequence_number,
        terminal_id: txData.terminal_id || 'TERMINAL-01',
      };

      // Transform store data - use only fields that exist in Store type
      const storeFormatted: Store = {
        id: storeData.id,
        name: storeData.name,
        address: storeData.address,
        phone: storeData.phone,
        is_active: true,
        created_at: '',
        // BIR fields
        tin: birConfig?.tin,
        business_name: birConfig?.business_name,
        accreditation_number: birConfig?.accreditation_number,
        permit_number: birConfig?.permit_number,
        machine_serial_number: birConfig?.machine_serial_number,
        machine_accreditation_number: birConfig?.machine_identification_number,
      };

      // Transform customer data if exists
      const customerData = txData.customers ? {
        id: txData.customers.id,
        name: txData.customers.name,
        phone: txData.customers.phone,
        email: txData.customers.email,
        tin: txData.customers.tin
      } : undefined;

      console.log('🔄 Transformed data for printer');

      // Print using proper thermal printer service
      if (isConnected && connectedPrinter) {
        console.log('🖨️ Printing to connected thermal printer:', connectedPrinter.name);
        
        const success = await BluetoothPrinterService.printReceipt(
          posTransaction,
          customerData,
          storeFormatted,
          txData.cashier_name || 'Cashier',
          false // Don't auto-open drawer for reprints
        );

        if (success) {
          toast.success(`Receipt sent to ${connectedPrinter.name}`);
          console.log('✅ Receipt printed successfully');
        } else {
          throw new Error('Failed to print to thermal printer');
        }
      } else {
        // Fallback: Browser print dialog
        console.log('⚠️ No thermal printer connected, using browser print');
        toast.info('No thermal printer connected. Opening browser print dialog...');
        
        // Use browser print
        window.print();
      }

    } catch (error: any) {
      console.error('❌ Error reprinting receipt:', error);
      toast.error(error.message || 'Failed to reprint receipt');
    } finally {
      setIsReprinting(null);
    }
  };

  const handleDownloadReceipt = async (transaction: Transaction) => {
    setIsDownloading(transaction.id);
    try {
      console.log('📥 Downloading receipt for transaction:', transaction.receipt_number);
      
      // Fetch complete transaction details
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select(`
          *,
          stores:store_id (
            id,
            name,
            address,
            phone,
            bir_store_config (
              tin,
              business_name,
              business_address
            )
          )
        `)
        .eq('id', transaction.id)
        .single();

      if (txError || !txData) {
        throw new Error('Failed to fetch transaction details');
      }

      const storeData = txData.stores as any;
      const birConfig = storeData?.bir_store_config?.[0] || storeData?.bir_store_config;
      
      // Parse items
      const items = typeof txData.items === 'string' 
        ? JSON.parse(txData.items) 
        : txData.items;

      // Build receipt data
      const receiptData: ReceiptData = {
        receiptNumber: txData.receipt_number,
        businessDate: txData.created_at,
        transactionTime: formatInTimeZone(new Date(txData.created_at), 'Asia/Manila', 'HH:mm:ss'),
        storeName: birConfig?.business_name || storeData?.name || 'Store',
        storeAddress: birConfig?.business_address || storeData?.address || '',
        storeTin: birConfig?.tin || '',
        cashierName: txData.cashier_name || 'Cashier',
        items: items.map((item: any) => ({
          description: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice || item.unit_price || 0,
          lineTotal: item.totalPrice || item.total_price || (item.quantity * (item.unitPrice || item.unit_price || 0)),
          itemDiscount: 0,
          vatExemptFlag: txData.discount_type === 'senior' || txData.discount_type === 'pwd'
        })),
        grossAmount: txData.subtotal || txData.total,
        discountAmount: txData.discount || txData.discount_amount || 0,
        netAmount: txData.total,
        vatAmount: txData.vat_sales ? (txData.total - (txData.total / 1.12)) : (txData.total / 1.12 * 0.12),
        paymentMethod: txData.payment_method || 'Cash',
        discountType: txData.discount_type,
        seniorDiscount: txData.senior_citizen_discount || txData.senior_discount || 0,
        pwdDiscount: txData.pwd_discount || 0,
        amountTendered: txData.amount_tendered,
        change: txData.change
      };

      // Generate PDF
      const generator = new ReceiptPdfGenerator();
      const pdfDataUri = await generator.generateReceipt(receiptData);
      
      // Trigger download
      const link = document.createElement('a');
      link.href = pdfDataUri;
      link.download = `receipt-${txData.receipt_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Receipt downloaded');
    } catch (error: any) {
      console.error('❌ Error downloading receipt:', error);
      toast.error(error.message || 'Failed to download receipt');
    } finally {
      setIsDownloading(null);
    }
  };

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
        formatInTimeZone(new Date(tx.created_at), 'Asia/Manila', "MMM dd, yyyy HH:mm"),
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
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((tx) => {
                const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
                const hasMultipleItems = items.length > 1;
                const isExpanded = expandedTransactions.has(tx.id);
                
                return (
                  <>
                    {/* Main transaction row */}
                    <TableRow key={tx.id} className={cn(hasMultipleItems && "cursor-pointer hover:bg-muted/50")}>
                      <TableCell className="text-sm">
                        {formatInTimeZone(new Date(tx.created_at), 'Asia/Manila', "MMM dd, HH:mm")}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {tx.receipt_number}
                      </TableCell>
                      <TableCell className="text-sm">
                        {tx.cashier_name || 'N/A'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        <div className="flex items-center gap-2">
                          {hasMultipleItems && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleTransactionExpansion(tx.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                          <div className="max-w-48 truncate">
                            {hasMultipleItems ? (
                              <span className="text-muted-foreground">
                                {items.length} items
                              </span>
                            ) : (
                              items[0]?.name || 'N/A'
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodBadge(tx.payment_method)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(tx.total)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReprintReceipt(tx)}
                            disabled={isReprinting === tx.id}
                            className="h-8 w-8 p-0"
                            title="Reprint Receipt"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadReceipt(tx)}
                            disabled={isDownloading === tx.id}
                            className="h-8 w-8 p-0"
                            title="Download Receipt PDF"
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          {canVoidTransactions && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVoidClick(tx)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="Void Transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded items rows */}
                    {hasMultipleItems && isExpanded && items.map((item: any, itemIndex: number) => (
                      <TableRow key={`${tx.id}-item-${itemIndex}`} className="bg-muted/25">
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell className="hidden sm:table-cell text-sm pl-8">
                          <div className="flex items-center justify-between">
                            <span>{item.name}</span>
                            <span className="text-xs text-muted-foreground">
                              Qty: {item.quantity}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatCurrency(item.totalPrice || (item.unitPrice * item.quantity))}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))}
                  </>
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

        {/* Void Transaction Dialog */}
        <VoidTransactionDialog
          isOpen={voidDialogOpen}
          onClose={() => {
            setVoidDialogOpen(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
          onConfirmVoid={handleVoidConfirm}
          isVoiding={isVoiding}
        />
      </CardContent>
    </Card>
  );
}