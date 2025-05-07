import { useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { fetchProducts, fetchCategories } from "@/services/mockData";
import { Product, Category } from "@/types";
import { Separator } from "@/components/ui/separator";
import { Search, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function POS() {
  const { currentStore } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const { 
    items, 
    addItem, 
    removeItem, 
    updateQuantity, 
    clearCart, 
    subtotal,
    tax,
    total
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
        // For now, we're using mock data but logging the store ID for demonstration
        console.log(`Loading data for store: ${storeId}`);
        
        const [productsData, categoriesData] = await Promise.all([
          fetchProducts(),
          fetchCategories()
        ]);
        
        setProducts(productsData);
        setCategories(categoriesData);
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
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  const handleCheckout = () => {
    if (!currentStore) {
      toast.error("Please select a store first");
      return;
    }
    
    // In a real implementation, we would include the store ID in the transaction
    const storeId = currentStore.id;
    console.log(`Processing checkout for store: ${storeId}`);
    
    toast.success(`Checkout completed for store: ${currentStore.name}!`);
    clearCart();
  };

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
                >
                  Clear All
                </Button>
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
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="mx-2 font-medium w-6 text-center">{item.quantity}</span>
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-8 w-8 rounded-full"
                            onClick={() => updateQuantity(index, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Order Summary */}
              <div className="space-y-2 pt-4">
                <Separator className="bg-croffle-primary/20" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">₱{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT (12%)</span>
                  <span className="font-medium">₱{tax.toFixed(2)}</span>
                </div>
                <Separator className="bg-croffle-primary/20" />
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-croffle-primary">Total</span>
                  <span className="text-croffle-primary">₱{total.toFixed(2)}</span>
                </div>
                
                <Button 
                  className="w-full mt-4 bg-croffle-accent hover:bg-croffle-accent/90 text-lg py-6"
                  disabled={items.length === 0}
                  onClick={handleCheckout}
                >
                  Checkout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
