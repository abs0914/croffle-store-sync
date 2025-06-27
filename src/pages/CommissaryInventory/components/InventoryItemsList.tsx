
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, ExternalLink } from "lucide-react";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { InventoryItemCard } from "./InventoryItemCard";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface InventoryItemsListProps {
  items: CommissaryInventoryItem[];
  loading: boolean;
  onAddItem: () => void;
  onEditItem: (item: CommissaryInventoryItem) => void;
  onStockAdjustment: (item: CommissaryInventoryItem) => void;
  onDeleteItem: (item: CommissaryInventoryItem) => void;
}

export function InventoryItemsList({
  items,
  loading,
  onAddItem,
  onEditItem,
  onStockAdjustment,
  onDeleteItem
}: InventoryItemsListProps) {
  const navigate = useNavigate();

  const handleBulkUploadNavigation = () => {
    navigate('/admin/production-management');
    toast.info('Navigate to the Bulk Upload tab to upload raw materials via CSV');
  };

  return (
    <>
      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <Button
            onClick={onAddItem}
            className="bg-croffle-accent hover:bg-croffle-accent/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Raw Material
          </Button>
        </div>
      </div>

      {/* Inventory Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Materials & Supplies</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                No commissary inventory items found. Upload raw materials through Production Management → Bulk Upload to see them here.
              </p>
              <Button 
                onClick={handleBulkUploadNavigation}
                className="bg-croffle-accent hover:bg-croffle-accent/90"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to Bulk Upload
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <InventoryItemCard
                  key={item.id}
                  item={item}
                  onEdit={onEditItem}
                  onStockAdjustment={onStockAdjustment}
                  onDelete={onDeleteItem}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
