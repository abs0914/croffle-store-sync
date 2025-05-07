
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  fetchProduct,
  fetchProductVariations,
  createProduct,
  updateProduct,
  uploadProductImage,
  createProductVariation,
  updateProductVariation,
  deleteProductVariation,
  createInventoryTransaction
} from "@/services/productService";
import { fetchCategories } from "@/services/categoryService";
import { Product, ProductVariation } from "@/types";
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
import { ArrowLeft, Plus, Trash2, Upload, X } from "lucide-react";
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
  
  // Variations form state
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [isVariationDialogOpen, setIsVariationDialogOpen] = useState(false);
  const [editingVariation, setEditingVariation] = useState<ProductVariation | null>(null);
  const [variationForm, setVariationForm] = useState({
    name: "",
    sku: "",
    price: 0,
    stock_quantity: 0,
    is_active: true
  });
  
  // Stock adjustment form state
  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: 0,
    notes: "",
    type: "adjustment"
  });
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [adjustingVariation, setAdjustingVariation] = useState<ProductVariation | null>(null);

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

  // Fetch variations if editing
  const { data: productVariations = [], refetch: refetchVariations } = useQuery({
    queryKey: ["productVariations", id],
    queryFn: () => fetchProductVariations(id!),
    enabled: isEditing && !!id,
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
    }
  }, [product]);

  // Set variations when loaded
  useEffect(() => {
    if (productVariations) {
      setVariations(productVariations);
    }
  }, [productVariations]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
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

  const handleVariationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setVariationForm(prev => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleVariationCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setVariationForm(prev => ({ ...prev, [name]: checked }));
  };

  const handleAddVariation = () => {
    setEditingVariation(null);
    setVariationForm({
      name: "",
      sku: "",
      price: formData.price || 0,
      stock_quantity: 0,
      is_active: true
    });
    setIsVariationDialogOpen(true);
  };

  const handleEditVariation = (variation: ProductVariation) => {
    setEditingVariation(variation);
    setVariationForm({
      name: variation.name,
      sku: variation.sku,
      price: variation.price,
      stock_quantity: variation.stockQuantity,
      is_active: variation.isActive
    });
    setIsVariationDialogOpen(true);
  };

  const handleSaveVariation = async () => {
    if (!id) return;
    
    try {
      if (editingVariation) {
        await updateProductVariation(editingVariation.id, {
          name: variationForm.name,
          sku: variationForm.sku,
          price: variationForm.price,
          stockQuantity: variationForm.stock_quantity,
          isActive: variationForm.is_active
        });
      } else {
        await createProductVariation({
          productId: id,
          name: variationForm.name,
          sku: variationForm.sku,
          price: variationForm.price,
          stockQuantity: variationForm.stock_quantity,
          isActive: variationForm.is_active
        });
      }
      
      refetchVariations();
      setIsVariationDialogOpen(false);
    } catch (error) {
      console.error("Error saving variation:", error);
    }
  };

  const handleDeleteVariation = async (variationId: string) => {
    try {
      await deleteProductVariation(variationId);
      refetchVariations();
    } catch (error) {
      console.error("Error deleting variation:", error);
    }
  };

  const handleAdjustStock = (variation: ProductVariation | null = null) => {
    setAdjustingVariation(variation);
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
    if (!currentStore?.id || !user?.id) return;
    
    try {
      const currentItem = adjustingVariation || product;
      if (!currentItem) return;
      
      const currentQuantity = adjustingVariation ? adjustingVariation.stockQuantity : (product?.stockQuantity || 0);
      const newQuantity = stockAdjustment.type === "add" 
        ? currentQuantity + stockAdjustment.quantity
        : stockAdjustment.type === "remove"
          ? currentQuantity - stockAdjustment.quantity
          : stockAdjustment.quantity;
      
      await createInventoryTransaction({
        store_id: currentStore.id,
        product_id: id!,
        variation_id: adjustingVariation?.id,
        transaction_type: "adjustment",
        quantity: stockAdjustment.quantity,
        previous_quantity: currentQuantity,
        new_quantity: newQuantity,
        notes: stockAdjustment.notes,
        created_by: user.id
      });
      
      if (adjustingVariation) {
        refetchVariations();
      } else {
        setFormData(prev => ({ ...prev, stockQuantity: newQuantity }));
      }
      
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Product Details</TabsTrigger>
            <TabsTrigger value="variations" disabled={!isEditing}>Variations</TabsTrigger>
            <TabsTrigger value="inventory" disabled={!isEditing}>Inventory</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <Card>
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>Product Information</CardTitle>
                  <CardDescription>
                    Enter the basic details for this product.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                        value={formData.categoryId || ""}
                        onValueChange={(value) => handleSelectChange("categoryId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Uncategorized</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="price">Price *</Label>
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
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="variations">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Product Variations</CardTitle>
                    <CardDescription>
                      Manage different variations of this product.
                    </CardDescription>
                  </div>
                  <Button onClick={handleAddVariation}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Variation
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No variations found
                          </TableCell>
                        </TableRow>
                      ) : (
                        variations.map((variation) => (
                          <TableRow key={variation.id}>
                            <TableCell>{variation.name}</TableCell>
                            <TableCell>{variation.sku}</TableCell>
                            <TableCell className="text-right">${variation.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <span className={variation.stockQuantity < 10 ? "text-red-500 font-medium" : ""}>
                                {variation.stockQuantity}
                              </span>
                            </TableCell>
                            <TableCell>
                              {variation.isActive ? (
                                <span className="text-green-600">Active</span>
                              ) : (
                                <span className="text-gray-400">Inactive</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleAdjustStock(variation)}
                                >
                                  Adjust
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEditVariation(variation)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Variation</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete '{variation.name}'? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteVariation(variation.id)}
                                        className="bg-red-500 hover:bg-red-600"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Variation Dialog */}
            <Dialog open={isVariationDialogOpen} onOpenChange={setIsVariationDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingVariation ? "Edit Variation" : "Add Variation"}</DialogTitle>
                  <DialogDescription>
                    {editingVariation 
                      ? "Update the details for this product variation."
                      : "Add a new variation for this product."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="variation_name">Variation Name</Label>
                    <Input
                      id="variation_name"
                      name="name"
                      value={variationForm.name}
                      onChange={handleVariationInputChange}
                      placeholder="e.g., Small, Red, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="variation_sku">SKU</Label>
                    <Input
                      id="variation_sku"
                      name="sku"
                      value={variationForm.sku}
                      onChange={handleVariationInputChange}
                      placeholder="Variation SKU"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="variation_price">Price</Label>
                    <Input
                      id="variation_price"
                      name="price"
                      type="number"
                      step="0.01"
                      value={variationForm.price}
                      onChange={handleVariationInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="variation_stock_quantity">Stock Quantity</Label>
                    <Input
                      id="variation_stock_quantity"
                      name="stock_quantity"
                      type="number"
                      value={variationForm.stock_quantity}
                      onChange={handleVariationInputChange}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="variation_is_active"
                      name="is_active"
                      checked={variationForm.is_active}
                      onChange={handleVariationCheckboxChange}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="variation_is_active">Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsVariationDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSaveVariation}>
                    {editingVariation ? 'Update' : 'Add'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
          
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Inventory Management</CardTitle>
                    <CardDescription>
                      Adjust stock levels and view inventory history.
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleAdjustStock()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adjust Stock
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Stock</p>
                        <p className="text-2xl font-bold">{formData.stockQuantity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">SKU</p>
                        <p className="text-lg">{formData.sku}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="text-lg">${formData.price?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="text-lg">{formData.isActive ? "Active" : "Inactive"}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* This would be replaced with actual inventory transaction history */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-md font-medium mb-2">Transaction History</h3>
                    <p className="text-muted-foreground text-sm">
                      Inventory transaction history will be displayed here.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Stock Adjustment Dialog */}
            <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adjust Stock</DialogTitle>
                  <DialogDescription>
                    Update the stock quantity for {adjustingVariation ? `variation: ${adjustingVariation.name}` : "this product"}.
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
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
