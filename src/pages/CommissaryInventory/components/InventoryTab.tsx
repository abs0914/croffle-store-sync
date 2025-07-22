
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
    let filteredItems = items;

    // Filter by search term
    if (filters.search) {
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Filter by item type
    if (filters.item_type && filters.item_type !== 'all') {
      filteredItems = filteredItems.filter(item => item.item_type === filters.item_type);
    }

    // Filter by category
    if (filters.category && filters.category !== 'all') {
      filteredItems = filteredItems.filter(item => item.category === filters.category);
    }

    // Filter by stock level
    if (filters.stockLevel && filters.stockLevel !== 'all') {
      filteredItems = filteredItems.filter(item => {
        switch (filters.stockLevel) {
          case 'good':
            return item.current_stock > item.minimum_threshold;
          case 'low':
            return item.current_stock <= item.minimum_threshold && item.current_stock > 0;
          case 'out':
            return item.current_stock <= 0;
          default:
            return true;
        }
      });
    }

    // Filter by supplier
    if (filters.supplier) {
      filteredItems = filteredItems.filter(item => item.supplier_id === filters.supplier);
    }

    // Filter by expiring status
    if (filters.expiring && filters.expiring !== 'all') {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      filteredItems = filteredItems.filter(item => {
        if (!item.expiry_date) return filters.expiring !== 'expiring_soon' && filters.expiring !== 'expired';
        
        const expiryDate = new Date(item.expiry_date);
        
        switch (filters.expiring) {
          case 'expiring_soon':
            return expiryDate <= thirtyDaysFromNow && expiryDate > today;
          case 'expired':
            return expiryDate <= today;
          default:
            return true;
        }
      });
    }

    // Sort items
    const sortBy = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder || 'asc';
    
    filteredItems.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'stock':
          aValue = a.current_stock;
          bValue = b.current_stock;
          break;
        case 'expiry_date':
          aValue = a.expiry_date ? new Date(a.expiry_date).getTime() : 0;
          bValue = b.expiry_date ? new Date(b.expiry_date).getTime() : 0;
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
          break;
        default: // name
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filteredItems;
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
