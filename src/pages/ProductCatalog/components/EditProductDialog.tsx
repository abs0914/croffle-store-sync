
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Image } from 'lucide-react';
import { updateProduct } from '@/services/productCatalog/productCatalogService';
import { uploadProductImage, deleteProductImage } from '@/services/productCatalog/productImageService';
import { ProductCatalog } from '@/services/productCatalog/types';
import { fetchCategories } from '@/services/category/categoryFetch';
import { Category } from '@/types';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface EditProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: () => void;
  product: ProductCatalog | null;
}

export const EditProductDialog: React.FC<EditProductDialogProps> = ({
  isOpen,
  onClose,
  onProductUpdated,
  product
}) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    price: 0,
    is_available: true,
    display_order: 0,
    category_id: '' as string | null
  });

  // Load categories when dialog opens
  useEffect(() => {
    const loadCategories = async () => {
      if (!user?.storeIds?.[0] || !isOpen) return;
      
      setCategoriesLoading(true);
      try {
        const categoriesData = await fetchCategories(user.storeIds[0]);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading categories:', error);
        toast.error('Failed to load categories');
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, [user?.storeIds, isOpen]);

  useEffect(() => {
    if (product) {
      setFormData({
        product_name: product.product_name,
        description: product.description || '',
        price: product.price,
        is_available: product.is_available,
        display_order: product.display_order,
        category_id: product.category_id || null
      });
      setCurrentImageUrl(null); // Products don't have image_url in the current schema
      setImagePreview(null);
      setSelectedFile(null);
    }
  }, [product]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'display_order' ? parseFloat(value) || 0 : value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setCurrentImageUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setIsSubmitting(true);
    try {
      let imageUrl = currentImageUrl;

      // Handle image upload if a new file is selected
      if (selectedFile) {
        // Delete old image if it exists
        if (currentImageUrl) {
          await deleteProductImage(currentImageUrl);
        }
        
        // Upload new image
        imageUrl = await uploadProductImage(selectedFile, product.id);
      }

      const updates: Partial<ProductCatalog> = {
        product_name: formData.product_name,
        description: formData.description || undefined,
        price: formData.price,
        is_available: formData.is_available,
        display_order: formData.display_order,
        category_id: formData.category_id || null
      };

      const success = await updateProduct(product.id, updates);
      
      if (success) {
        onProductUpdated();
        handleClose();
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setCurrentImageUrl(null);
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="product_name">Product Name *</Label>
                <Input
                  id="product_name"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  name="display_order"
                  type="number"
                  min="0"
                  value={formData.display_order}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id || 'none'}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, category_id: value === 'none' ? null : value }))
                  }
                  disabled={categoriesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_available"
                  checked={formData.is_available}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, is_available: checked }))
                  }
                />
                <Label htmlFor="is_available">Available for sale</Label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Product Image</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  {imagePreview || currentImageUrl ? (
                    <div className="relative">
                      <img
                        src={imagePreview || currentImageUrl || ''}
                        alt="Product preview"
                        className="w-full h-32 object-cover rounded"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Image className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-2">
                        <Label htmlFor="image" className="cursor-pointer">
                          <span className="text-sm text-blue-600 hover:text-blue-500">
                            Upload an image
                          </span>
                          <Input
                            id="image"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Optional product description"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
              Update Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
