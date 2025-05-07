
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Upload, FileText, AlertTriangle } from "lucide-react";
import { importProductsFromCSV } from "@/services/inventoryService";
import { toast } from "sonner";

interface ImportProductsProps {
  onClose: () => void;
}

export default function ImportProducts({ onClose }: ImportProductsProps) {
  const { currentStore } = useStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file type
      if (!file.name.endsWith('.csv')) {
        toast.error("Please select a CSV file");
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !currentStore) return;
    
    try {
      setIsUploading(true);
      
      const importedCount = await importProductsFromCSV(selectedFile, currentStore.id);
      
      toast.success(`Successfully imported ${importedCount} products`);
      onClose();
    } catch (error: any) {
      console.error("Error importing products:", error);
      toast.error(error.message || "Failed to import products");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = [
      "name,description,price,cost,sku,barcode,category,stock,is_active",
      "Sample Product,A great product description,19.99,10.50,SKU123,733234283467,Electronics,100,true",
      "Another Product,Description here,9.99,5.75,SKU124,,Office Supplies,50,true"
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'sample_products_import.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>Import Products</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-2" />
            <div>
              <h3 className="font-medium text-amber-800">CSV Format Requirements</h3>
              <p className="text-sm text-amber-700 mt-1">
                Your CSV file must include at minimum the columns: name and price. 
                You can download a sample file below for reference.
              </p>
              <Button 
                variant="link" 
                className="p-0 mt-1 h-auto text-amber-800"
                onClick={downloadSampleCSV}
              >
                Download Sample CSV
              </Button>
            </div>
          </div>
        </div>
        
        <Card className="border-dashed border-2">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <div className="mb-4">
              <div className="w-12 h-12 bg-croffle-background rounded-full flex items-center justify-center mx-auto">
                <FileText className="h-6 w-6 text-croffle-primary" />
              </div>
              
              <h3 className="mt-2 text-lg font-medium">Upload CSV File</h3>
              <p className="text-sm text-muted-foreground">
                {selectedFile ? `Selected: ${selectedFile.name}` : "Drag and drop or click to upload"}
              </p>
            </div>
            
            <div className="relative w-full">
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <Button 
                variant="outline" 
                className="w-full"
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onClose} disabled={isUploading}>
          Cancel
        </Button>
        <Button 
          onClick={handleImport}
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Importing...
            </>
          ) : (
            "Import Products"
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
