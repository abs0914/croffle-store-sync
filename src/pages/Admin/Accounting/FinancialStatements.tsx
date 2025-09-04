import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, FileText, BarChart3, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { generateFinancialStatementPdf } from "@/services/reports/financialStatementPdfGenerator";
import { useToast } from "@/hooks/use-toast";

export function FinancialStatements() {
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("2025-01");
  const [statementType, setStatementType] = useState<string>("income");
  const { toast } = useToast();

  const handleExportPdf = () => {
    try {
      // Get the selected store name
      const storeName = stores.find(s => s.value === selectedStore)?.label || "All Stores";
      
      // Get the selected period label
      const periodLabel = periods.find(p => p.value === selectedPeriod)?.label || selectedPeriod;
      
      // Generate the PDF
      const pdfDataUri = generateFinancialStatementPdf(
        statementType as 'income' | 'balance' | 'cashflow',
        storeName,
        periodLabel
      );
      
      // Create download link
      const link = document.createElement('a');
      link.href = pdfDataUri;
      
      // Generate filename
      const statementName = statementTypes.find(s => s.value === statementType)?.label || 'Financial Statement';
      const filename = `${statementName}_${periodLabel}_${storeName.replace(/\s+/g, '_')}.pdf`;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "PDF Exported Successfully",
        description: `${statementName} has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const stores = [
    { value: "all", label: "All Stores (Consolidated)" },
    { value: "store-1", label: "Robinsons Galleria" },
    { value: "store-2", label: "SM North EDSA" },
    { value: "store-3", label: "Ayala Malls" },
  ];

  const periods = [
    { value: "2025-01", label: "January 2025" },
    { value: "2024-12", label: "December 2024" },
    { value: "2024-Q4", label: "Q4 2024" },
    { value: "2024-11", label: "November 2024" },
  ];

  const statementTypes = [
    { 
      value: "income", 
      label: "Income Statement", 
      icon: TrendingUp, 
      description: "Profit & Loss Statement" 
    },
    { 
      value: "balance", 
      label: "Balance Sheet", 
      icon: BarChart3, 
      description: "Assets, Liabilities & Equity" 
    },
    { 
      value: "cashflow", 
      label: "Cash Flow Statement", 
      icon: FileText, 
      description: "Operating, Investing & Financing Activities" 
    },
  ];

  const renderIncomeStatement = () => (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h2 className="text-2xl font-bold text-croffle-text">Income Statement</h2>
        <p className="text-croffle-text/70">For the Period Ended January 31, 2025</p>
        {selectedStore !== "all" && (
          <Badge className="mt-2">{stores.find(s => s.value === selectedStore)?.label}</Badge>
        )}
      </div>

      <div className="space-y-4">
        {/* Revenue Section */}
        <div>
          <h3 className="text-lg font-semibold text-croffle-text mb-3 border-b">REVENUE</h3>
          <div className="space-y-2 ml-4">
            <div className="flex justify-between">
              <span>Sales Revenue</span>
              <span className="font-medium">₱185,000.00</span>
            </div>
            <div className="flex justify-between">
              <span>Other Revenue</span>
              <span className="font-medium">₱5,200.00</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total Revenue</span>
              <span>₱190,200.00</span>
            </div>
          </div>
        </div>

        {/* Cost of Goods Sold */}
        <div>
          <h3 className="text-lg font-semibold text-croffle-text mb-3 border-b">COST OF GOODS SOLD</h3>
          <div className="space-y-2 ml-4">
            <div className="flex justify-between">
              <span>Raw Materials</span>
              <span className="font-medium">₱65,400.00</span>
            </div>
            <div className="flex justify-between">
              <span>Direct Labor</span>
              <span className="font-medium">₱28,500.00</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total COGS</span>
              <span>₱93,900.00</span>
            </div>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex justify-between font-bold text-green-800">
            <span>GROSS PROFIT</span>
            <span>₱96,300.00</span>
          </div>
          <div className="text-sm text-green-600">Margin: 50.6%</div>
        </div>

        {/* Operating Expenses */}
        <div>
          <h3 className="text-lg font-semibold text-croffle-text mb-3 border-b">OPERATING EXPENSES</h3>
          <div className="space-y-2 ml-4">
            <div className="flex justify-between">
              <span>Rent Expense</span>
              <span className="font-medium">₱25,000.00</span>
            </div>
            <div className="flex justify-between">
              <span>Utilities Expense</span>
              <span className="font-medium">₱8,500.00</span>
            </div>
            <div className="flex justify-between">
              <span>Wages and Salaries</span>
              <span className="font-medium">₱15,200.00</span>
            </div>
            <div className="flex justify-between">
              <span>Marketing Expense</span>
              <span className="font-medium">₱2,400.00</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total Operating Expenses</span>
              <span>₱51,100.00</span>
            </div>
          </div>
        </div>

        {/* Net Income */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex justify-between font-bold text-blue-800 text-xl">
            <span>NET INCOME</span>
            <span>₱45,200.00</span>
          </div>
          <div className="text-sm text-blue-600">Net Margin: 23.8%</div>
        </div>
      </div>
    </div>
  );

  const renderBalanceSheet = () => (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h2 className="text-2xl font-bold text-croffle-text">Balance Sheet</h2>
        <p className="text-croffle-text/70">As of January 31, 2025</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assets */}
        <div>
          <h3 className="text-xl font-bold text-croffle-text mb-4 border-b-2 border-croffle-accent">ASSETS</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-croffle-text mb-2">Current Assets</h4>
              <div className="space-y-1 ml-4 text-sm">
                <div className="flex justify-between">
                  <span>Cash and Cash Equivalents</span>
                  <span>₱125,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Accounts Receivable</span>
                  <span>₱35,500</span>
                </div>
                <div className="flex justify-between">
                  <span>Inventory</span>
                  <span>₱68,200</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total Current Assets</span>
                  <span>₱228,700</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-croffle-text mb-2">Fixed Assets</h4>
              <div className="space-y-1 ml-4 text-sm">
                <div className="flex justify-between">
                  <span>Equipment</span>
                  <span>₱180,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Less: Accumulated Depreciation</span>
                  <span>(₱25,000)</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Net Fixed Assets</span>
                  <span>₱155,000</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded">
              <div className="flex justify-between font-bold text-blue-800">
                <span>TOTAL ASSETS</span>
                <span>₱383,700</span>
              </div>
            </div>
          </div>
        </div>

        {/* Liabilities & Equity */}
        <div>
          <h3 className="text-xl font-bold text-croffle-text mb-4 border-b-2 border-croffle-accent">LIABILITIES & EQUITY</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-croffle-text mb-2">Current Liabilities</h4>
              <div className="space-y-1 ml-4 text-sm">
                <div className="flex justify-between">
                  <span>Accounts Payable</span>
                  <span>₱45,500</span>
                </div>
                <div className="flex justify-between">
                  <span>Accrued Expenses</span>
                  <span>₱12,200</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total Current Liabilities</span>
                  <span>₱57,700</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-croffle-text mb-2">Equity</h4>
              <div className="space-y-1 ml-4 text-sm">
                <div className="flex justify-between">
                  <span>Owners Equity</span>
                  <span>₱280,800</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Year Earnings</span>
                  <span>₱45,200</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total Equity</span>
                  <span>₱326,000</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded">
              <div className="flex justify-between font-bold text-blue-800">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span>₱383,700</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCashFlowStatement = () => (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h2 className="text-2xl font-bold text-croffle-text">Cash Flow Statement</h2>
        <p className="text-croffle-text/70">For the Period Ended January 31, 2025</p>
      </div>

      <div className="space-y-6">
        {/* Operating Activities */}
        <div>
          <h3 className="text-lg font-semibold text-croffle-text mb-3 border-b">CASH FLOWS FROM OPERATING ACTIVITIES</h3>
          <div className="space-y-2 ml-4">
            <div className="flex justify-between">
              <span>Net Income</span>
              <span>₱45,200</span>
            </div>
            <div className="flex justify-between">
              <span>Depreciation Expense</span>
              <span>₱5,000</span>
            </div>
            <div className="flex justify-between">
              <span>Changes in Working Capital:</span>
              <span></span>
            </div>
            <div className="flex justify-between ml-4">
              <span>Increase in Accounts Receivable</span>
              <span>(₱8,500)</span>
            </div>
            <div className="flex justify-between ml-4">
              <span>Increase in Inventory</span>
              <span>(₱12,200)</span>
            </div>
            <div className="flex justify-between ml-4">
              <span>Increase in Accounts Payable</span>
              <span>₱6,800</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2 bg-green-50 px-2 py-1 rounded">
              <span>Net Cash from Operating Activities</span>
              <span>₱36,300</span>
            </div>
          </div>
        </div>

        {/* Investing Activities */}
        <div>
          <h3 className="text-lg font-semibold text-croffle-text mb-3 border-b">CASH FLOWS FROM INVESTING ACTIVITIES</h3>
          <div className="space-y-2 ml-4">
            <div className="flex justify-between">
              <span>Purchase of Equipment</span>
              <span>(₱15,000)</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2 bg-red-50 px-2 py-1 rounded">
              <span>Net Cash used in Investing Activities</span>
              <span>(₱15,000)</span>
            </div>
          </div>
        </div>

        {/* Financing Activities */}
        <div>
          <h3 className="text-lg font-semibold text-croffle-text mb-3 border-b">CASH FLOWS FROM FINANCING ACTIVITIES</h3>
          <div className="space-y-2 ml-4">
            <div className="flex justify-between">
              <span>Owner Withdrawals</span>
              <span>(₱10,000)</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2 bg-red-50 px-2 py-1 rounded">
              <span>Net Cash used in Financing Activities</span>
              <span>(₱10,000)</span>
            </div>
          </div>
        </div>

        {/* Net Change */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between font-bold">
              <span>Net Increase in Cash</span>
              <span>₱11,300</span>
            </div>
            <div className="flex justify-between">
              <span>Cash at Beginning of Period</span>
              <span>₱113,700</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Cash at End of Period</span>
              <span>₱125,000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStatement = () => {
    switch (statementType) {
      case "income":
        return renderIncomeStatement();
      case "balance":
        return renderBalanceSheet();
      case "cashflow":
        return renderCashFlowStatement();
      default:
        return renderIncomeStatement();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/accounting">
              <ArrowLeft className="h-4 w-4" />
              Back to Accounting
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-croffle-text">Financial Statements</h1>
            <p className="text-croffle-text/70">Generate and view financial reports</p>
          </div>
        </div>
        
        <Button onClick={handleExportPdf}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Store/Location</label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stores.map(store => (
                    <SelectItem key={store.value} value={store.value}>
                      {store.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map(period => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Statement Type</label>
              <Select value={statementType} onValueChange={setStatementType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statementTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statement Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statementTypes.map((type) => {
          const Icon = type.icon;
          return (
            <Card 
              key={type.value}
              className={`cursor-pointer transition-all ${
                statementType === type.value 
                  ? 'border-croffle-accent bg-croffle-accent/5' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => setStatementType(type.value)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-croffle-accent" />
                  {type.label}
                </CardTitle>
                <p className="text-xs text-croffle-text/70">{type.description}</p>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Financial Statement */}
      <Card>
        <CardContent className="pt-6">
          {renderStatement()}
        </CardContent>
      </Card>
    </div>
  );
}