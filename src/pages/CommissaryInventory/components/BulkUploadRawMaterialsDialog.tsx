
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Package, AlertTriangle } from "lucide-react";
import { uploadRawMaterialsData } from "@/services/commissary/bulkUploadService";
import { RAW_MATERIALS_DATA } from "@/services/commissary/rawMaterialsData";

interface BulkUploadRawMaterialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkUploadRawMaterialsDialog({
  open,
  onOpenChange,
  onSuccess
}: BulkUploadRawMaterialsDialogProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    setUploading(true);
    const success = await uploadRawMaterialsData();
    
    if (success) {
      onSuccess();
      onOpenChange(false);
    }
    
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Upload Raw Materials
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Ready to Upload</span>
            </div>
            <p className="text-sm text-blue-700">
              This will upload {RAW_MATERIALS_DATA.length} raw materials based on your production requirements.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Items to be uploaded:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {RAW_MATERIALS_DATA.map((item, index) => (
                <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-gray-600">{item.uom} - ₱{item.unit_cost}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-800">Important</span>
            </div>
            <p className="text-sm text-amber-700">
              This will add all raw materials to your commissary inventory. 
              Make sure your current inventory is clean before proceeding.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="bg-croffle-accent hover:bg-croffle-accent/90"
            >
              {uploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Raw Materials
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
