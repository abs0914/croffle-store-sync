
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Import, Upload } from "lucide-react";
import { Link } from "react-router-dom";

interface InventoryHeaderProps {
  title: string;
  description?: string;
  onExportCSV?: () => void;
  onImportClick?: () => void;
  onDownloadTemplate?: () => void;
}

const InventoryHeader = ({ 
  title, 
  description,
  onExportCSV,
  onImportClick,
  onDownloadTemplate
}: InventoryHeaderProps) => {
  // Determine if we should show action buttons (only when handlers are provided)
  const showActions = onExportCSV || onImportClick || onDownloadTemplate;
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-croffle-primary">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {showActions && (
          <div className="flex space-x-2">
            {onDownloadTemplate && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={onDownloadTemplate}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Template</span>
              </Button>
            )}
            {onImportClick && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={onImportClick}
              >
                <Import className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </Button>
            )}
            {onExportCSV && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={onExportCSV}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}
            <Button size="sm" asChild>
              <Link to="/inventory/product/new">Add Product</Link>
            </Button>
          </div>
        )}
      </div>
      <Separator className="mt-4 bg-croffle-primary/20" />
    </div>
  );
};

export default InventoryHeader;
