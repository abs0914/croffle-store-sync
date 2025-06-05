
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, TrendingUp, TrendingDown, RefreshCw, Package } from "lucide-react";
import { fetchStockTransactions, getTransactionSummary } from "@/services/inventoryManagement/stockTransactionService";
import { fetchInventoryItems } from "@/services/inventoryManagement/inventoryItemService";
import { StockTransaction, InventoryItem } from "@/types/inventoryManagement";
import { format } from "date-fns";

interface StockTransactionsListProps {
  storeId: string;
}

export function StockTransactionsList({ storeId }: StockTransactionsListProps) {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    adjustments: 0,
    transfers: 0,
    stockOuts: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    setLoading(true);
    
    // Load transactions with filters
    const filters = {
      itemId: selectedItem || undefined,
      transactionType: selectedType || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };
    
    const [transactionData, itemData, summaryData] = await Promise.all([
      fetchStockTransactions(storeId, filters),
      fetchInventoryItems(storeId),
      getTransactionSummary(storeId)
    ]);
    
    setTransactions(transactionData);
    setInventoryItems(itemData);
    setSummary(summaryData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [storeId, selectedItem, selectedType, startDate, endDate]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'adjustment':
        return <RefreshCw className="h-4 w-4" />;
      case 'transfer_in':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'transfer_out':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stock_out':
        return <Package className="h-4 w-4 text-orange-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'adjustment':
        return 'bg-blue-100 text-blue-800';
      case 'transfer_in':
        return 'bg-green-100 text-green-800';
      case 'transfer_out':
        return 'bg-red-100 text-red-800';
      case 'stock_out':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        transaction.notes?.toLowerCase().includes(searchLower) ||
        transaction.reference_id?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{summary.totalTransactions}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Adjustments</p>
                <p className="text-2xl font-bold">{summary.adjustments}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transfers</p>
                <p className="text-2xl font-bold">{summary.transfers}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Outs</p>
                <p className="text-2xl font-bold">{summary.stockOuts}</p>
              </div>
              <Package className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Stock Transaction History
          </CardTitle>
        </CardHeader>
        
        <CardContent>
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
            
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Items</SelectItem>
                {inventoryItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
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
            
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Transaction List */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || selectedItem || selectedType || startDate || endDate
                  ? 'No transactions found matching your filters'
                  : 'No stock transactions recorded yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.transaction_type)}
                      <div>
                        <p className="font-medium">
                          Inventory Item Transaction
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transaction.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                    
                    <Badge className={getTransactionColor(transaction.transaction_type)}>
                      {transaction.transaction_type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Quantity Change: </span>
                      <span className={transaction.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}>
                        {transaction.quantity_change > 0 ? '+' : ''}{transaction.quantity_change}
                      </span>
                    </div>
                    
                    <div>
                      <span className="font-medium">Stock: </span>
                      {transaction.previous_stock} → {transaction.new_stock}
                    </div>
                    
                    {transaction.reference_id && (
                      <div>
                        <span className="font-medium">Reference: </span>
                        {transaction.reference_id}
                      </div>
                    )}
                  </div>
                  
                  {transaction.notes && (
                    <div className="text-sm">
                      <span className="font-medium">Notes: </span>
                      {transaction.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
