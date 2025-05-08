
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { 
  createProduct, 
  updateProduct, 
  uploadProductImage, 
  createInventoryTransaction,
  createProductVariation
} from "@/services/productService";
import { Product, ProductSize } from "@/types";
import { toast } from "sonner";

interface UseProductFormProps {
  product?: Product | null;
  isEditing: boolean;
  productId?: string;
}

export const useProductForm = ({ product, isEditing, productId }: UseProductFormProps) => {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const { user } = useAuth();

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    description: "",
    sku: "",
    barcode: "",
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
  const [overloadPrice, setOverloadPrice] = useState<number>(0);
  const [regularStock, setRegularStock] = useState<number>(0);
  const [miniStock, setMiniStock] = useState<number>(0);
  const [overloadStock, setOverloadStock] = useState<number>(0);
  
  // Stock adjustment form state
  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: 0,
    notes: "",
    type: "adjustment"
  });
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);

  // Set form data when product is loaded
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        sku: product.sku,
        barcode: product.barcode || "",
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
        const overloadVariation = product.variations.find(v => v.size === 'croffle-overload');
        
        if (regularVariation) {
          setRegularPrice(regularVariation.price);
          setRegularStock(regularVariation.stockQuantity || 0);
        } else {
          setRegularPrice(product.price || 0);
          setRegularStock(Math.floor((product.stockQuantity || 0) / 3));
        }
        
        if (miniVariation) {
          setMiniPrice(miniVariation.price);
          setMiniStock(miniVariation.stockQuantity || 0);
        } else {
          setMiniPrice((product.price || 0) * 0.7);
          setMiniStock(Math.floor((product.stockQuantity || 0) / 3));
        }
        
        if (overloadVariation) {
          setOverloadPrice(overloadVariation.price);
          setOverloadStock(overloadVariation.stockQuantity || 0);
        } else {
          setOverloadPrice((product.price || 0) * 1.3);
          setOverloadStock(Math.floor((product.stockQuantity || 0) / 3));
        }
      } else {
        setHasVariations(false);
        setRegularPrice(product.price || 0);
        setRegularStock(product.stockQuantity || 0);
        setMiniPrice((product.price || 0) * 0.7);
        setMiniStock(0);
        setOverloadPrice((product.price || 0) * 1.3);
        setOverloadStock(0);
      }
    }
  }, [product]);

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
    } else if (size === 'mini') {
      setMiniPrice(value);
    } else if (size === 'croffle-overload') {
      setOverloadPrice(value);
    }
  };

  const handleVariationStockChange = (e: React.ChangeEvent<HTMLInputElement>, size: ProductSize) => {
    const value = parseInt(e.target.value) || 0;
    if (size === 'regular') {
      setRegularStock(value);
    } else if (size === 'mini') {
      setMiniStock(value);
    } else if (size === 'croffle-overload') {
      setOverloadStock(value);
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
        product_id: productId!,
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
      
      // Set the price based on the regular size price
      const productData = {
        ...formData,
        storeId: currentStore.id,
        image: imageUrl,
        price: regularPrice // Use regular variation price as the base product price
      };
      
      let savedProduct: Product | null = null;
      
      if (isEditing && productId) {
        savedProduct = await updateProduct(productId, productData);
      } else {
        savedProduct = await createProduct(productData as Omit<Product, "id">);
      }
      
      // Create variations if hasVariations is checked
      if (savedProduct && hasVariations) {
        try {
          // Create Regular size variation
          await createProductVariation({
            product_id: savedProduct.id,
            name: `${savedProduct.name} Regular`,
            price: regularPrice,
            stock_quantity: regularStock,
            is_active: true,
            sku: `${savedProduct.sku}-REG`,
            size: 'regular' as ProductSize
          });
          
          // Create Mini size variation
          await createProductVariation({
            product_id: savedProduct.id,
            name: `${savedProduct.name} Mini`,
            price: miniPrice,
            stock_quantity: miniStock,
            is_active: true,
            sku: `${savedProduct.sku}-MINI`,
            size: 'mini' as ProductSize
          });
          
          // Create Croffle Overload variation
          await createProductVariation({
            product_id: savedProduct.id,
            name: `${savedProduct.name} Croffle Overload`,
            price: overloadPrice,
            stock_quantity: overloadStock,
            is_active: true,
            sku: `${savedProduct.sku}-OVR`,
            size: 'croffle-overload' as ProductSize
          });
          
          toast.success("Size variations added");
        } catch (error) {
          console.error("Error creating variations:", error);
          toast.error("Failed to create size variations");
        }
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
  
  return {
    formData,
    imagePreview,
    isSubmitting,
    activeTab,
    hasVariations,
    regularPrice,
    miniPrice,
    overloadPrice,
    regularStock,
    miniStock,
    overloadStock,
    stockAdjustment,
    isAdjustmentDialogOpen,
    handleInputChange,
    handleCheckboxChange,
    handleSelectChange,
    handleImageChange,
    handleRemoveImage,
    handleVariationPriceChange,
    handleVariationStockChange,
    handleAdjustStock,
    handleStockAdjustmentInputChange,
    handleSaveStockAdjustment,
    handleSubmit,
    setIsAdjustmentDialogOpen,
  };
};
