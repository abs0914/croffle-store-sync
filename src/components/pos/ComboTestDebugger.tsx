import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, XCircle, Coffee } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useComboService } from "@/hooks/pos/useComboService";

interface ComboTestDebuggerProps {
  products: any[];
  categories: any[];
  cartItems: any[];
}

export function ComboTestDebugger({ products, categories, cartItems }: ComboTestDebuggerProps) {
  const { getEspressoProducts, getComboPrice } = useComboService();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<any[]>([]);

  useEffect(() => {
    runComboTests();
  }, [products, categories]);

  const runComboTests = () => {
    const espressoProducts = getEspressoProducts(products, categories);
    const expectedEspressoNames = ["Americano", "Cafe Latte", "Caramel Latte"];
    
    const tests = [
      {
        name: "Data Loading Test",
        status: products.length > 0 && categories.length > 0 ? "pass" : "fail",
        details: `Products: ${products.length}, Categories: ${categories.length}`
      },
      {
        name: "Espresso Category Test",
        status: categories.some(c => c.name === "Espresso") ? "pass" : "fail",
        details: `Espresso category found: ${categories.some(c => c.name === "Espresso")}`
      },
      {
        name: "Espresso Products Test",
        status: espressoProducts.length > 0 ? "pass" : "fail",
        details: `Found ${espressoProducts.length} espresso products: ${espressoProducts.map(p => p.name).join(", ")}`
      },
      {
        name: "Expected Espresso Drinks Test",
        status: expectedEspressoNames.every(name => 
          espressoProducts.some(p => p.name.toLowerCase().includes(name.toLowerCase()))
        ) ? "pass" : "fail",
        details: `Missing: ${expectedEspressoNames.filter(name => 
          !espressoProducts.some(p => p.name.toLowerCase().includes(name.toLowerCase()))
        ).join(", ")}`
      },
      {
        name: "Combo Pricing Test",
        status: getComboPrice("Classic", "Hot Espresso") > 0 ? "pass" : "fail",
        details: `Classic + Hot Espresso = ₱${getComboPrice("Classic", "Hot Espresso")}`
      },
      {
        name: "Cart Combo Items Test",
        status: cartItems.some(item => item.product.product_type === 'combo') ? "pass" : "warning",
        details: `Found ${cartItems.filter(item => item.product.product_type === 'combo').length} combo items in cart`
      }
    ];

    setTestResults(tests);
    setDebugInfo({
      totalProducts: products.length,
      totalCategories: categories.length,
      espressoProducts: espressoProducts.map(p => ({ name: p.name, price: p.price, id: p.id })),
      croffleCategories: ["Classic", "Glaze", "Fruity", "Premium", "Mini Croffle"].map(catName => ({
        name: catName,
        hasCategory: categories.some(c => c.name === catName),
        productCount: products.filter(p => {
          if (catName === "Mini Croffle") {
            return p.name && p.name.toLowerCase().includes("mini");
          }
          const category = categories.find(c => c.name === catName);
          return category && products.some(prod => prod.category_id === category.id);
        }).length
      })),
      comboCartItems: cartItems.filter(item => item.product.product_type === 'combo').map(item => ({
        name: item.product.name,
        price: item.product.price,
        customization: item.customization
      })),
      sampleProducts: products.slice(0, 10).map(p => ({ name: p.name, category_id: p.category_id })),
      categoryDetails: categories.map(c => ({ name: c.name, id: c.id, is_active: c.is_active }))
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "fail": return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning": return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const simulateComboPayment = () => {
    const comboItems = cartItems.filter(item => item.product.product_type === 'combo');
    if (comboItems.length === 0) {
      alert("No combo items in cart to test payment with");
      return;
    }

    // Log what would happen during payment
    console.log("🧪 Simulating combo payment:", {
      comboItems: comboItems.map(item => ({
        name: item.product.name,
        price: item.product.price,
        croffle: item.customization?.croffle,
        espresso: item.customization?.espresso,
        savings: item.customization?.savings
      })),
      totalComboValue: comboItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
    });

    alert(`Payment simulation complete! Check console for details. Found ${comboItems.length} combo items.`);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coffee className="h-5 w-5" />
          Combo System Debug Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Results */}
        <div>
          <h3 className="font-semibold mb-3">System Tests</h3>
          <div className="grid gap-3">
            {testResults.map((test, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                {getStatusIcon(test.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{test.name}</span>
                    <Badge variant={test.status === "pass" ? "default" : test.status === "fail" ? "destructive" : "secondary"}>
                      {test.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{test.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Debug Information */}
        {debugInfo && (
          <div className="space-y-4">
            <h3 className="font-semibold">Debug Information</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Espresso Products</CardTitle>
                </CardHeader>
                <CardContent>
                  {debugInfo.espressoProducts.length > 0 ? (
                    <div className="space-y-1">
                      {debugInfo.espressoProducts.map((product: any, index: number) => (
                        <div key={index} className="text-xs flex justify-between">
                          <span>{product.name}</span>
                          <span className="text-muted-foreground">₱{product.price}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No espresso products found</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Croffle Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {debugInfo.croffleCategories.map((cat: any, index: number) => (
                      <div key={index} className="text-xs flex justify-between">
                        <span>{cat.name}</span>
                        <div className="flex gap-1">
                          <Badge variant={cat.hasCategory ? "default" : "destructive"} className="text-xs h-4">
                            {cat.hasCategory ? "✓" : "✗"}
                          </Badge>
                          <span className="text-muted-foreground">{cat.productCount} items</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {debugInfo.comboCartItems.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Combo Items in Cart</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {debugInfo.comboCartItems.map((item: any, index: number) => (
                      <div key={index} className="text-xs p-2 bg-muted/50 rounded">
                        <div className="font-medium">{item.name} - ₱{item.price}</div>
                        {item.customization && (
                          <div className="text-muted-foreground mt-1">
                            Croffle: {item.customization.croffle?.name} | 
                            Espresso: {item.customization.espresso?.name} | 
                            Savings: ₱{item.customization.savings}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={runComboTests} variant="outline">
            Re-run Tests
          </Button>
          <Button onClick={simulateComboPayment} variant="default">
            Simulate Combo Payment
          </Button>
        </div>

        {/* Status Summary */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Status Summary:</strong> {testResults.filter(t => t.status === "pass").length} passed, {testResults.filter(t => t.status === "fail").length} failed, {testResults.filter(t => t.status === "warning").length} warnings
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}