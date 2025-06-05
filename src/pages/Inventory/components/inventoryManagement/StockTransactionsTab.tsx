
import { StockTransactionsList } from "./StockTransactionsList";

interface StockTransactionsTabProps {
  storeId: string;
}

export function StockTransactionsTab({ storeId }: StockTransactionsTabProps) {
  return <StockTransactionsList storeId={storeId} />;
}
