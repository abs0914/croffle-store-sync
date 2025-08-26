
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Check, X, Eye } from 'lucide-react';
import { expenseService } from '@/services/expense/expenseService';
import { toast } from 'sonner';

export default function AdminExpenseApprovals() {
  const queryClient = useQueryClient();
  const [selectedExpense, setSelectedExpense] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState('');

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['pending-expenses'],
    queryFn: () => expenseService.getExpenses()
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => expenseService.updateExpense(id, { status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-expenses'] });
      toast.success('Expense approved successfully');
    },
    onError: () => {
      toast.error('Failed to approve expense');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      expenseService.updateExpense(id, { status: 'rejected', rejection_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-expenses'] });
      toast.success('Expense rejected');
      setSelectedExpense(null);
      setRejectionReason('');
    },
    onError: () => {
      toast.error('Failed to reject expense');
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const pendingExpenses = expenses?.filter(exp => exp.status === 'pending') || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Expenses waiting for approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals ({pendingExpenses.length})</CardTitle>
        <CardDescription>Review and approve or reject expense requests</CardDescription>
      </CardHeader>
      <CardContent>
        {pendingExpenses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending approvals
          </div>
        ) : (
          <div className="space-y-4">
            {pendingExpenses.map((expense) => (
              <div key={expense.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{expense.description}</h3>
                      <Badge variant="outline">{expense.category?.name}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Store: {expense.store_name}</p>
                      <p>Requested by: {expense.created_by_name}</p>
                      <p>Date: {new Date(expense.expense_date).toLocaleDateString()}</p>
                      <p>Amount: <span className="font-medium text-foreground">{formatCurrency(expense.amount)}</span></p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {expense.receipt_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4 mr-1" />
                          Receipt
                        </a>
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => approveMutation.mutate(expense.id)}
                      disabled={approveMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedExpense(expense.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject Expense</DialogTitle>
                          <DialogDescription>
                            Please provide a reason for rejecting this expense request.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-sm text-muted-foreground">{formatCurrency(expense.amount)}</p>
                          </div>
                          <Textarea
                            placeholder="Reason for rejection..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                          />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setSelectedExpense(null)}>
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              if (selectedExpense) {
                                rejectMutation.mutate({ 
                                  id: selectedExpense, 
                                  reason: rejectionReason 
                                });
                              }
                            }}
                            disabled={!rejectionReason.trim() || rejectMutation.isPending}
                          >
                            Reject Expense
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
