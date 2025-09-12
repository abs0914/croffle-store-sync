import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface AddonOption {
  id: string;
  name: string;
  price?: number;
  group: string;
  isAvailable: boolean;
}

interface AddonSelectorProps {
  addons: AddonOption[];
  selectedAddons: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  maxSelections?: number;
  groupName?: string;
}

export const AddonSelector: React.FC<AddonSelectorProps> = ({
  addons,
  selectedAddons,
  onSelectionChange,
  maxSelections,
  groupName = "Add-ons"
}) => {
  if (addons.length === 0) return null;

  const handleAddonToggle = (addonId: string) => {
    const isSelected = selectedAddons.includes(addonId);
    
    if (isSelected) {
      // Remove addon
      onSelectionChange(selectedAddons.filter(id => id !== addonId));
    } else {
      // Add addon (respect max selections)
      if (!maxSelections || selectedAddons.length < maxSelections) {
        onSelectionChange([...selectedAddons, addonId]);
      }
    }
  };

  const groupedAddons = addons.reduce((groups, addon) => {
    const group = addon.group || 'Other';
    if (!groups[group]) groups[group] = [];
    groups[group].push(addon);
    return groups;
  }, {} as Record<string, AddonOption[]>);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          {groupName}
          {maxSelections && (
            <Badge variant="outline" className="ml-2">
              {selectedAddons.length}/{maxSelections}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(groupedAddons).map(([group, groupAddons]) => (
            <div key={group} className="space-y-2">
              {Object.keys(groupedAddons).length > 1 && (
                <h4 className="text-sm font-medium text-muted-foreground capitalize">
                  {group}
                </h4>
              )}
              <div className="space-y-2">
                {groupAddons.map(addon => (
                  <div 
                    key={addon.id}
                    className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${
                      addon.isAvailable 
                        ? 'hover:bg-accent cursor-pointer' 
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => addon.isAvailable && handleAddonToggle(addon.id)}
                  >
                    <Checkbox
                      checked={selectedAddons.includes(addon.id)}
                      disabled={
                        !addon.isAvailable ||
                        (!selectedAddons.includes(addon.id) && maxSelections && selectedAddons.length >= maxSelections)
                      }
                      className="pointer-events-none"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {addon.name}
                        </span>
                        {addon.price && addon.price > 0 && (
                          <span className="text-sm text-muted-foreground ml-2">
                            +₱{addon.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {!addon.isAvailable && (
                        <span className="text-xs text-destructive">
                          Out of stock
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};