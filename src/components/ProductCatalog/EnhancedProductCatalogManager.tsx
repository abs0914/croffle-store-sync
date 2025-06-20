
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Package, 
  Coffee,
  Utensils,
  Gift,
  Star,
  DollarSign,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  ProductCatalogItem,
  ProductVariation,
  SIZE_VARIATIONS,
  TEMPERATURE_VARIATIONS,
  deployRecipeToProductCatalog,
  createAddOnCatalog,
  calculateVariationPrice
} from '@/services/productCatalog/productCatalogIntegrationService';
import { useAuth } from '@/contexts/auth';

export const EnhancedProductCatalogManager: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('croffles');
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [isVariationDialogOpen, setIsVariationDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductCatalogItem | null>(null);
  const [selectedVariations, setSelectedVariations] = useState<ProductVariation[]>([]);

  const storeId = user?.storeIds?.[0] || '';

  const productCategories = [
    { id: 'croffles', name: 'Croffles', icon: Package, color: 'bg-orange-500' },
    { id: 'drinks', name: 'Drinks', icon: Coffee, color: 'bg-blue-500' },
    { id: 'add-ons', name: 'Add-ons', icon: Plus, color: 'bg-green-500' },
    { id: 'combos', name: 'Combos', icon: Gift, color: 'bg-purple-500' }
  ];

  const handleVariationSelection = (variation: ProductVariation) => {
    setSelectedVariations(prev => {
      const exists = prev.find(v => v.name === variation.name && v.type === variation.type);
      if (exists) {
        return prev.filter(v => !(v.name === variation.name && v.type === variation.type));
      } else {
        return [...prev, variation];
      }
    });
  };

  const calculateTotalPrice = () => {
    if (!selectedProduct) return 0;
    return calculateVariationPrice(selectedProduct.price, selectedVariations);
  };

  const handleCreateAddOns = async () => {
    if (!storeId) {
      toast.error('Please select a store first');
      return;
    }

    await createAddOnCatalog(storeId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Product Catalog</h2>
          <p className="text-muted-foreground">
            Manage menu items with variations, pricing, and add-ons
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateAddOns} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create Add-ons
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          {productCategories.map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
              <category.icon className="h-4 w-4" />
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {productCategories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Croffle Products */}
              {category.id === 'croffles' && (
                <>
                  <Card className="border-2 border-orange-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        Regular Croffles
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">14 flavors available</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Base Price:</span>
                        <Badge variant="secondary">₱125</Badge>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Size Variations:</Label>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">Mini ₱65</Badge>
                          <Badge variant="default" className="text-xs">Regular ₱125</Badge>
                          <Badge variant="outline" className="text-xs">Overload ₱99</Badge>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setSelectedProduct({
                            product_name: 'Regular Croffle',
                            price: 125,
                            category: 'croffles',
                            store_id: storeId,
                            is_available: true
                          });
                          setIsVariationDialogOpen(true);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configure Variations
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-amber-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                        Other Varieties
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Classic Glaze</span>
                          <Badge variant="secondary">₱79</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Mini Croffle</span>
                          <Badge variant="secondary">₱65</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Croffle Overload</span>
                          <Badge variant="secondary">₱99</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Drink Products */}
              {category.id === 'drinks' && (
                <Card className="border-2 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Coffee className="h-4 w-4 text-blue-500" />
                      Espresso Drinks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Americano</span>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">Hot ₱65</Badge>
                          <Badge variant="outline" className="text-xs">Iced ₱70</Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Cappuccino</span>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">Hot ₱75</Badge>
                          <Badge variant="outline" className="text-xs">Iced ₱80</Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Cafe Latte</span>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">Hot ₱75</Badge>
                          <Badge variant="outline" className="text-xs">Iced ₱80</Badge>
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setSelectedProduct({
                          product_name: 'Espresso Drink',
                          price: 75,
                          category: 'drinks',
                          store_id: storeId,
                          is_available: true
                        });
                        setIsVariationDialogOpen(true);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure Temperature
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Add-ons */}
              {category.id === 'add-ons' && (
                <>
                  <Card className="border-2 border-green-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Star className="h-4 w-4 text-green-500" />
                        Toppings & Sauces
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <Label className="text-xs font-medium">Classic (₱6)</Label>
                          <div className="text-xs text-muted-foreground">
                            Sprinkles, Marshmallow, Chocolate Flakes, Peanuts
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Premium (₱8-10)</Label>
                          <div className="text-xs text-muted-foreground">
                            Biscoff, Oreo, Nutella, Fruits
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-yellow-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Utensils className="h-4 w-4 text-yellow-500" />
                        Biscuits
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Biscoff Biscuit</span>
                          <Badge variant="secondary">₱10</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Oreo Biscuit</span>
                          <Badge variant="secondary">₱10</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Kitkat Biscuit</span>
                          <Badge variant="secondary">₱10</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Combos */}
              {category.id === 'combos' && (
                <Card className="border-2 border-purple-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Gift className="h-4 w-4 text-purple-500" />
                      Croffle + Coffee Combos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Mini + Hot Espresso</span>
                        <Badge variant="secondary">₱110</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Mini + Iced Espresso</span>
                        <Badge variant="secondary">₱115</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Regular + Hot Espresso</span>
                        <Badge variant="secondary">₱170</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Regular + Iced Espresso</span>
                        <Badge variant="secondary">₱175</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Variation Configuration Dialog */}
      <Dialog open={isVariationDialogOpen} onOpenChange={setIsVariationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Product Variations</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Product: {selectedProduct.product_name}</Label>
                <div className="text-sm text-muted-foreground">Base Price: ₱{selectedProduct.price}</div>
              </div>

              {selectedProduct.category === 'croffles' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Size Variations</Label>
                  <div className="space-y-2">
                    {SIZE_VARIATIONS.map((variation) => (
                      <div key={variation.name} className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedVariations.some(v => v.name === variation.name)}
                            onChange={() => handleVariationSelection(variation)}
                            className="rounded"
                          />
                          <span className="text-sm">{variation.name}</span>
                        </label>
                        <span className="text-sm text-muted-foreground">
                          ₱{selectedProduct.price + variation.price_modifier}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduct.category === 'drinks' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Temperature Variations</Label>
                  <div className="space-y-2">
                    {TEMPERATURE_VARIATIONS.map((variation) => (
                      <div key={variation.name} className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedVariations.some(v => v.name === variation.name)}
                            onChange={() => handleVariationSelection(variation)}
                            className="rounded"
                          />
                          <span className="text-sm">{variation.name}</span>
                        </label>
                        <span className="text-sm text-muted-foreground">
                          ₱{selectedProduct.price + variation.price_modifier}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Price:</span>
                  <span className="text-lg font-bold text-green-600">
                    ₱{calculateTotalPrice()}
                  </span>
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={() => {
                  toast.success('Variations configured successfully');
                  setIsVariationDialogOpen(false);
                  setSelectedVariations([]);
                }}
              >
                Save Configuration
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
