import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Edit, Trash2, FileText, Calendar, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency, formatDate } from "@/utils/format";
import { toast } from "sonner";

interface Adjustment {
  id: string;
  adjustment_type: "accrual" | "prepayment" | "depreciation" | "correction";
  adjustment_date: string;
  description: string;
  amount: number;
  debit_account: string;
  credit_account: string;
  approved_by?: string;
  approved_at?: string;
  status: "pending" | "approved" | "rejected";
  created_by: string;
  created_at: string;
}

export function ManualAdjustments() {
  const [adjustments] = useState<Adjustment[]>([
    {
      id: "1",
      adjustment_type: "accrual",
      adjustment_date: "2025-01-31",
      description: "Accrue monthly rent expense",
      amount: 25000,
      debit_account: "Rent Expense",
      credit_account: "Accrued Expenses",
      approved_by: "John Doe",
      approved_at: "2025-01-31T15:30:00Z",
      status: "approved",
      created_by: "Jane Smith",
      created_at: "2025-01-31T14:00:00Z"
    },
    {
      id: "2", 
      adjustment_type: "depreciation",
      adjustment_date: "2025-01-31",
      description: "Monthly depreciation of equipment",
      amount: 8500,
      debit_account: "Depreciation Expense",
      credit_account: "Accumulated Depreciation",
      status: "pending",
      created_by: "Jane Smith", 
      created_at: "2025-01-31T16:00:00Z"
    }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    adjustment_type: "",
    adjustment_date: "",
    description: "",
    amount: "",
    debit_account: "",
    credit_account: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Adjustment entry created successfully");
    setShowForm(false);
    setFormData({
      adjustment_type: "",
      adjustment_date: "",
      description: "",
      amount: "",
      debit_account: "",
      credit_account: ""
    });
  };

  const getAdjustmentTypeBadge = (type: string) => {
    const variants = {
      accrual: "bg-blue-100 text-blue-800",
      prepayment: "bg-green-100 text-green-800", 
      depreciation: "bg-orange-100 text-orange-800",
      correction: "bg-red-100 text-red-800"
    };
    return variants[type as keyof typeof variants] || "bg-gray-100 text-gray-800";
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800"
    };
    return variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800";
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
          <h1 className="text-3xl font-bold text-croffle-text">Manual Adjustments</h1>
          <p className="text-croffle-text/70">
            Create and manage manual journal adjustments for accruals, prepayments, and corrections
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Adjustment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-croffle-text">{adjustments.length}</div>
            <p className="text-xs text-croffle-text/70">This period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-croffle-text">
              {adjustments.filter(a => a.status === "pending").length}
            </div>
            <p className="text-xs text-croffle-text/70">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-croffle-text">
              {formatCurrency(adjustments.reduce((sum, adj) => sum + adj.amount, 0))}
            </div>
            <p className="text-xs text-croffle-text/70">Current period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-croffle-text">
              {adjustments.filter(a => a.status === "approved" && 
                new Date(a.approved_at || "").toDateString() === new Date().toDateString()).length}
            </div>
            <p className="text-xs text-croffle-text/70">Recent activity</p>
          </CardContent>
        </Card>
      </div>

      {/* New Adjustment Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-croffle-accent" />
              Create Manual Adjustment
            </CardTitle>
            <CardDescription>
              Enter details for the manual journal adjustment entry
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adjustment_type">Adjustment Type</Label>
                  <Select 
                    value={formData.adjustment_type} 
                    onValueChange={(value) => setFormData({...formData, adjustment_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accrual">Accrual</SelectItem>
                      <SelectItem value="prepayment">Prepayment</SelectItem>
                      <SelectItem value="depreciation">Depreciation</SelectItem>
                      <SelectItem value="correction">Correction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjustment_date">Adjustment Date</Label>
                  <Input
                    id="adjustment_date"
                    type="date"
                    value={formData.adjustment_date}
                    onChange={(e) => setFormData({...formData, adjustment_date: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="debit_account">Debit Account</Label>
                  <Select 
                    value={formData.debit_account}
                    onValueChange={(value) => setFormData({...formData, debit_account: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select debit account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent-expense">Rent Expense</SelectItem>
                      <SelectItem value="depreciation-expense">Depreciation Expense</SelectItem>
                      <SelectItem value="utilities-expense">Utilities Expense</SelectItem>
                      <SelectItem value="prepaid-expenses">Prepaid Expenses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credit_account">Credit Account</Label>
                  <Select
                    value={formData.credit_account}
                    onValueChange={(value) => setFormData({...formData, credit_account: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select credit account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accrued-expenses">Accrued Expenses</SelectItem>
                      <SelectItem value="accumulated-depreciation">Accumulated Depreciation</SelectItem>
                      <SelectItem value="accounts-payable">Accounts Payable</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter adjustment description and justification..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create Adjustment</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Adjustments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-croffle-accent" />
            Recent Adjustments
          </CardTitle>
          <CardDescription>
            View and manage manual journal adjustments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {adjustments.map((adjustment) => (
              <div key={adjustment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-croffle-text">{adjustment.description}</h3>
                      <Badge className={getAdjustmentTypeBadge(adjustment.adjustment_type)}>
                        {adjustment.adjustment_type}
                      </Badge>
                      <Badge className={getStatusBadge(adjustment.status)}>
                        {adjustment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-croffle-text/70 mb-2">
                      {formatDate(adjustment.adjustment_date)} • Amount: {formatCurrency(adjustment.amount)}
                    </p>
                    <div className="text-xs text-croffle-text/60">
                      <div>Debit: {adjustment.debit_account} | Credit: {adjustment.credit_account}</div>
                      <div>Created by {adjustment.created_by} on {formatDate(adjustment.created_at)}</div>
                      {adjustment.approved_by && (
                        <div>Approved by {adjustment.approved_by} on {formatDate(adjustment.approved_at!)}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {adjustment.status === "pending" && (
                    <>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="default" size="sm">
                        Approve
                      </Button>
                    </>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Adjustment</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this manual adjustment? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}