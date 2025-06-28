
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Plus } from "lucide-react";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { InventoryItemCard } from "./InventoryItemCard";

interface RawMaterialsTabProps {
  items: CommissaryInventoryItem[];
  loading: boolean;
  onAddItem: () => void;
  onEditItem: (item: CommissaryInventoryItem) => void;
  onStockAdjustment: (item: CommissaryInventoryItem) => void;
  onDeleteItem: (item: CommissaryInventoryItem) => void;
}

export function RawMaterialsTab({
  items,
  loading,
  onAddItem,
  onEditItem,
  onStockAdjustment,
  onDeleteItem
}: RawMaterialsTabProps) {
  // Filter only raw materials
  const rawMaterials = items.filter(item => item.item_type === 'raw_material');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Raw Materials</h2>
          <p className="text-muted-foreground">
            Manage raw materials that will be used in conversion processes
          </p>
        </div>
        <Button
          onClick={onAddItem}
          className="bg-croffle-accent hover:bg-croffle-accent/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Raw Material
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Raw Materials Inventory
          </CardTitle>
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
          ) : rawMaterials.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                No raw materials found. Add raw materials to begin creating conversion processes.
              </p>
              <Button 
                onClick={onAddItem}
                className="bg-croffle-accent hover:bg-croffle-accent/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Raw Material
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {rawMaterials.map((item) => (
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
    </div>
  );
}
