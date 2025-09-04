import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp, DollarSign, FileText, Calendar, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

export function AdminAccounting() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-croffle-text">Accounting Dashboard</h1>
        <p className="text-croffle-text/70 mt-2">
          Manage financial statements, chart of accounts, and general ledger
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-croffle-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-croffle-text">₱2,450,000</div>
            <p className="text-xs text-croffle-text/70">+12% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-croffle-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-croffle-text">₱185,000</div>
            <p className="text-xs text-croffle-text/70">+8% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <BarChart3 className="h-4 w-4 text-croffle-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-croffle-text">₱45,200</div>
            <p className="text-xs text-croffle-text/70">+15% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Periods</CardTitle>
            <Calendar className="h-4 w-4 text-croffle-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-croffle-text">2</div>
            <p className="text-xs text-croffle-text/70">Need period closing</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Accounting Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Chart of Accounts */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-croffle-accent" />
              Chart of Accounts
            </CardTitle>
            <CardDescription>
              Manage your company's account structure and classifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-croffle-text/70">
                <div className="flex justify-between">
                  <span>Total Accounts:</span>
                  <span className="font-medium">24</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Accounts:</span>
                  <span className="font-medium">22</span>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link to="/admin/accounting/chart-of-accounts">
                  Manage Accounts
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Financial Statements */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-croffle-accent" />
              Financial Statements
            </CardTitle>
            <CardDescription>
              Generate Income Statement, Balance Sheet, and Cash Flow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-croffle-text/70">
                <div className="flex justify-between">
                  <span>Last Generated:</span>
                  <span className="font-medium">Dec 2024</span>
                </div>
                <div className="flex justify-between">
                  <span>Period Status:</span>
                  <span className="font-medium text-green-600">Open</span>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link to="/admin/accounting/financial-statements">
                  Generate Reports
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* General Ledger */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-croffle-accent" />
              General Ledger
            </CardTitle>
            <CardDescription>
              View detailed transaction history and journal entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-croffle-text/70">
                <div className="flex justify-between">
                  <span>Journal Entries:</span>
                  <span className="font-medium">156</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Entry:</span>
                  <span className="font-medium">Today</span>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/admin/accounting/general-ledger">
                  View Ledger
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Period Closing */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-croffle-accent" />
              Period Closing
            </CardTitle>
            <CardDescription>
              Close accounting periods and generate period-end reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-croffle-text/70">
                <div className="flex justify-between">
                  <span>Current Period:</span>
                  <span className="font-medium">Jan 2025</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-medium text-yellow-600">Open</span>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/admin/accounting/period-closing">
                  Manage Periods
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Financial Analytics */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-croffle-accent" />
              Financial Analytics
            </CardTitle>
            <CardDescription>
              Advanced financial analysis and KPI monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-croffle-text/70">
                <div className="flex justify-between">
                  <span>Profit Margin:</span>
                  <span className="font-medium text-green-600">24.4%</span>
                </div>
                <div className="flex justify-between">
                  <span>ROI:</span>
                  <span className="font-medium text-green-600">18.2%</span>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/admin/accounting/analytics">
                  View Analytics
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-croffle-accent" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common accounting tasks and adjustments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link to="/admin/accounting/adjustments">
                  Manual Adjustments
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link to="/admin/accounting/reconciliation">
                  Bank Reconciliation
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link to="/admin/accounting/journal-entry">
                  New Journal Entry
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}