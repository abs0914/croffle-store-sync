
import { useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/contexts/StoreContext";
import { useShift } from "@/contexts/ShiftContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Product, Category, Customer, Transaction } from "@/types";
import { createTransaction } from "@/services/transactionService";

// Import POS components
import ShiftManager from "@/components/pos/ShiftManager";
import CustomerLookup from "@/components/pos/CustomerLookup";
import DiscountSelector from "@/components/pos/DiscountSelector";
import PaymentProcessor from "@/components/pos/PaymentProcessor";
import ReceiptGenerator from "@/components/pos/ReceiptGenerator";

export default function POS() {
  const { currentStore } = useStore();
  const { currentShift } = useShift();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | undefined>(undefined);
  const [discountIdNumber, setDiscountIdNumber] = useState<string | undefined>(undefined);
  
  const { 
    items, 
    addItem, 
    removeItem, 
    updateQuantity, 
    clearCart, 
    subtotal,
    tax,
    total,
    storeId
  } = useCart();

  useEffect(() => {
    async function loadData() {
      try {
        // Use the current store ID to fetch relevant products
        const storeId = currentStore?.id;
        if (!storeId) {
          toast.error("Please select a store first");
          setIsLoading(false);
          return;
        }

        // In a real implementation, we would pass the store ID to these functions
        const productsResponse = await fetch(`/api/products?storeId=${storeId}`);
        const categoriesResponse = await fetch(`/api/categories?storeId=${storeId}`);
        
        if (!productsResponse.ok || !categoriesResponse.ok) {
          throw new Error("Failed to fetch data");
        }
        
        const productsData = await productsResponse.json();
        const categoriesData = await categoriesResponse.json();
        
        // Mock data for now
        const mockProducts: Product[] = [
          {
            id: "1",
            name: "Classic Croffle",
            description: "Original butter croffle with sugar",
            price: 129,
            category_id: "classic",
            categoryId: "classic",
            image_url: "https://images.unsplash.com/photo-1596068587619-e4b11c7a3488",
            image: "https://images.unsplash.com/photo-1596068587619-e4b11c7a3488",
            is_active: true,
            isActive: true,
            stock_quantity: 50,
            stockQuantity: 50,
            sku: "CRF-CLS-001"
          },
          {
            id: "2",
            name: "Chocolate Croffle",
            description: "Butter croffle with chocolate drizzle",
            price: 149,
            category_id: "classic",
            categoryId: "classic",
            image_url: "https://images.unsplash.com/photo-1605265036003-3f548c1d5fbe",
            image: "https://images.unsplash.com/photo-1605265036003-3f548c1d5fbe",
            is_active: true,
            isActive: true,
            stock_quantity: 45,
            stockQuantity: 45,
            sku: "CRF-CLS-002"
          },
          {
            id: "3",
            name: "Strawberry Croffle",
            description: "Butter croffle with fresh strawberries",
            price: 159,
            category_id: "fruity",
            categoryId: "fruity",
            image_url: "https://images.unsplash.com/photo-1527515848755-3cd4faffd671",
            image: "https://images.unsplash.com/photo-1527515848755-3cd4faffd671",
            is_active: true,
            isActive: true,
            stock_quantity: 35,
            stockQuantity: 35,
            sku: "CRF-FRT-001"
          },
          {
            id: "4",
            name: "Blueberry Croffle",
            description: "Butter croffle with blueberry compote",
            price: 159,
            category_id: "fruity",
            categoryId: "fruity",
            image_url: "https://images.unsplash.com/photo-1585241938243-379a196fe14e",
            image: "https://images.unsplash.com/photo-1585241938243-379a196fe14e",
            is_active: true,
            isActive: true,
            stock_quantity: 30,
            stockQuantity: 30,
            sku: "CRF-FRT-002"
          },
          {
            id: "5",
            name: "Premium Nutella Croffle",
            description: "Butter croffle with premium Nutella and nuts",
            price: 189,
            category_id: "premium",
            categoryId: "premium",
            image_url: "https://images.unsplash.com/photo-1663149287692-5cb81f1c544c",
            image: "https://images.unsplash.com/photo-1663149287692-5cb81f1c544c",
            is_active: true,
            isActive: true,
            stock_quantity: 25,
            stockQuantity: 25,
            sku: "CRF-PRM-001"
          },
          {
            id: "6",
            name: "Premium Matcha Croffle",
            description: "Butter croffle with premium matcha cream",
            price: 189,
            category_id: "premium",
            categoryId: "premium",
            image_url: "https://images.unsplash.com/photo-1638984496691-fdd2fc3c92ba",
            image: "https://images.unsplash.com/photo-1638984496691-fdd2fc3c92ba",
            is_active: true,
            isActive: true,
            stock_quantity: 20,
            stockQuantity: 20,
            sku: "CRF-PRM-002"
          }
        ];
        
        const mockCategories: Category[] = [
          {
            id: "classic",
            name: "Classic Croffle",
            is_active: true,
            isActive: true
          },
          {
            id: "fruity",
            name: "Fruity",
            is_active: true,
            isActive: true
          },
          {
            id: "premium",
            name: "Premium Croffle",
            is_active: true,
            isActive: true
          }
        ];
        
        setProducts(mockProducts);
        setCategories(mockCategories);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load products");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [currentStore]);

  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === "all" || product.categoryId === activeCategory;
    const matchesSearch = !searchTerm || 
                          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });
  
  const handleApplyDiscount = (
    discountAmount: number, 
    type: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo',
    idNumber?: string
  ) => {
    setDiscount(discountAmount);
    setDiscountType(type);
    setDiscountIdNumber(idNumber);
  };
  
  const handlePaymentComplete = async (
    paymentMethod: 'cash' | 'card' | 'e-wallet',
    amountTendered: number,
    paymentDetails?: {
      cardType?: string;
      cardNumber?: string;
      eWalletProvider?: string;
      eWalletReferenceNumber?: string;
    }
  ) => {
    if (!currentStore || !currentShift) {
      toast.error("Missing store or active shift");
      return;
    }
    
    // Create transaction objects
    const transactionItems = items.map(item => ({
      productId: item.productId,
      variationId: item.variationId,
      name: item.variation ? `${item.product.name} (${item.variation.name})` : item.product.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity
    }));
    
    const transaction: Omit<Transaction, "id" | "createdAt" | "receiptNumber"> = {
      shiftId: currentShift.id,
      storeId: currentStore.id,
      userId: currentShift.userId,
      customerId: selectedCustomer?.id,
      customer: selectedCustomer || undefined,
      items: transactionItems,
      subtotal,
      tax,
      discount,
      discountType,
      discountIdNumber,
      total: total - discount,
      amountTendered,
      change: paymentMethod === 'cash' ? amountTendered - (total - discount) : undefined,
      paymentMethod,
      paymentDetails,
      status: 'completed'
    };
    
    // Call the service to create the transaction
    const result = await createTransaction(transaction);
    
    if (result) {
      setCompletedTransaction(result);
      clearCart(); // Clear the cart after successful transaction
    }
  };
  
  const startNewSale = () => {
    setCompletedTransaction(null);
    setSelectedCustomer(null);
    setDiscount(0);
    setDiscountType(undefined);
    setDiscountIdNumber(undefined);
    clearCart();
  };

  // If we have a completed transaction, show the receipt
  if (completedTransaction) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto">
        <div className="w-full text-center mb-6">
          <h1 className="text-2xl font-bold mb-2 text-green-600">Sale Complete!</h1>
          <p className="text-gray-600 mb-4">Transaction #{completedTransaction.receiptNumber}</p>
        </div>
        
        <Card className="w-full mb-6">
          <CardContent className="p-4">
            <ReceiptGenerator 
              transaction={completedTransaction}
              customer={selectedCustomer}
            />
          </CardContent>
        </Card>
        
        <Button 
          onClick={startNewSale}
          className="w-full py-6 text-lg"
        >
          New Sale
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-croffle-primary">Point of Sale</h1>
        {currentStore && (
          <Badge variant="outline" className="text-sm">
            Store: {currentStore.name}
          </Badge>
        )}
      </div>
      
      <div className="flex flex-col lg:flex-row gap-4 h-full">
        {/* Product Selection Area */}
        <div className="flex-1">
          {/* Shift Manager */}
          <ShiftManager />
          
          <Card className="h-full border-croffle-primary/20">
            <CardContent className="p-4">
              <div className="mb-4 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search products..."
                    className="pl-8 border-croffle-primary/30 focus-visible:ring-croffle-accent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList className="mb-4 bg-croffle-background">
                  <TabsTrigger value="all" className="data-[state=active]:bg-croffle-primary data-[state=active]:text-white">
                    All
                  </TabsTrigger>
                  {categories.map(category => (
                    <TabsTrigger 
                      key={category.id} 
                      value={category.id}
                      className="data-[state=active]:bg-croffle-primary data-[state=active]:text-white"
                    >
                      {category.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                <TabsContent value={activeCategory} className="mt-0">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <p>Loading products...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredProducts.map(product => (
                        <Button
                          key={product.id}
                          variant="outline"
                          className="h-32 p-2 flex flex-col items-center justify-between text-left border-croffle-primary/20 hover:bg-croffle-background hover:border-croffle-primary"
                          onClick={() => addItem(product)}
                          disabled={!currentShift}
                        >
                          {product.image ? (
                            <div className="w-full h-16 bg-gray-100 rounded-md overflow-hidden mb-2">
                              <img 
                                src={product.image} 
                                alt={product.name} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-16 bg-croffle-background rounded-md flex items-center justify-center mb-2">
                              <span className="text-croffle-primary">No image</span>
                            </div>
                          )}
                          <div className="w-full">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p className="text-croffle-primary font-bold">₱{product.price.toFixed(2)}</p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Cart Area */}
        <div className="w-full lg:w-96">
          <Card className="border-croffle-primary/20">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg text-croffle-primary">Current Order</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearCart}
                  className="text-croffle-accent hover:text-croffle-accent/90 hover:bg-croffle-background"
                  disabled={items.length === 0 || !currentShift}
                >
                  Clear All
                </Button>
              </div>
              
              {/* Customer Selection */}
              <div className="mb-4">
                <CustomerLookup 
                  onSelectCustomer={setSelectedCustomer}
                  selectedCustomer={selectedCustomer}
                />
              </div>
              
              {/* Cart Items */}
              <div className="space-y-4 mb-4 max-h-[calc(100vh-22rem)] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Your cart is empty</p>
                    <p className="text-sm">Select products to add them to your order</p>
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div key={`${item.productId}-${item.variationId || 'base'}`} className="bg-croffle-background/50 p-3 rounded-md">
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{item.product.name}</p>
                          {item.variation && (
                            <Badge variant="outline" className="mt-1 bg-croffle-background">
                              {item.variation.name}
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold text-croffle-primary">
                          ₱{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center">
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-8 w-8 rounded-full"
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            disabled={item.quantity <= 1 || !currentShift}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="mx-2 font-medium w-6 text-center">{item.quantity}</span>
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-8 w-8 rounded-full"
                            onClick={() => updateQuantity(index, item.quantity + 1)}
                            disabled={!currentShift}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeItem(index)}
                          disabled={!currentShift}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Discount Selection */}
              <DiscountSelector
                subtotal={subtotal}
                onApplyDiscount={handleApplyDiscount}
                currentDiscount={discount}
                currentDiscountType={discountType}
                currentDiscountIdNumber={discountIdNumber}
              />
              
              {/* Order Summary */}
              <div className="space-y-2 pt-4">
                <Separator className="bg-croffle-primary/20" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">₱{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₱{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT (12%)</span>
                  <span className="font-medium">₱{tax.toFixed(2)}</span>
                </div>
                <Separator className="bg-croffle-primary/20" />
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-croffle-primary">Total</span>
                  <span className="text-croffle-primary">₱{(total - discount).toFixed(2)}</span>
                </div>
                
                {/* Payment Processor */}
                <PaymentProcessor
                  total={total - discount}
                  onPaymentComplete={handlePaymentComplete}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
