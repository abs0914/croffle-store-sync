
import { Warehouse, AlertCircle, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadCommissaryInventoryCSV } from "@/services/commissary/commissaryImportExport";
import { toast } from "sonner";

export function CommissaryInventoryHeader() {
  const handleDownload = async () => {
    try {
      await downloadCommissaryInventoryCSV();
      toast.success("Inventory exported successfully");
    } catch (error) {
      console.error("Error downloading inventory:", error);
      toast.error("Failed to export inventory");
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Warehouse className="h-8 w-8 text-croffle-accent" />
          <h1 className="text-3xl font-bold">Commissary Inventory</h1>
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Centralized
          </Badge>
        </div>
        <Button onClick={handleDownload} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export All Items
        </Button>
      </div>
      <p className="text-muted-foreground">
        Manage raw materials and finished products for distribution to stores
      </p>
    </div>
  );
}
