import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Plus, Search, CalendarIcon, FileText, Download, Eye, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/contexts/StoreContext";
import { JournalEntryDialog } from "@/components/accounting/JournalEntryDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface JournalEntry {
  id: string;
  journal_number: string;
  entry_date: string;
  reference_type?: string;
  reference_id?: string;
  description: string;
  total_debit: number;
  total_credit: number;
  store_id?: string;
  status?: string;
  is_posted: boolean;
  is_adjusting_entry: boolean;
  created_at: string;
  created_by: string;
  store?: { name: string };
  journal_entry_lines?: JournalEntryLineData[];
}

interface JournalEntryLineData {
  id: string;
  line_number: number;
  account_id: string;
  description?: string;
  debit_amount: number;
  credit_amount: number;
  chart_of_accounts?: {
    account_code: string;
    account_name: string;
    account_type: string;
  };
}

interface GeneralLedgerEntry {
  id: string;
  transaction_date: string;
  description: string;
  reference_number?: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  account?: {
    account_code: string;
    account_name: string;
    account_type: string;
  };
}

interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  is_active: boolean;
}

export function GeneralLedger() {
  const [activeTab, setActiveTab] = useState("journal-entries");
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [generalLedgerEntries, setGeneralLedgerEntries] = useState<GeneralLedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const { stores } = useStore();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "journal-entries") {
      fetchJournalEntries();
    } else {
      fetchGeneralLedger();
    }
  }, [activeTab, searchQuery, selectedAccount, dateRange, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAccounts(),
        fetchJournalEntries()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchJournalEntries = async () => {
    try {
      let query = supabase
        .from('journal_entries')
        .select(`
          *,
          stores(name),
          journal_entry_lines(
            *,
            chart_of_accounts(account_code, account_name, account_type)
          )
        `)
        .gte('entry_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('entry_date', format(dateRange.to, 'yyyy-MM-dd'))
        .order('entry_date', { ascending: false })
        .order('journal_number', { ascending: false });

      if (statusFilter !== "all") {
        if (statusFilter === "posted") {
          query = query.eq('is_posted', true);
        } else if (statusFilter === "draft") {
          query = query.eq('is_posted', false);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Apply search filter
      if (searchQuery) {
        filteredData = filteredData.filter(entry =>
          entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.journal_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (entry.reference_type && entry.reference_type.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }

      setJournalEntries(filteredData);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      toast({
        title: "Error",
        description: "Failed to load journal entries",
        variant: "destructive",
      });
    }
  };

  const fetchGeneralLedger = async () => {
    try {
      let query = supabase
        .from('general_ledger')
        .select(`
          *,
          chart_of_accounts(account_code, account_name, account_type)
        `)
        .gte('transaction_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('transaction_date', format(dateRange.to, 'yyyy-MM-dd'))
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (selectedAccount !== "all") {
        query = query.eq('account_id', selectedAccount);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Apply search filter
      if (searchQuery) {
        filteredData = filteredData.filter(entry =>
          entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (entry.reference_number && entry.reference_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (entry.chart_of_accounts && 
            (entry.chart_of_accounts.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             entry.chart_of_accounts.account_code.toLowerCase().includes(searchQuery.toLowerCase())))
        );
      }

      setGeneralLedgerEntries(filteredData);
    } catch (error) {
      console.error('Error fetching general ledger:', error);
      toast({
        title: "Error",
        description: "Failed to load general ledger",
        variant: "destructive",
      });
    }
  };

  const handlePostEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({ 
          is_posted: true,
          posted_at: new Date().toISOString(),
          posted_by: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('id', entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Journal entry posted successfully.",
      });

      fetchJournalEntries();
    } catch (error) {
      console.error('Error posting entry:', error);
      toast({
        title: "Error",
        description: "Failed to post journal entry.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEntry = async (entryId: string, journalNumber: string) => {
    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Journal entry ${journalNumber} deleted successfully.`,
      });

      fetchJournalEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete journal entry.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const getStatusBadge = (entry: JournalEntry) => {
    if (entry.is_posted) {
      return <Badge className="bg-green-100 text-green-800">Posted</Badge>;
    }
    return <Badge variant="outline">Draft</Badge>;
  };

  const getAccountTypeColor = (type: string) => {
    const colors = {
      'assets': 'text-blue-600',
      'liabilities': 'text-red-600',
      'equity': 'text-green-600',
      'revenue': 'text-purple-600',
      'expenses': 'text-orange-600',
    };
    return colors[type as keyof typeof colors] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-croffle-text">Loading general ledger...</div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-croffle-text">General Ledger</h1>
            <p className="text-croffle-text/70">BIR-compliant journal entries and account ledgers</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export BIR Report
          </Button>
          <JournalEntryDialog onEntrySaved={fetchJournalEntries} />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {activeTab === "general-ledger" && (
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeTab === "journal-entries" && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to
                  }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="journal-entries">Journal Entries</TabsTrigger>
          <TabsTrigger value="general-ledger">General Ledger</TabsTrigger>
        </TabsList>

        {/* Journal Entries Tab */}
        <TabsContent value="journal-entries">
          <Card>
            <CardHeader>
              <CardTitle>Journal Entries ({journalEntries.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {journalEntries.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                          {entry.journal_number}
                        </span>
                        {getStatusBadge(entry)}
                        {entry.is_adjusting_entry && (
                          <Badge variant="secondary">Adjusting</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {format(new Date(entry.entry_date), 'MMM dd, yyyy')}
                        </span>
                        <div className="flex gap-1">
                          {!entry.is_posted && (
                            <>
                              <JournalEntryDialog
                        entry={{
                          ...entry,
                          entry_date: new Date(entry.entry_date),
                          lines: (entry.journal_entry_lines || []).map(line => ({
                            id: line.id,
                            line_number: line.line_number,
                            account_id: line.account_id,
                            description: line.description || "",
                            debit_amount: line.debit_amount,
                            credit_amount: line.credit_amount,
                            account: line.chart_of_accounts ? {
                              id: line.account_id,
                              account_code: line.chart_of_accounts.account_code,
                              account_name: line.chart_of_accounts.account_name,
                              account_type: line.chart_of_accounts.account_type,
                              account_subtype: undefined,
                              is_active: true
                            } : undefined
                          }))
                        }}
                                onEntrySaved={fetchJournalEntries}
                                trigger={
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                }
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePostEntry(entry.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Journal Entry</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete journal entry "{entry.journal_number}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteEntry(entry.id, entry.journal_number)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete Entry
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                          {entry.is_posted && (
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="font-medium text-croffle-text">{entry.description}</p>
                      {entry.reference_type && (
                        <p className="text-sm text-gray-600">Ref: {entry.reference_type}</p>
                      )}
                      
                      <div className="flex justify-between items-center pt-2 border-t">
                        <div className="text-sm text-gray-600">
                          {entry.journal_entry_lines?.length || 0} line(s)
                        </div>
                        <div className="flex gap-4">
                          <span className="text-sm">
                            <strong>Debit:</strong> {formatCurrency(entry.total_debit)}
                          </span>
                          <span className="text-sm">
                            <strong>Credit:</strong> {formatCurrency(entry.total_credit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {journalEntries.length === 0 && (
                  <div className="text-center py-8 text-croffle-text/70">
                    No journal entries found for the selected criteria.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Ledger Tab */}
        <TabsContent value="general-ledger">
          <Card>
            <CardHeader>
              <CardTitle>
                General Ledger Entries ({generalLedgerEntries.length})
                {selectedAccount !== "all" && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    - {accounts.find(a => a.id === selectedAccount)?.account_name}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Date</th>
                      <th className="text-left py-3 px-2">Account</th>
                      <th className="text-left py-3 px-2">Description</th>
                      <th className="text-left py-3 px-2">Reference</th>
                      <th className="text-right py-3 px-2">Debit</th>
                      <th className="text-right py-3 px-2">Credit</th>
                      <th className="text-right py-3 px-2">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generalLedgerEntries.map((entry) => (
                      <tr key={entry.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">
                          {format(new Date(entry.transaction_date), 'MMM dd, yyyy')}
                        </td>
                        <td className="py-3 px-2">
                          {entry.account && (
                            <div>
                              <div className="font-medium">{entry.account.account_code}</div>
                              <div className={cn("text-xs", getAccountTypeColor(entry.account.account_type))}>
                                {entry.account.account_name}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2">{entry.description}</td>
                        <td className="py-3 px-2 text-gray-600">{entry.reference_number || '-'}</td>
                        <td className="py-3 px-2 text-right">
                          {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '-'}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '-'}
                        </td>
                        <td className="py-3 px-2 text-right font-medium">
                          {formatCurrency(entry.running_balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {generalLedgerEntries.length === 0 && (
                  <div className="text-center py-8 text-croffle-text/70">
                    No general ledger entries found for the selected criteria.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}