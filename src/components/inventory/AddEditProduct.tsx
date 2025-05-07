
import { useState, useEffect } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Product, ProductVariation, Category } from "@/types";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchProductById, saveProduct } from "@/services/inventory";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Trash2, Plus, X } from "lucide-react";

interface AddEditProductProps {
  product?: Product | null;
  categories?: Category[];
  onClose: () => void;
}

export default function AddEditProduct({ product, categories = [], onClose }: AddEditProductProps) {
  const { currentStore } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [productData, setProductData] = useState<Product>({
    id: "",
    name: "",
    description: "",
    price: 0,
    categoryId: "",
    image: undefined,
    isActive: true,
    sku: "",
    barcode: undefined,
    cost: undefined,
    stockQuantity: 0,
    variations: []
  });
  
  // If editing, fetch the full product data
  useEffect(() => {
    const loadProduct = async () => {
      if (!product?.id) return;
      
      try {
        setIsLoading(true);
        const fullProduct = await fetchProductById(product.id);
        setProductData(fullProduct);
      } catch (error) {
        console.error("Error loading product:", error);
        toast.error("Error loading product details");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (product) {
      // If we already have complete product data, use it
      if (product.variations !== undefined) {
        setProductData(product);
      } else {
        // Otherwise fetch complete data
        loadProduct();
      }
    } else {
      // Reset for new product
      setProductData({
        id: "",
        name: "",
        description: "",
        price: 0,
        categoryId: "",
        image: undefined,
        isActive: true,
        sku: "",
        barcode: undefined,
        cost: undefined,
        stockQuantity: 0,
        variations: []
      });
    }
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProductData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numberValue = value === "" ? 0 : Number(value);
    setProductData(prev => ({ ...prev, [name]: numberValue }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setProductData(prev => ({ ...prev, isActive: checked }));
  };

  const handleCategoryChange = (value: string) => {
    setProductData(prev => ({ ...prev, categoryId: value }));
  };

  // Variation handling
  const addVariation = () => {
    const newVariation: ProductVariation = {
      id: "",
      name: "New Variation",
      price: productData.price,
      isActive: true,
      stockQuantity: 0
    };
    
    setProductData(prev => ({
      ...prev,
      variations: [...(prev.variations || []), newVariation]
    }));
  };

  const updateVariation = (index: number, field: keyof ProductVariation, value: any) => {
    if (!productData.variations) return;
    
    const updatedVariations = [...productData.variations];
    updatedVariations[index] = {
      ...updatedVariations[index],
      [field]: field === 'price' || field === 'stockQuantity' 
        ? (value === "" ? 0 : Number(value)) 
        : value
    };
    
    setProductData(prev => ({ ...prev, variations: updatedVariations }));
  };

  const removeVariation = (index: number) => {
    if (!productData.variations) return;
    
    const updatedVariations = productData.variations.filter((_, i) => i !== index);
    setProductData(prev => ({ ...prev, variations: updatedVariations }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentStore) {
      toast.error("No store selected");
      return;
    }
    
    try {
      setIsSaving(true);
      
      await saveProduct(productData, currentStore.id);
      
      toast.success(`Product ${productData.id ? "updated" : "created"} successfully!`);
      onClose();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error.message || "Failed to save product");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DialogContent className="sm:max-w-[600px]">
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{productData.id ? `Edit ${productData.name}` : "Add New Product"}</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="details" className="mt-2">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="variations">Variations</TabsTrigger>
          </TabsList>
          
          {/* Basic Details */}
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-4">
                  <Label htmlFor="name" className="text-right">
                    Product Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={productData.name}
                    onChange={handleChange}
                    className="mt-1"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={productData.description}
                  onChange={handleChange}
                  className="mt-1 resize-none"
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price" className="text-right">
                    Price
                  </Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={productData.price}
                    onChange={handleNumberChange}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cost" className="text-right">
                    Cost (optional)
                  </Label>
                  <Input
                    id="cost"
                    name="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={productData.cost || ""}
                    onChange={handleNumberChange}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="categoryId" className="text-right">
                    Category
                  </Label>
                  <Select
                    value={productData.categoryId}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Category</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center pt-8">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="isActive" 
                      checked={productData.isActive} 
                      onCheckedChange={handleSwitchChange} 
                    />
                    <Label htmlFor="isActive">Active Product</Label>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku" className="text-right">
                    SKU
                  </Label>
                  <Input
                    id="sku"
                    name="sku"
                    value={productData.sku}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder="Product SKU"
                  />
                </div>
                <div>
                  <Label htmlFor="barcode" className="text-right">
                    Barcode (optional)
                  </Label>
                  <Input
                    id="barcode"
                    name="barcode"
                    value={productData.barcode || ""}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder="UPC/EAN"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="stockQuantity" className="text-right">
                  Stock Quantity
                </Label>
                <Input
                  id="stockQuantity"
                  name="stockQuantity"
                  type="number"
                  min="0"
                  value={productData.stockQuantity}
                  onChange={handleNumberChange}
                  className="mt-1"
                  required
                />
              </div>
            </div>
          </TabsContent>
          
          {/* Variations Tab */}
          <TabsContent value="variations" className="space-y-4 mt-4">
            {productData.variations && productData.variations.length > 0 ? (
              <div className="space-y-4">
                {productData.variations.map((variation, index) => (
                  <Card key={index} className="relative">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-2 top-2" 
                      onClick={() => removeVariation(index)}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                    
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`variation-${index}-name`}>Name</Label>
                          <Input
                            id={`variation-${index}-name`}
                            value={variation.name}
                            onChange={(e) => updateVariation(index, 'name', e.target.value)}
                            className="mt-1"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor={`variation-${index}-price`}>Price</Label>
                          <Input
                            id={`variation-${index}-price`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={variation.price}
                            onChange={(e) => updateVariation(index, 'price', e.target.value)}
                            className="mt-1"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label htmlFor={`variation-${index}-stock`}>Stock</Label>
                          <Input
                            id={`variation-${index}-stock`}
                            type="number"
                            min="0"
                            value={variation.stockQuantity}
                            onChange={(e) => updateVariation(index, 'stockQuantity', e.target.value)}
                            className="mt-1"
                            required
                          />
                        </div>
                        <div className="flex items-center pt-6">
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id={`variation-${index}-active`} 
                              checked={variation.isActive} 
                              onCheckedChange={(checked) => updateVariation(index, 'isActive', checked)} 
                            />
                            <Label htmlFor={`variation-${index}-active`}>Active</Label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No variations added yet</p>
              </div>
            )}
            
            <Button 
              type="button"
              variant="outline" 
              onClick={addVariation}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Variation
            </Button>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Saving...
              </>
            ) : productData.id ? "Update Product" : "Create Product"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
