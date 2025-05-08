
import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface ProductImageUploadProps {
  imagePreview: string | null;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: () => void;
}

export const ProductImageUpload = ({
  imagePreview,
  handleImageChange,
  handleRemoveImage
}: ProductImageUploadProps) => {
  return (
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
  );
};
