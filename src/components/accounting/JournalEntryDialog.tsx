import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/contexts/StoreContext";
import { Plus, CalendarIcon, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_subtype?: string;
  is_active: boolean;
}

interface JournalEntryLine {
  id?: string;
  line_number: number;
  account_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  account?: ChartOfAccount;
}

interface JournalEntry {
  id?: string;
  journal_number?: string;
  entry_date: Date;
  reference_number?: string;
  description: string;
  total_debit: number;
  total_credit: number;
  store_id?: string;
  status?: string;
  notes?: string;
  is_adjusting_entry?: boolean;
  lines: JournalEntryLine[];
}

interface JournalEntryDialogProps {
  entry?: JournalEntry;
  onEntrySaved: () => void;
  trigger?: React.ReactNode;
}

export function JournalEntryDialog({ entry, onEntrySaved, trigger }: JournalEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [formData, setFormData] = useState<JournalEntry>({
    entry_date: new Date(),
    description: "",
    reference_number: "",
    total_debit: 0,
    total_credit: 0,
    notes: "",
    is_adjusting_entry: false,
    lines: [
      { line_number: 1, account_id: "", description: "", debit_amount: 0, credit_amount: 0 },
      { line_number: 2, account_id: "", description: "", debit_amount: 0, credit_amount: 0 }
    ]
  });
  const { toast } = useToast();
  const { stores } = useStore();

  const isEditing = !!entry;

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (entry) {
      setFormData({
        ...entry,
        entry_date: new Date(entry.entry_date),
        lines: entry.lines.length > 0 ? entry.lines : [
          { line_number: 1, account_id: "", description: "", debit_amount: 0, credit_amount: 0 },
          { line_number: 2, account_id: "", description: "", debit_amount: 0, credit_amount: 0 }
        ]
      });
    } else {
      setFormData({
        entry_date: new Date(),
        description: "",
        reference_number: "",  
        total_debit: 0,
        total_credit: 0,
        notes: "",
        is_adjusting_entry: false,
        lines: [
          { line_number: 1, account_id: "", description: "", debit_amount: 0, credit_amount: 0 },
          { line_number: 2, account_id: "", description: "", debit_amount: 0, credit_amount: 0 }
        ]
      });
    }
  }, [entry, open]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_code');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const calculateTotals = (lines: JournalEntryLine[]) => {
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
    return { totalDebit, totalCredit };
  };

  const handleLineChange = (index: number, field: keyof JournalEntryLine, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Clear opposite amount when entering debit or credit
    if (field === 'debit_amount' && value > 0) {
      newLines[index].credit_amount = 0;
    } else if (field === 'credit_amount' && value > 0) {
      newLines[index].debit_amount = 0;
    }

    const { totalDebit, totalCredit } = calculateTotals(newLines);
    setFormData(prev => ({
      ...prev,
      lines: newLines,
      total_debit: totalDebit,
      total_credit: totalCredit
    }));
  };

  const addLine = () => {
    const newLine: JournalEntryLine = {
      line_number: formData.lines.length + 1,
      account_id: "",
      description: "",
      debit_amount: 0,
      credit_amount: 0
    };
    
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, newLine]
    }));
  };

  const removeLine = (index: number) => {
    if (formData.lines.length <= 2) {
      toast({
        title: "Cannot Remove Line",
        description: "Journal entries must have at least 2 lines.",
        variant: "destructive",
      });
      return;
    }

    const newLines = formData.lines.filter((_, i) => i !== index);
    // Renumber lines
    newLines.forEach((line, i) => {
      line.line_number = i + 1;
    });

    const { totalDebit, totalCredit } = calculateTotals(newLines);
    setFormData(prev => ({
      ...prev,
      lines: newLines,
      total_debit: totalDebit,
      total_credit: totalCredit
    }));
  };

  const validateEntry = () => {
    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Entry description is required.",
        variant: "destructive",
      });
      return false;
    }

    if (formData.total_debit !== formData.total_credit) {
      toast({
        title: "Validation Error",
        description: "Total debits must equal total credits.",
        variant: "destructive",
      });
      return false;
    }

    if (formData.total_debit === 0) {
      toast({
        title: "Validation Error",
        description: "Journal entry must have non-zero amounts.",
        variant: "destructive",
      });
      return false;
    }

    for (const line of formData.lines) {
      if (!line.account_id) {
        toast({
          title: "Validation Error",
          description: "All lines must have an account selected.",
          variant: "destructive",
        });
        return false;
      }

      if (line.debit_amount === 0 && line.credit_amount === 0) {
        toast({
          title: "Validation Error",
          description: "All lines must have either a debit or credit amount.",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEntry()) return;

    setLoading(true);

    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user?.id) {
        throw new Error('User not authenticated');
      }

      const entryData = {
        entry_date: formData.entry_date.toISOString().split('T')[0],
        description: formData.description,
        reference_number: formData.reference_number || null,
        total_debit: formData.total_debit,
        total_credit: formData.total_credit,
        store_id: stores[0]?.id || null,
        notes: formData.notes || null,
        is_adjusting_entry: formData.is_adjusting_entry,
        fiscal_period: format(formData.entry_date, 'yyyy-MM'),
        created_by: currentUser.data.user.id,
        journal_number: `JE-${format(formData.entry_date, 'yyyy')}-${Date.now()}`, // Temporary number, will be overridden by trigger
      };

      let journalEntryId: string;

      if (isEditing && entry?.id) {
        const { error: updateError } = await supabase
          .from('journal_entries')
          .update(entryData)
          .eq('id', entry.id);

        if (updateError) throw updateError;
        journalEntryId = entry.id;

        // Delete existing lines
        await supabase
          .from('journal_entry_lines')
          .delete()
          .eq('journal_entry_id', entry.id);
      } else {
        const { data: journalData, error: journalError } = await supabase
          .from('journal_entries')
          .insert(entryData)
          .select()
          .single();

        if (journalError) throw journalError;
        journalEntryId = journalData.id;
      }

      // Insert journal entry lines
      const linesData = formData.lines.map(line => ({
        journal_entry_id: journalEntryId,
        line_number: line.line_number,
        account_id: line.account_id,
        description: line.description || null,
        debit_amount: line.debit_amount,
        credit_amount: line.credit_amount,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesData);

      if (linesError) throw linesError;

      toast({
        title: "Success",
        description: `Journal entry ${isEditing ? 'updated' : 'created'} successfully.`,
      });

      setOpen(false);
      onEntrySaved();
    } catch (error) {
      console.error('Error saving journal entry:', error);
      toast({
        title: "Error",
        description: "Failed to save journal entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isBalanced = formData.total_debit === formData.total_credit;
  
  const defaultTrigger = (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      {isEditing ? "Edit Entry" : "New Journal Entry"}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Journal Entry" : "New Journal Entry"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_date">Entry Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.entry_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.entry_date ? format(formData.entry_date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.entry_date}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, entry_date: date }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                placeholder="e.g., INV-2025-001"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_adjusting_entry}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_adjusting_entry: e.target.checked }))}
                />
                Adjusting Entry
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the transaction"
              required
            />
          </div>

          {/* Journal Entry Lines */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Journal Entry Lines</CardTitle>
              <div className="flex items-center gap-4">
                <Badge variant={isBalanced ? "default" : "destructive"}>
                  Balance: ₱{Math.abs(formData.total_debit - formData.total_credit).toFixed(2)}
                </Badge>
                <Button type="button" onClick={addLine} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.lines.map((line, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-4 border rounded-lg">
                    <div className="col-span-1">
                      <Label className="text-xs">Line</Label>
                      <div className="text-sm font-medium">{line.line_number}</div>
                    </div>

                    <div className="col-span-3">
                      <Label className="text-xs">Account</Label>
                      <Select
                        value={line.account_id}
                        onValueChange={(value) => handleLineChange(index, 'account_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.account_code} - {account.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-3">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={line.description}
                        onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                        placeholder="Line description"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Debit Amount</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit_amount}
                        onChange={(e) => handleLineChange(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Credit Amount</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit_amount}
                        onChange={(e) => handleLineChange(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(index)}
                        disabled={formData.lines.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Total Debits</Label>
                  <div className="text-lg font-bold">₱{formData.total_debit.toFixed(2)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Credits</Label>
                  <div className="text-lg font-bold">₱{formData.total_credit.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes or explanations"
              rows={3}
            />
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
            <Button 
              type="submit" 
              disabled={loading || !isBalanced}
            >
              {loading ? "Saving..." : isEditing ? "Update Entry" : "Create Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}