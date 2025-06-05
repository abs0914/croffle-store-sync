
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { fetchStockTransactions, getTransactionSummary } from "@/services/inventoryManagement/stockTransactionService";
import { fetchInventoryItems } from "@/services/inventoryManagement/inventoryItemService";
import { StockTransaction, InventoryItem } from "@/types/inventoryManagement";
import { StockTransactionsSummary } from "./StockTransactionsSummary";
import { StockTransactionsFilters } from "./StockTransactionsFilters";
import { StockTransactionsContent } from "./StockTransactionsContent";

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

  const hasFilters = searchTerm || selectedItem || selectedType || startDate || endDate;

  return (
    <div className="space-y-6">
      <StockTransactionsSummary summary={summary} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Stock Transaction History
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <StockTransactionsFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            inventoryItems={inventoryItems}
            onRefresh={loadData}
          />

          <StockTransactionsContent
            loading={loading}
            transactions={filteredTransactions}
            hasFilters={!!hasFilters}
          />
        </CardContent>
      </Card>
    </div>
  );
}
