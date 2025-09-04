import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Upload, Download, CheckCircle, AlertCircle, Banknote, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency, formatDate } from "@/utils/format";
import { toast } from "sonner";

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  reference: string;
  matched: boolean;
  bookEntry?: string;
}

interface BookTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  reference: string;
  matched: boolean;
  bankEntry?: string;
}

export function BankReconciliation() {
  const [selectedAccount, setSelectedAccount] = useState("main-cash");
  const [reconciliationDate, setReconciliationDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankBalance, setBankBalance] = useState("125,450.00");
  const [bookBalance] = useState("123,890.00");

  const [bankTransactions] = useState<BankTransaction[]>([
    {
      id: "b1",
      date: "2025-01-31",
      description: "Customer Payment - Invoice #1234",
      amount: 15000,
      type: "credit",
      reference: "TXN001",
      matched: false
    },
    {
      id: "b2", 
      date: "2025-01-31",
      description: "Service Charge",
      amount: 250,
      type: "debit", 
      reference: "SC001",
      matched: false
    },
    {
      id: "b3",
      date: "2025-01-30", 
      description: "Supplier Payment",
      amount: 8500,
      type: "debit",
      reference: "PAY001",
      matched: true,
      bookEntry: "je1"
    }
  ]);

  const [bookTransactions] = useState<BookTransaction[]>([
    {
      id: "je1",
      date: "2025-01-30",
      description: "Payment to ABC Supplier", 
      amount: 8500,
      type: "debit",
      reference: "JE-2025-001234",
      matched: true,
      bankEntry: "b3"
    },
    {
      id: "je2",
      date: "2025-01-29",
      description: "Sales Receipt - Store 001",
      amount: 12000,
      type: "credit", 
      reference: "JE-2025-001235",
      matched: false
    },
    {
      id: "je3",
      date: "2025-01-31",
      description: "Petty Cash Replenishment",
      amount: 2500,
      type: "debit",
      reference: "JE-2025-001236", 
      matched: false
    }
  ]);

  const [selectedBankTxns, setSelectedBankTxns] = useState<string[]>([]);
  const [selectedBookTxns, setSelectedBookTxns] = useState<string[]>([]);

  const unmatchedBankTxns = bankTransactions.filter(txn => !txn.matched);
  const unmatchedBookTxns = bookTransactions.filter(txn => !txn.matched);
  
  const bankReceipts = bankTransactions.filter(txn => txn.type === "credit").reduce((sum, txn) => sum + txn.amount, 0);
  const bankPayments = bankTransactions.filter(txn => txn.type === "debit").reduce((sum, txn) => sum + txn.amount, 0);
  
  const handleMatchTransactions = () => {
    if (selectedBankTxns.length === 1 && selectedBookTxns.length === 1) {
      toast.success("Transactions matched successfully");
      setSelectedBankTxns([]);
      setSelectedBookTxns([]);
    } else {
      toast.error("Please select exactly one transaction from each side");
    }
  };

  const handleAutoMatch = () => {
    toast.success("Auto-matching completed. Found 2 matches.");
  };

  const handleImportBankStatement = () => {
    toast.success("Bank statement imported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/accounting">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Accounting
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-croffle-text">Bank Reconciliation</h1>
          <p className="text-croffle-text/70">
            Reconcile bank statements with book records
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportBankStatement}>
            <Upload className="h-4 w-4 mr-2" />
            Import Bank Statement
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Reconciliation Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-croffle-accent" />
            Reconciliation Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account">Bank Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main-cash">Main Cash Account - BPI</SelectItem>
                  <SelectItem value="savings">Business Savings - BDO</SelectItem>
                  <SelectItem value="payroll">Payroll Account - Metrobank</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Reconciliation Date</Label>
              <Input
                id="date"
                type="date" 
                value={reconciliationDate}
                onChange={(e) => setReconciliationDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance">Bank Statement Balance</Label>
              <Input
                id="balance"
                value={bankBalance}
                onChange={(e) => setBankBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-croffle-text">₱{bankBalance}</div>
            <p className="text-xs text-croffle-text/70">Statement balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Book Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-croffle-text">₱{bookBalance}</div>
            <p className="text-xs text-croffle-text/70">General ledger</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Difference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ₱{(parseFloat(bankBalance.replace(/,/g, '')) - parseFloat(bookBalance.replace(/,/g, ''))).toLocaleString()}
            </div>
            <p className="text-xs text-croffle-text/70">Needs reconciliation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unmatched Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-croffle-text">
              {unmatchedBankTxns.length + unmatchedBookTxns.length}
            </div>
            <p className="text-xs text-croffle-text/70">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Matching Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Matching</CardTitle>
          <CardDescription>
            Select transactions from both sides to match them
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              onClick={handleMatchTransactions}
              disabled={selectedBankTxns.length !== 1 || selectedBookTxns.length !== 1}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Match Selected ({selectedBankTxns.length + selectedBookTxns.length})
            </Button>
            <Button variant="outline" onClick={handleAutoMatch}>
              Auto Match
            </Button>
            <Button variant="outline">
              Create Adjustment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bank Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-croffle-accent" />
                Bank Statement
              </span>
              <Badge variant="outline">
                {unmatchedBankTxns.length} unmatched
              </Badge>
            </CardTitle>
            <CardDescription>
              Transactions from bank statement as of {formatDate(reconciliationDate)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bankTransactions.map((txn) => (
                <div 
                  key={txn.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg ${
                    txn.matched ? 'bg-green-50 border-green-200' : 'bg-white'
                  } ${selectedBankTxns.includes(txn.id) ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <Checkbox
                    checked={selectedBankTxns.includes(txn.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedBankTxns([...selectedBankTxns, txn.id]);
                      } else {
                        setSelectedBankTxns(selectedBankTxns.filter(id => id !== txn.id));
                      }
                    }}
                    disabled={txn.matched}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{txn.description}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                        </span>
                        {txn.matched && <CheckCircle className="h-4 w-4 text-green-600" />}
                      </div>
                    </div>
                    <div className="text-xs text-croffle-text/70 flex justify-between">
                      <span>{formatDate(txn.date)}</span>
                      <span>Ref: {txn.reference}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Book Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-croffle-accent" />
                Book Records
              </span>
              <Badge variant="outline">
                {unmatchedBookTxns.length} unmatched
              </Badge>
            </CardTitle>
            <CardDescription>
              Journal entries and transactions from general ledger
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bookTransactions.map((txn) => (
                <div 
                  key={txn.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg ${
                    txn.matched ? 'bg-green-50 border-green-200' : 'bg-white'
                  } ${selectedBookTxns.includes(txn.id) ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <Checkbox
                    checked={selectedBookTxns.includes(txn.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedBookTxns([...selectedBookTxns, txn.id]);
                      } else {
                        setSelectedBookTxns(selectedBookTxns.filter(id => id !== txn.id));
                      }
                    }}
                    disabled={txn.matched}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{txn.description}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                        </span>
                        {txn.matched && <CheckCircle className="h-4 w-4 text-green-600" />}
                      </div>
                    </div>
                    <div className="text-xs text-croffle-text/70 flex justify-between">
                      <span>{formatDate(txn.date)}</span>
                      <span>JE: {txn.reference}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Reconciliation</CardTitle>
          <CardDescription>
            Finalize the reconciliation process when all items are matched
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-sm text-croffle-text/70 mb-2">
                Outstanding Items: {unmatchedBankTxns.length + unmatchedBookTxns.length}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ 
                    width: `${((bankTransactions.length + bookTransactions.length - unmatchedBankTxns.length - unmatchedBookTxns.length) / (bankTransactions.length + bookTransactions.length)) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
            <Button 
              disabled={unmatchedBankTxns.length + unmatchedBookTxns.length > 0}
              className="ml-auto"
            >
              Complete Reconciliation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}