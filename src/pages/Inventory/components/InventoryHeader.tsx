
import { Button } from "@/components/ui/button";
import { Download, Upload, FileSpreadsheet, Package } from "lucide-react";

interface InventoryHeaderProps {
  title: string;
  description: string;
  onExportCSV?: () => void;
  onImportClick?: () => void;
  onDownloadTemplate?: () => void;
}

export default function InventoryHeader({ 
  title, 
  description, 
  onExportCSV, 
  onImportClick, 
  onDownloadTemplate 
}: InventoryHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-croffle-accent" />
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground max-w-2xl">{description}</p>
        </div>
      </div>
      
      <div className="flex gap-2">
        {onDownloadTemplate && (
          <Button variant="outline" onClick={onDownloadTemplate}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Template
          </Button>
        )}
        
        {onImportClick && (
          <Button variant="outline" onClick={onImportClick}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        )}
        
        {onExportCSV && (
          <Button variant="outline" onClick={onExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>
    </div>
  );
}
