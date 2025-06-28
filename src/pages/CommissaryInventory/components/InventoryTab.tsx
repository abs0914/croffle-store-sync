
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Plus, Box, Archive } from "lucide-react";
import { CommissaryInventoryItem, CommissaryInventoryFilters } from "@/types/inventoryManagement";
import { InventoryItemCard } from "./InventoryItemCard";

interface InventoryTabProps {
  items: CommissaryInventoryItem[];
  loading: boolean;
  filters: CommissaryInventoryFilters;
  onAddItem: () => void;
  onEditItem: (item: CommissaryInventoryItem) => void;
  onStockAdjustment: (item: CommissaryInventoryItem) => void;
  onDeleteItem: (item: CommissaryInventoryItem) => void;
}

export function InventoryTab({
  items,
  loading,
  filters,
  onAddItem,
  onEditItem,
  onStockAdjustment,
  onDeleteItem
}: InventoryTabProps) {
  // Filter items based on current filter selection
  const getFilteredItems = () => {
    switch (filters.item_type) {
      case 'raw_material':
        return items.filter(item => item.item_type === 'raw_material');
      case 'orderable_item':
        return items.filter(item => item.item_type === 'orderable_item');
      default:
        return items; // Show all items
    }
  };

  // Get dynamic content based on filter
  const getHeaderContent = () => {
    switch (filters.item_type) {
      case 'raw_material':
        return {
          title: "Raw Materials",
          description: "Manage raw materials that will be used in conversion processes",
          buttonText: "Add Raw Material",
          icon: Package,
          emptyMessage: "No raw materials found. Add raw materials to begin creating conversion processes."
        };
      case 'orderable_item':
        return {
          title: "Finished Products",
          description: "View and manage finished products created from conversion processes",
          buttonText: "Add Finished Product",
          icon: Box,
          emptyMessage: "No finished products found. Use Production Management to create finished products from raw materials."
        };
      default:
        return {
          title: "All Inventory",
          description: "Manage all commissary inventory items including raw materials and finished products",
          buttonText: "Add Item",
          icon: Archive,
          emptyMessage: "No inventory items found. Add items to get started."
        };
    }
  };

  const filteredItems = getFilteredItems();
  const headerContent = getHeaderContent();
  const HeaderIcon = headerContent.icon;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <HeaderIcon className="h-6 w-6" />
            {headerContent.title}
          </h2>
          <p className="text-muted-foreground">
            {headerContent.description}
          </p>
        </div>
        <Button
          onClick={onAddItem}
          className="bg-croffle-accent hover:bg-croffle-accent/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          {headerContent.buttonText}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeaderIcon className="h-5 w-5" />
            {headerContent.title} Inventory
            {filteredItems.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({filteredItems.length} items)
              </span>
            )}
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
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <HeaderIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                {headerContent.emptyMessage}
              </p>
              <Button 
                onClick={onAddItem}
                className="bg-croffle-accent hover:bg-croffle-accent/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                {headerContent.buttonText}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
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
