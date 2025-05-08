
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FormDescription } from "@/components/ui/form";
import { Category } from "@/types";
import { StockAdjustmentButton } from "./StockAdjustmentButton";

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
  return (
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
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categories.length === 0 && (
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
          <Label htmlFor="cost">Cost (optional)</Label>
          <Input
            id="cost"
            name="cost"
            type="number"
            value={formData.cost || 0}
            onChange={handleInputChange}
            min={0}
            step={0.01}
          />
        </div>
      </div>
      
      {!hasVariations && (
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
    </div>
  );
};
