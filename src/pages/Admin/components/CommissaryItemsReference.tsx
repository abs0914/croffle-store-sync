
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Download } from 'lucide-react';
import { fetchCommissaryInventory } from '@/services/inventoryManagement/commissaryInventoryService';
import { CommissaryInventoryItem } from '@/types/inventoryManagement';
import { toast } from 'sonner';

export const CommissaryItemsReference: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [commissaryItems, setCommissaryItems] = useState<CommissaryInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommissaryItems();
  }, []);

  const loadCommissaryItems = async () => {
    try {
      setLoading(true);
      const items = await fetchCommissaryInventory();
      setCommissaryItems(items);
    } catch (error) {
      console.error('Error loading commissary items:', error);
      toast.error('Failed to load commissary items');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = commissaryItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const downloadReference = () => {
    const csvContent = [
      'Item Name,Category,Unit,Current Stock,Unit Cost',
      ...commissaryItems.map(item => 
        `"${item.name}","${item.category}","${item.unit}",${item.current_stock},${item.unit_cost || 0}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'commissary_items_reference.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Reference file downloaded');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading commissary items...</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Available Commissary Items ({commissaryItems.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Use these exact names in your recipe CSV files
            </p>
          </div>
          <Button onClick={downloadReference} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download Reference
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1">
                <h4 className="font-medium">{item.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {item.category.replace('_', ' ')} • {item.unit} • Stock: {item.current_stock}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  ₱{(item.unit_cost || 0).toFixed(2)}/{item.unit}
                </Badge>
                {item.current_stock > 0 ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Available
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    Out of Stock
                  </Badge>
                )}
              </div>
            </div>
          ))}
          
          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No items found matching your search.' : 'No commissary items found.'}
            </div>
          )}
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Recipe Upload Tips:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use the exact item names shown above in your CSV</li>
            <li>• Names are case-sensitive and must match exactly</li>
            <li>• Download the reference file to see all available items</li>
            <li>• Check that items have sufficient stock if needed</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
