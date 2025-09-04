import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit } from "lucide-react";

interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_subtype?: string;
  is_active: boolean;
  is_system_account: boolean;
  description?: string;
  parent_account_id?: string;
}

interface AccountDialogProps {
  account?: ChartOfAccount;
  onAccountSaved: () => void;
  trigger?: React.ReactNode;
  accounts?: ChartOfAccount[];
}

const accountTypes = [
  { value: "assets", label: "Assets" },
  { value: "liabilities", label: "Liabilities" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expenses", label: "Expenses" },
];

const accountSubtypes = {
  assets: [
    { value: "current_assets", label: "Current Assets" },
    { value: "fixed_assets", label: "Fixed Assets" },
    { value: "other_assets", label: "Other Assets" },
  ],
  liabilities: [
    { value: "current_liabilities", label: "Current Liabilities" },
    { value: "non_current_liabilities", label: "Non-Current Liabilities" },
  ],
  equity: [
    { value: "paid_in_capital", label: "Paid-in Capital" },
    { value: "retained_earnings", label: "Retained Earnings" },
    { value: "other_equity", label: "Other Equity" },
  ],
  revenue: [
    { value: "operating_revenue", label: "Operating Revenue" },
    { value: "other_revenue", label: "Other Revenue" },
  ],
  expenses: [
    { value: "cost_of_goods_sold", label: "Cost of Goods Sold" },
    { value: "operating_expenses", label: "Operating Expenses" },
    { value: "other_expenses", label: "Other Expenses" },
  ],
};

export function AccountDialog({ account, onAccountSaved, trigger, accounts = [] }: AccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    account_code: "",
    account_name: "",
    account_type: "",
    account_subtype: "",
    description: "",
    parent_account_id: "",
    is_active: true,
  });
  const { toast } = useToast();

  const isEditing = !!account;

  useEffect(() => {
    if (account) {
      setFormData({
        account_code: account.account_code,
        account_name: account.account_name,
        account_type: account.account_type,
        account_subtype: account.account_subtype || "",
        description: account.description || "",
        parent_account_id: account.parent_account_id || "",
        is_active: account.is_active,
      });
    } else {
      setFormData({
        account_code: "",
        account_name: "",
        account_type: "",
        account_subtype: "",
        description: "",
        parent_account_id: "",
        is_active: true,
      });
    }
  }, [account, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.account_code.trim() || !formData.account_name.trim() || !formData.account_type) {
      toast({
        title: "Validation Error",
        description: "Account code, name, and type are required.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        account_subtype: formData.account_subtype || null,
        description: formData.description || null,
        parent_account_id: formData.parent_account_id || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('chart_of_accounts')
          .update(payload)
          .eq('id', account.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Account updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('chart_of_accounts')
          .insert([payload]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Account created successfully.",
        });
      }

      setOpen(false);
      onAccountSaved();
    } catch (error) {
      console.error('Error saving account:', error);
      toast({
        title: "Error",
        description: "Failed to save account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const parentAccountOptions = accounts.filter(acc => 
    acc.account_type === formData.account_type && 
    (!account || acc.id !== account.id)
  );

  const availableSubtypes = accountSubtypes[formData.account_type as keyof typeof accountSubtypes] || [];

  const defaultTrigger = isEditing ? (
    <Button variant="ghost" size="sm">
      <Edit className="h-4 w-4" />
    </Button>
  ) : (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Add Account
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Account" : "Add New Account"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_code">Account Code *</Label>
              <Input
                id="account_code"
                value={formData.account_code}
                onChange={(e) => setFormData(prev => ({ ...prev, account_code: e.target.value }))}
                placeholder="e.g., 1001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name *</Label>
              <Input
                id="account_name"
                value={formData.account_name}
                onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
                placeholder="e.g., Cash in Bank"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_type">Account Type *</Label>
              <Select
                value={formData.account_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, account_type: value, account_subtype: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_subtype">Account Subtype</Label>
              <Select
                value={formData.account_subtype}
                onValueChange={(value) => setFormData(prev => ({ ...prev, account_subtype: value }))}
                disabled={!formData.account_type}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subtype (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubtypes.map((subtype) => (
                    <SelectItem key={subtype.value} value={subtype.value}>
                      {subtype.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_account_id">Parent Account</Label>
            <Select
              value={formData.parent_account_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, parent_account_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent account (optional)" />
              </SelectTrigger>
              <SelectContent>
                {parentAccountOptions.map((parentAccount) => (
                  <SelectItem key={parentAccount.id} value={parentAccount.id}>
                    {parentAccount.account_code} - {parentAccount.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description for this account"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active">Active Account</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update Account" : "Create Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}