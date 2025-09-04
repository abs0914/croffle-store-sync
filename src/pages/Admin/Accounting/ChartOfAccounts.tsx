import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Search, Edit, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_subtype?: string;
  is_active: boolean;
  is_system_account: boolean;
  description?: string;
}

export function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .order('account_code');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load chart of accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = 
      account.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.account_code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === "all" || account.account_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const getAccountTypeColor = (type: string) => {
    const colors = {
      'assets': 'bg-blue-100 text-blue-800',
      'liabilities': 'bg-red-100 text-red-800',
      'equity': 'bg-green-100 text-green-800',
      'revenue': 'bg-purple-100 text-purple-800',
      'expenses': 'bg-orange-100 text-orange-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const accountTypes = [
    { value: "all", label: "All Types" },
    { value: "assets", label: "Assets" },
    { value: "liabilities", label: "Liabilities" },
    { value: "equity", label: "Equity" },
    { value: "revenue", label: "Revenue" },
    { value: "expenses", label: "Expenses" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-croffle-text">Loading accounts...</div>
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
            <h1 className="text-3xl font-bold text-croffle-text">Chart of Accounts</h1>
            <p className="text-croffle-text/70">Manage your account structure and classifications</p>
          </div>
        </div>
        
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search accounts by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              {accountTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>Accounts ({filteredAccounts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAccounts.map((account) => (
              <div 
                key={account.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                      {account.account_code}
                    </span>
                    <h3 className="font-medium text-croffle-text">{account.account_name}</h3>
                    <Badge className={getAccountTypeColor(account.account_type)}>
                      {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
                    </Badge>
                    {account.is_system_account && (
                      <Badge variant="outline">System</Badge>
                    )}
                    {!account.is_active && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                  
                  {account.account_subtype && (
                    <div className="text-sm text-croffle-text/70 mb-1">
                      Subtype: {account.account_subtype.replace(/_/g, ' ')}
                    </div>
                  )}
                  
                  {account.description && (
                    <p className="text-sm text-croffle-text/70">{account.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  {!account.is_system_account && (
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {filteredAccounts.length === 0 && (
              <div className="text-center py-8 text-croffle-text/70">
                No accounts found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}