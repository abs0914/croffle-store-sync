
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileDown, FileUp, Plus, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InventoryHeaderProps {
  onExportCSV: () => void;
  onImportClick: () => void;
  onDownloadTemplate: () => void;
}

export const InventoryHeader = ({
  onExportCSV,
  onImportClick,
  onDownloadTemplate,
}: InventoryHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold text-croffle-primary">Inventory Management</h1>
      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Export/Import
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Data Management</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExportCSV}>
              <FileDown className="mr-2 h-4 w-4" />
              Export Products
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onImportClick}>
              <FileUp className="mr-2 h-4 w-4" />
              Import Products
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Import Template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button asChild>
          <Link to="/inventory/product/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>
    </div>
  );
};
