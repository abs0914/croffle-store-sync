import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X } from 'lucide-react';
import { EnhancedProductCatalog } from '@/services/productCatalog/enhancedCatalogService';
import { Category } from '@/types';
import { updateProduct } from '@/services/productCatalog/productCatalogService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductEditDialogProps {
  product: EnhancedProductCatalog | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  categories: Category[];
}

export function ProductEditDialog({ 
  product, 
  isOpen, 
  onClose, 
  onUpdate, 
  categories 
}: ProductEditDialogProps) {
  const [formData, setFormData] = useState({
    product_name: product?.product_name || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    category_id: product?.category_id || '',
    image_url: product?.image_url || ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(product?.image_url || '');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (product) {
      setFormData({
        product_name: product.product_name || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        category_id: product.category_id || '',
        image_url: product.image_url || ''
      });
      setImagePreview(product.image_url || '');
    }
  }, [product]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${product?.id}-${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      console.log('🖼️ Uploading image to storage:', filePath);

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('❌ Storage upload error:', error);
        throw error;
      }

      // Get the public URL for the uploaded image
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      console.log('✅ Image uploaded successfully:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setIsLoading(true);
    try {
      let imageUrl = formData.image_url;

      // Upload new image if selected
      if (imageFile) {
        console.log('🖼️ New image file detected, uploading to storage...');
        const uploadedUrl = await uploadImageToStorage(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
          console.log('✅ Image uploaded, new URL:', uploadedUrl);
        } else {
          toast.error('Failed to upload image. Proceeding without image update.');
        }
      }

      const updates = {
        product_name: formData.product_name,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        category_id: formData.category_id || null,
        image_url: imageUrl
      };

      console.log('📝 Updating product with:', updates);
      await updateProduct(product.id, updates);
      toast.success('Product updated successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    } finally {
      setIsLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Image */}
          <div className="space-y-2">
            <Label>Product Image</Label>
            <div className="flex flex-col items-center gap-4">
              {imagePreview ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="product_name">Product Name</Label>
            <Input
              id="product_name"
              value={formData.product_name}
              onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
