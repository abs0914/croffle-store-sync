import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";
import { Plus, Minus, AlertCircle, RefreshCw, ArrowLeft, Grid3x3, List } from "lucide-react";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { fetchOrderableItems } from "@/services/inventoryManagement/commissaryInventoryService";
import { createPurchaseOrder } from "@/services/orderManagement/purchaseOrderService";
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";

interface OrderItem {
  commissary_item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  specifications?: string;
}

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [loading, setLoading] = useState(false);
  const [orderableItems, setOrderableItems] = useState<CommissaryInventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const categories = [
    'Croffle Items',
    'SAUCES',
    'TOPPINGS',
    'BOXES',
    'MISCELLANEOUS',
    'EQUIPMENT and SUPPLIES',
    'Coffee Items',
    'Others'
  ];

  const loadOrderableItems = async () => {
    console.log('Loading orderable items for store:', currentStore?.name, 
      'location:', currentStore?.location_type, 
      'ownership:', currentStore?.ownership_type);
    setLoadingItems(true);
    try {
      const items = await fetchOrderableItems(
        currentStore?.location_type, 
        currentStore?.ownership_type
      );
      console.log('Loaded orderable items for store type:', {
        location: currentStore?.location_type,
        ownership: currentStore?.ownership_type,
        count: items.length
      });
      setOrderableItems(items);
    } catch (error) {
      console.error('Error loading orderable items:', error);
      toast.error('Failed to load available products');
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    loadOrderableItems();
  }, []);

  const addOrderItem = (item: CommissaryInventoryItem) => {
    const existingIndex = orderItems.findIndex(oi => oi.commissary_item_id === item.id);
    
    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += 1;
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, {
        commissary_item_id: item.id,
        item_name: item.name,
        quantity: 1,
        unit_price: item.unit_cost || 0,
        specifications: ''
      }]);
    }
  };

  const updateOrderItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    } else {
      const updated = [...orderItems];
      updated[index].quantity = quantity;
      setOrderItems(updated);
    }
  };

  const updateOrderItemPrice = (index: number, price: number) => {
    const updated = [...orderItems];
    updated[index].unit_price = price;
    setOrderItems(updated);
  };

  const updateOrderItemSpecs = (index: number, specs: string) => {
    const updated = [...orderItems];
    updated[index].specifications = specs;
    setOrderItems(updated);
  };

  const totalAmount = orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const filteredItems = selectedCategory === 'all' 
    ? orderableItems 
    : orderableItems.filter(item => item.business_category === selectedCategory);

  // Reset to page 1 when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  const handleSubmit = async () => {
    const storeId = currentStore?.id || user?.storeIds?.[0];
    
    if (!storeId) {
      toast.error('No store selected');
      return;
    }

    if (orderItems.length === 0) {
      toast.error('Please add at least one item to the order');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        store_id: storeId,
        created_by: user.id,
        status: 'pending' as const,
        total_amount: totalAmount,
        requested_delivery_date: requestedDeliveryDate || undefined,
        notes: notes || undefined,
        items: orderItems.map(item => ({
          inventory_stock_id: item.commissary_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          specifications: item.specifications
        }))
      };

      console.log('Creating purchase order with data:', orderData);
      const result = await createPurchaseOrder(orderData);
      if (result) {
        toast.success('Purchase order created successfully');
        navigate('/order-management');
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
      toast.error('Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      {/* Header with breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button 
              onClick={() => navigate('/order-management')}
              className="hover:text-foreground transition-colors"
            >
              Order Management
            </button>
            <span>/</span>
            <span className="text-foreground">Create Purchase Order</span>
          </div>
          <h1 className="text-3xl font-bold">Create Purchase Order</h1>
        </div>
        <Button variant="outline" onClick={() => navigate('/order-management')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Order Details Section */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="delivery-date">Requested Delivery Date</Label>
                  <Input
                    id="delivery-date"
                    type="date"
                    value={requestedDeliveryDate}
                    onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Order notes or special instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Products Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Available Products</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadOrderableItems}
                    disabled={loadingItems}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingItems ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <div className="flex border rounded-md">
                    <Button
                      variant={viewMode === 'card' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('card')}
                      className="rounded-r-none"
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-l-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingItems ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading available products...</p>
                </div>
              ) : orderableItems.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No finished products available for ordering</h3>
                  <p className="text-muted-foreground mb-4">
                    {currentStore?.ownership_type === 'company_owned' 
                      ? 'No products available for company branches.'
                      : currentStore?.location_type 
                        ? `No products available for ${currentStore.location_type === 'inside_cebu' ? 'Franchisee Cebu' : 'Franchisee Outside Cebu'} stores.`
                        : 'There are no products currently marked as orderable in the commissary inventory.'}
                  </p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Store: {currentStore?.name}</p>
                    <p>Type: {currentStore?.ownership_type === 'company_owned' ? 'Branch' : 'Franchisee'}</p>
                    <p>Location: {currentStore?.location_type ? (currentStore.location_type === 'inside_cebu' ? 'Cebu' : 'Outside Cebu') : 'Not set'}</p>
                  </div>
                </div>
              ) : (
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
                  <TabsList className="w-full grid grid-cols-3 h-auto gap-1 bg-muted/50 p-2">
                    <TabsTrigger value="all" className="text-xs whitespace-nowrap">All</TabsTrigger>
                    {categories.map((category) => (
                      <TabsTrigger key={category} value={category} className="text-xs whitespace-normal h-auto py-2 px-1">
                        {category}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  <TabsContent value={selectedCategory} className="mt-4">
                    {filteredItems.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No products found in this category</p>
                      </div>
                    ) : (
                      <>
                        {viewMode === 'card' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                            {paginatedItems.map((item) => (
                              <div key={item.id} className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                  <h4 className="font-medium text-sm flex-1">{item.name}</h4>
                                  <Badge variant="secondary" className="text-xs ml-2">
                                    {item.current_stock} {item.uom}
                                  </Badge>
                                </div>
                                {item.business_category && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.business_category}
                                  </Badge>
                                )}
                                <div className="text-sm text-muted-foreground">
                                  ₱{item.unit_cost?.toFixed(2) || '0.00'} per {item.uom}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addOrderItem(item)}
                                  className="w-full"
                                  disabled={item.current_stock <= 0}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add to Order
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <table className="w-full">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-left p-3 text-sm font-medium">Product Name</th>
                                  <th className="text-left p-3 text-sm font-medium">Category</th>
                                  <th className="text-right p-3 text-sm font-medium">Stock</th>
                                  <th className="text-right p-3 text-sm font-medium">Unit Cost</th>
                                  <th className="text-center p-3 text-sm font-medium">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedItems.map((item) => (
                                  <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                                    <td className="p-3 text-sm font-medium">{item.name}</td>
                                    <td className="p-3">
                                      <Badge variant="outline" className="text-xs">
                                        {item.business_category || 'N/A'}
                                      </Badge>
                                    </td>
                                    <td className="p-3 text-right text-sm">
                                      <Badge variant="secondary" className="text-xs">
                                        {item.current_stock} {item.uom}
                                      </Badge>
                                    </td>
                                    <td className="p-3 text-right text-sm">
                                      ₱{item.unit_cost?.toFixed(2) || '0.00'}
                                    </td>
                                    <td className="p-3 text-center">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addOrderItem(item)}
                                        disabled={item.current_stock <= 0}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="mt-6">
                            <Pagination>
                              <PaginationContent>
                                <PaginationItem>
                                  <PaginationPrevious 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                  />
                                </PaginationItem>
                                
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                  if (
                                    page === 1 ||
                                    page === totalPages ||
                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                  ) {
                                    return (
                                      <PaginationItem key={page}>
                                        <PaginationLink
                                          onClick={() => setCurrentPage(page)}
                                          isActive={currentPage === page}
                                          className="cursor-pointer"
                                        >
                                          {page}
                                        </PaginationLink>
                                      </PaginationItem>
                                    );
                                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                                    return (
                                      <PaginationItem key={page}>
                                        <PaginationEllipsis />
                                      </PaginationItem>
                                    );
                                  }
                                  return null;
                                })}
                                
                                <PaginationItem>
                                  <PaginationNext 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                  />
                                </PaginationItem>
                              </PaginationContent>
                            </Pagination>
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Shopping Cart */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order Items</span>
                  {orderItems.length > 0 && (
                    <Badge variant="secondary" className="text-sm">
                      {orderItems.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orderItems.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No items added yet. Add products from the left to start building your order.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-[calc(100vh-400px)] overflow-y-auto space-y-3 pr-2">
                      {orderItems.map((item, index) => (
                        <div key={index} className="border rounded-lg p-3 space-y-3 bg-muted/30">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm flex-1">{item.item_name}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateOrderItemQuantity(index, 0)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            >
                              ×
                            </Button>
                          </div>
                          
                          <Input
                            placeholder="Specifications (optional)"
                            value={item.specifications || ''}
                            onChange={(e) => updateOrderItemSpecs(index, e.target.value)}
                            className="text-xs"
                          />
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateOrderItemQuantity(index, item.quantity - 1)}
                                className="h-7 w-7 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateOrderItemQuantity(index, item.quantity + 1)}
                                className="h-7 w-7 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">
                                ₱{item.unit_price.toFixed(2)} each
                              </div>
                              <div className="text-sm font-semibold">
                                ₱{(item.quantity * item.unit_price).toFixed(2)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="pt-2 border-t">
                            <Label className="text-xs">Unit Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateOrderItemPrice(index, parseFloat(e.target.value) || 0)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-4 border-t space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Amount:</span>
                        <span className="text-2xl font-bold">₱{totalAmount.toFixed(2)}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <Button
                          onClick={handleSubmit}
                          disabled={loading || orderItems.length === 0}
                          className="w-full"
                          size="lg"
                        >
                          {loading ? 'Creating...' : 'Create Purchase Order'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => navigate('/order-management')}
                          disabled={loading}
                          className="w-full"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
