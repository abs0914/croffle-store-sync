
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Search, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { 
  fetchRestockRequests,
  approveRestockRequest,
  rejectRestockRequest,
  fulfillRestockRequest
} from "@/services/commissary/restockingService";
import type { RestockRequest } from "@/services/commissary/restockingService";
import { FulfillRestockDialog } from "./FulfillRestockDialog";

export function RestockRequestsTab() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RestockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<RestockRequest | null>(null);
  const [showFulfillDialog, setShowFulfillDialog] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchRestockRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error loading restock requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, approvedQuantity: number) => {
    if (!user?.id) return;
    
    const success = await approveRestockRequest(requestId, approvedQuantity, user.id);
    if (success) {
      await loadRequests();
    }
  };

  const handleReject = async (requestId: string, reason?: string) => {
    if (!user?.id) return;
    
    const success = await rejectRestockRequest(requestId, user.id, reason);
    if (success) {
      await loadRequests();
    }
  };

  const handleFulfill = (request: RestockRequest) => {
    setSelectedRequest(request);
    setShowFulfillDialog(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'fulfilled': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'fulfilled': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'low': return <AlertTriangle className="h-4 w-4 text-gray-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.commissary_item?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.store?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Summary stats
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const approvedRequests = requests.filter(r => r.status === 'approved').length;
  const urgentRequests = requests.filter(r => r.priority === 'urgent' && r.status !== 'fulfilled').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div className="text-sm text-muted-foreground">Pending Requests</div>
            </div>
            <div className="text-2xl font-bold">{pendingRequests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-muted-foreground">Approved Requests</div>
            </div>
            <div className="text-2xl font-bold">{approvedRequests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="text-sm text-muted-foreground">Urgent Requests</div>
            </div>
            <div className="text-2xl font-bold">{urgentRequests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-green-600" />
              <div className="text-sm text-muted-foreground">Total Requests</div>
            </div>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Restock Requests</CardTitle>
          
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No restock requests found
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{request.commissary_item?.name}</h3>
                        <Badge variant={getStatusColor(request.status)} className="flex items-center gap-1">
                          {getStatusIcon(request.status)}
                          {request.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getPriorityIcon(request.priority)}
                          {request.priority.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Store:</span>
                          <span className="ml-2 font-medium">{request.store?.name}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Requested:</span>
                          <span className="ml-2 font-medium">
                            {request.requested_quantity} {request.commissary_item?.unit}
                          </span>
                        </div>
                        {request.approved_quantity && (
                          <div>
                            <span className="text-muted-foreground">Approved:</span>
                            <span className="ml-2 font-medium">
                              {request.approved_quantity} {request.commissary_item?.unit}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Requested by:</span>
                          <span className="ml-2">
                            {request.requested_by_user?.first_name} {request.requested_by_user?.last_name}
                          </span>
                        </div>
                      </div>
                      
                      {request.justification && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Justification:</span>
                          <p className="mt-1 text-gray-700">{request.justification}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(request.id!, request.requested_quantity)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(request.id!, 'Request denied')}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      {request.status === 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFulfill(request)}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Fulfill
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Requested: {new Date(request.created_at!).toLocaleDateString()}
                    {request.fulfilled_at && (
                      <span className="ml-4">
                        Fulfilled: {new Date(request.fulfilled_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FulfillRestockDialog
        open={showFulfillDialog}
        onOpenChange={setShowFulfillDialog}
        request={selectedRequest}
        onSuccess={loadRequests}
      />
    </div>
  );
}
