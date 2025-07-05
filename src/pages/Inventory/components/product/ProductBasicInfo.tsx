
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FormDescription } from "@/components/ui/form";
import { Category } from "@/types";
import { InventoryStock } from "@/types/inventory";
import { StockAdjustmentButton } from "./StockAdjustmentButton";
import { ProductTypeSelector } from "./ProductTypeSelector";
import { DirectInventorySelector } from "./DirectInventorySelector";

interface ProductBasicInfoProps {
  formData: any;
  hasVariations: boolean;
  categories: Category[];
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  handleAdjustStock?: () => void;
}

export const ProductBasicInfo = ({
  formData,
  hasVariations,
  categories,
  handleInputChange,
  handleCheckboxChange,
  handleSelectChange,
  handleAdjustStock
}: ProductBasicInfoProps) => {
  // Filter out "Desserts" category if it exists
  const filteredCategories = categories.filter(
    category => category.name.toLowerCase() !== "desserts"
  );

  const productType = formData.product_type || null;
  const isDirectProduct = productType === 'direct';
  const isRecipeProduct = productType === 'recipe';

  const handleProductTypeChange = (type: 'recipe' | 'direct') => {
    handleSelectChange('product_type', type);
    // Reset product-type specific fields when switching
    if (type === 'direct') {
      handleSelectChange('inventory_stock_id', '');
      handleSelectChange('selling_quantity', '1');
    } else {
      handleSelectChange('inventory_stock_id', '');
      handleSelectChange('selling_quantity', '');
    }
  };

  const handleInventoryStockChange = (stockId: string | null, stockItem: InventoryStock | null) => {
    handleSelectChange('inventory_stock_id', stockId || '');
    // Auto-populate cost from inventory stock if available
    if (stockItem?.cost) {
      handleSelectChange('cost', stockItem.cost.toString());
    }
  };

  const handleSellingQuantityChange = (quantity: number) => {
    handleSelectChange('selling_quantity', quantity.toString());
  };
  
  return (
    <div className="space-y-8">
      {/* Product Type Selection */}
      <ProductTypeSelector
        productType={productType}
        onProductTypeChange={handleProductTypeChange}
        disabled={false}
      />

      {/* Basic Product Information - Always visible */}
      {productType && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name || ""}
                onChange={handleInputChange}
                placeholder="Enter product name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                name="sku"
                value={formData.sku || ""}
                onChange={handleInputChange}
                placeholder="Enter product SKU"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <Select
                value={formData.categoryId || "uncategorized"}
                onValueChange={(value) => handleSelectChange("categoryId", value)}
              >
                <SelectTrigger id="categoryId">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {filteredCategories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filteredCategories.length === 0 && (
                <FormDescription>
                  No categories found. You can create categories from the Categories page.
                </FormDescription>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode (optional)</Label>
              <Input
                id="barcode"
                name="barcode"
                value={formData.barcode || ""}
                onChange={handleInputChange}
                placeholder="Enter barcode"
              />
            </div>
          </div>

          {/* Direct Inventory Product Configuration */}
          {isDirectProduct && (
            <DirectInventorySelector
              selectedInventoryStockId={formData.inventory_stock_id || null}
              onInventoryStockChange={handleInventoryStockChange}
              sellingQuantity={parseFloat(formData.selling_quantity) || 1}
              onSellingQuantityChange={handleSellingQuantityChange}
              formData={formData}
            />
          )}
          
          {/* Pricing and Cost */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!hasVariations && (
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  value={formData.price || 0}
                  onChange={handleInputChange}
                  min={0}
                  step={0.01}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="cost">Cost {isDirectProduct ? '(from inventory)' : '(optional)'}</Label>
              <Input
                id="cost"
                name="cost"
                type="number"
                value={formData.cost || 0}
                onChange={handleInputChange}
                min={0}
                step={0.01}
                readOnly={isDirectProduct}
                className={isDirectProduct ? 'bg-muted' : ''}
              />
              {isDirectProduct && (
                <FormDescription>
                  Cost is automatically populated from the selected inventory item
                </FormDescription>
              )}
            </div>
          </div>
          
          {/* Stock Quantity - Only for recipe products or when variations disabled */}
          {!hasVariations && isRecipeProduct && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="stockQuantity">Stock Quantity</Label>
                {handleAdjustStock && (
                  <StockAdjustmentButton onClick={handleAdjustStock} />
                )}
              </div>
              <Input
                id="stockQuantity"
                name="stockQuantity"
                type="number"
                value={formData.stockQuantity || 0}
                onChange={handleInputChange}
                min={0}
                step={1}
              />
            </div>
          )}

          {/* Stock information for direct products */}
          {isDirectProduct && formData.inventory_stock_id && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <FormDescription>
                <strong>Stock Management:</strong> This product's availability is automatically managed 
                based on the selected inventory item. When customers purchase this product, 
                the corresponding amount will be deducted from your store inventory.
              </FormDescription>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description || ""}
              onChange={handleInputChange}
              placeholder="Enter product description"
              rows={4}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleSelectChange("isActive", checked.toString())}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
          
          {/* Size Variations - Only for recipe products */}
          {isRecipeProduct && (
            <div className="flex items-center space-x-2">
              <Switch
                id="hasVariations"
                name="hasVariations"
                checked={hasVariations}
                onCheckedChange={(checked) => {
                  const event = {
                    target: { name: "hasVariations", checked }
                  } as React.ChangeEvent<HTMLInputElement>;
                  handleCheckboxChange(event);
                }}
              />
              <Label htmlFor="hasVariations">Has Size Variations</Label>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
