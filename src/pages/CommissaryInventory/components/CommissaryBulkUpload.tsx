
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { bulkUploadRawIngredients } from "@/services/commissaryService";
import { parseRawIngredientsCSV } from "@/utils/csvParser";
import { toast } from "sonner";

interface CommissaryBulkUploadProps {
  onSuccess?: () => void;
}

export function CommissaryBulkUpload({ onSuccess }: CommissaryBulkUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast.error('Please select a valid CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    try {
      const text = await file.text();
      const ingredients = parseRawIngredientsCSV(text);
      
      if (ingredients.length === 0) {
        toast.error('No valid ingredients found in the CSV file');
        return;
      }

      const success = await bulkUploadRawIngredients(ingredients);
      if (success) {
        setFile(null);
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error uploading raw ingredients:', error);
      toast.error('Failed to upload raw ingredients');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      'name,category,unit,unit_cost,current_stock,minimum_threshold,supplier_name,sku,storage_location',
      'All-Purpose Flour,raw_materials,kg,0.50,100,20,Flour Supplier Inc,FL001,Storage Room A',
      'Vanilla Extract,raw_materials,ml,0.25,50,10,Flavor Co,VE001,Storage Room B',
      'Food Grade Boxes,packaging_materials,pieces,0.15,200,50,Package Pro,BOX001,Storage Room C'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'commissary_inventory_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Upload Raw Materials
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Upload CSV files to add multiple raw materials to commissary inventory. 
            Download the template to see the required format.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="csv-file">Upload CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>

        {file && (
          <div className="text-sm text-muted-foreground">
            Selected file: {file.name}
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? 'Uploading...' : 'Upload Raw Materials'}
        </Button>
      </CardContent>
    </Card>
  );
}
