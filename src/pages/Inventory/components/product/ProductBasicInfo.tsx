
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Category } from "@/types";

interface ProductBasicInfoProps {
  formData: any;
  hasVariations: boolean;
  categories: Category[];
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
}

export const ProductBasicInfo = ({
  formData,
  hasVariations,
  categories,
  handleInputChange,
  handleCheckboxChange,
  handleSelectChange
}: ProductBasicInfoProps) => {
  return (
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

      <div className="space-y-2 col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={4}
        />
      </div>
    </div>
  );
};
