
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  fetchProduct,
  createProduct,
  updateProduct,
  uploadProductImage,
  createInventoryTransaction
} from "@/services/productService";
import { fetchCategories } from "@/services/categoryService";
import { Product, ProductSize } from "@/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Plus, Trash2, Upload, X, Pencil } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = id !== "new";
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const { user } = useAuth();

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    description: "",
    sku: "",
    barcode: "",
    price: 0,
    cost: 0,
    stockQuantity: 0,
    categoryId: "",
    isActive: true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
  // Size variations 
  const [hasVariations, setHasVariations] = useState(true);
  const [regularPrice, setRegularPrice] = useState<number>(0);
  const [miniPrice, setMiniPrice] = useState<number>(0);
  const [regularStock, setRegularStock] = useState<number>(0);
  const [miniStock, setMiniStock] = useState<number>(0);
  
  // Stock adjustment form state
  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: 0,
    notes: "",
    type: "adjustment"
  });
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);

  // Fetch product data if editing
  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id!),
    enabled: isEditing && !!id,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", currentStore?.id],
    queryFn: () => currentStore?.id ? fetchCategories(currentStore.id) : Promise.resolve([]),
    enabled: !!currentStore?.id,
  });

  // Set form data when product is loaded
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        sku: product.sku,
        barcode: product.barcode || "",
        price: product.price,
        cost: product.cost || 0,
        stockQuantity: product.stockQuantity,
        categoryId: product.categoryId || "",
        isActive: product.isActive,
      });

      if (product.image) {
        setImagePreview(product.image);
      }
      
      // Set variation data if available
      if (product.variations && product.variations.length > 0) {
        setHasVariations(true);
        
        const regularVariation = product.variations.find(v => v.size === 'regular');
        const miniVariation = product.variations.find(v => v.size === 'mini');
        
        if (regularVariation) {
          setRegularPrice(regularVariation.price);
          setRegularStock(regularVariation.stockQuantity || 0);
        } else {
          setRegularPrice(product.price);
          setRegularStock(product.stockQuantity || 0);
        }
        
        if (miniVariation) {
          setMiniPrice(miniVariation.price);
          setMiniStock(miniVariation.stockQuantity || 0);
        } else {
          setMiniPrice(product.price * 0.7);
          setMiniStock(0);
        }
      } else {
        setHasVariations(false);
        setRegularPrice(product.price);
        setRegularStock(product.stockQuantity || 0);
        setMiniPrice(product.price * 0.7);
        setMiniStock(0);
      }
    }
  }, [product]);
  
  // Update mini price when regular price changes
  useEffect(() => {
    if (formData.price) {
      setRegularPrice(formData.price);
      setMiniPrice(formData.price * 0.7);
    }
  }, [formData.price]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    if (name === "hasVariations") {
      setHasVariations(checked);
    } else {
      setFormData(prev => ({ ...prev, [name]: checked }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image: null }));
  };

  const handleVariationPriceChange = (e: React.ChangeEvent<HTMLInputElement>, size: ProductSize) => {
    const value = parseFloat(e.target.value) || 0;
    if (size === 'regular') {
      setRegularPrice(value);
    } else {
      setMiniPrice(value);
    }
  };

  const handleVariationStockChange = (e: React.ChangeEvent<HTMLInputElement>, size: ProductSize) => {
    const value = parseInt(e.target.value) || 0;
    if (size === 'regular') {
      setRegularStock(value);
    } else {
      setMiniStock(value);
    }
  };

  const handleAdjustStock = () => {
    setStockAdjustment({
      quantity: 0,
      notes: "",
      type: "adjustment"
    });
    setIsAdjustmentDialogOpen(true);
  };

  const handleStockAdjustmentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStockAdjustment(prev => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value) || 0 : value,
    }));
  };

  const handleSaveStockAdjustment = async () => {
    if (!currentStore?.id || !user?.id || !product) return;
    
    try {
      const currentQuantity = product.stockQuantity || 0;
      const newQuantity = stockAdjustment.type === "add" 
        ? currentQuantity + stockAdjustment.quantity
        : stockAdjustment.type === "remove"
          ? currentQuantity - stockAdjustment.quantity
          : stockAdjustment.quantity;
      
      await createInventoryTransaction({
        store_id: currentStore.id,
        product_id: id!,
        transaction_type: "adjustment",
        quantity: stockAdjustment.quantity,
        previous_quantity: currentQuantity,
        new_quantity: newQuantity,
        notes: stockAdjustment.notes,
        created_by: user.id
      });
      
      setFormData(prev => ({ ...prev, stockQuantity: newQuantity }));
      setIsAdjustmentDialogOpen(false);
      toast.success("Stock adjusted successfully");
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast.error("Failed to adjust stock");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentStore) {
      toast.error("No store selected");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Upload image if selected
      let imageUrl = formData.image as string | null;
      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile);
      }
      
      const productData = {
        ...formData,
        storeId: currentStore.id,
        image: imageUrl
      };
      
      let savedProduct: Product | null = null;
      
      if (isEditing && id) {
        savedProduct = await updateProduct(id, productData);
      } else {
        savedProduct = await createProduct(productData as Omit<Product, "id">);
      }
      
      // Create variations if hasVariations is checked
      if (savedProduct && hasVariations) {
        import("@/services/product/productVariations").then(async module => {
          try {
            // Create Regular size variation
            await module.createProductVariation({
              product_id: savedProduct!.id,
              name: `${savedProduct!.name} Regular`,
              price: regularPrice,
              stock_quantity: regularStock,
              is_active: true,
              sku: `${savedProduct!.sku}-REG`,
              size: 'regular' as ProductSize
            });
            
            // Create Mini size variation
            await module.createProductVariation({
              product_id: savedProduct!.id,
              name: `${savedProduct!.name} Mini`,
              price: miniPrice,
              stock_quantity: miniStock,
              is_active: true,
              sku: `${savedProduct!.sku}-MINI`,
              size: 'mini' as ProductSize
            });
            
            toast.success("Size variations added");
          } catch (error) {
            console.error("Error creating variations:", error);
            toast.error("Failed to create size variations");
          }
        });
      }
      
      if (savedProduct) {
        toast.success(`Product ${isEditing ? 'updated' : 'created'} successfully`);
        navigate('/inventory');
      }
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} product`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentStore) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Please select a store to manage inventory.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-croffle-primary">
          {isEditing ? 'Edit Product' : 'Add New Product'}
        </h1>
      </div>

      {isLoadingProduct && isEditing ? (
        <div className="flex justify-center items-center py-8">
          <Spinner className="h-8 w-8 text-croffle-accent" />
          <span className="ml-2 text-croffle-primary">Loading product...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>
                Enter the basic details for this product.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category</Label>
                  <Select
                    value={formData.categoryId || undefined}
                    onValueChange={(value) => handleSelectChange("categoryId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uncategorized">Uncategorized</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Base Price *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost</Label>
                  <Input
                    id="cost"
                    name="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={handleInputChange}
                  />
                </div>
                
                {!hasVariations && (
                  <div className="space-y-2">
                    <Label htmlFor="stockQuantity">Stock Quantity *</Label>
                    <Input
                      id="stockQuantity"
                      name="stockQuantity"
                      type="number"
                      value={formData.stockQuantity}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                )}
                
                <div className="space-y-2 flex items-center">
                  <Label htmlFor="isActive" className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleCheckboxChange}
                      className="rounded border-gray-300"
                    />
                    <span>Active</span>
                  </Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>
              
              <div className="border-t pt-4">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="hasVariations"
                    name="hasVariations"
                    checked={hasVariations}
                    onChange={handleCheckboxChange}
                    className="rounded border-gray-300 mr-2"
                  />
                  <Label htmlFor="hasVariations">Add size variations (Regular and Mini)</Label>
                </div>
                
                {hasVariations && (
                  <div className="space-y-4 mt-4 border p-4 rounded-md">
                    <h3 className="font-medium">Size Variations</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Regular Size */}
                      <div className="space-y-3 p-3 border rounded-md">
                        <h4 className="font-medium">Regular Size</h4>
                        <div>
                          <Label htmlFor="regularSku">SKU: {formData.sku ? `${formData.sku}-REG` : ''}</Label>
                        </div>
                        <div>
                          <Label htmlFor="regularPrice">Price</Label>
                          <Input
                            id="regularPrice"
                            type="number"
                            step="0.01"
                            value={regularPrice}
                            onChange={(e) => handleVariationPriceChange(e, 'regular')}
                          />
                        </div>
                        <div>
                          <Label htmlFor="regularStock">Stock Quantity</Label>
                          <Input
                            id="regularStock"
                            type="number"
                            value={regularStock}
                            onChange={(e) => handleVariationStockChange(e, 'regular')}
                          />
                        </div>
                      </div>
                      
                      {/* Mini Size */}
                      <div className="space-y-3 p-3 border rounded-md">
                        <h4 className="font-medium">Mini Size</h4>
                        <div>
                          <Label htmlFor="miniSku">SKU: {formData.sku ? `${formData.sku}-MINI` : ''}</Label>
                        </div>
                        <div>
                          <Label htmlFor="miniPrice">Price</Label>
                          <Input
                            id="miniPrice"
                            type="number"
                            step="0.01"
                            value={miniPrice}
                            onChange={(e) => handleVariationPriceChange(e, 'mini')}
                          />
                        </div>
                        <div>
                          <Label htmlFor="miniStock">Stock Quantity</Label>
                          <Input
                            id="miniStock"
                            type="number"
                            value={miniStock}
                            onChange={(e) => handleVariationStockChange(e, 'mini')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Product Image</Label>
                <div className="flex items-center gap-4">
                  <div className="border rounded-md p-2 h-32 w-32 flex items-center justify-center overflow-hidden">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="max-h-full max-w-full object-cover"
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm text-center">No image</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="image" className="sr-only">
                        Choose image
                      </Label>
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </div>
                    {imagePreview && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRemoveImage}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/inventory')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                {isEditing ? 'Update Product' : 'Create Product'}
              </Button>
            </CardFooter>
          </Card>
          
          {/* Stock Adjustment Dialog */}
          <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adjust Stock</DialogTitle>
                <DialogDescription>
                  Update the stock quantity for this product.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="adjustment_type">Adjustment Type</Label>
                  <Select
                    value={stockAdjustment.type}
                    onValueChange={(value) => setStockAdjustment(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Add Stock</SelectItem>
                      <SelectItem value="remove">Remove Stock</SelectItem>
                      <SelectItem value="adjustment">Set Exact Value</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adjustment_quantity">Quantity</Label>
                  <Input
                    id="adjustment_quantity"
                    name="quantity"
                    type="number"
                    value={stockAdjustment.quantity}
                    onChange={handleStockAdjustmentInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adjustment_notes">Notes</Label>
                  <Textarea
                    id="adjustment_notes"
                    name="notes"
                    value={stockAdjustment.notes}
                    onChange={handleStockAdjustmentInputChange}
                    placeholder="Optional notes about this adjustment"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAdjustmentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveStockAdjustment}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </form>
      )}
    </div>
  );
}
