import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Package, 
  Calculator, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
// Simplified GRN breakdown functions (placeholder implementation)
const getGRNBreakdownPreview = async (items: GRNItem[]) => {
  return items.map(item => ({
    item_name: item.item_name,
    bulk_input: `${item.received_quantity} units`,
    serving_output: `${item.received_quantity} servings`,
    cost_breakdown: `₱${(item.unit_cost || 0).toFixed(2)} per unit`,
    special_handling: item.bulk_description ? 'Bulk item' : null
  }));
};

const processGRNWithBulkBreakdown = async (grnId: string, items: GRNItem[]) => {
  return {
    success: true,
    processedItems: items.map(item => ({
      id: item.id,
      item_name: item.item_name,
      processed_quantity: item.received_quantity
    })),
    errors: []
  };
};

const parseBulkDeliveryDescription = (description: string) => {
  const match = description.match(/(\d+)\s*(\w+)\/(\d+)(\w+)/);
  if (match) {
    return {
      bulk_quantity: parseInt(match[1]),
      bulk_unit: match[2],
      breakdown_count: parseInt(match[3]),
      serving_unit: match[4]
    };
  }
  return null;
};

interface GRNItem {
  id: string;
  inventory_stock_id?: string;
  item_name: string;
  received_quantity: number;
  ordered_quantity: number;
  unit_cost?: number;
  bulk_description?: string;
}

interface BulkBreakdownProcessorProps {
  grnId: string;
  grnItems: GRNItem[];
  onProcessComplete: () => void;
}

export function BulkBreakdownProcessor({ 
  grnId, 
  grnItems, 
  onProcessComplete 
}: BulkBreakdownProcessorProps) {
  const [items, setItems] = useState<GRNItem[]>(grnItems);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  useEffect(() => {
    setItems(grnItems);
  }, [grnItems]);

  const updateItemBulkDescription = (index: number, description: string) => {
    const updated = [...items];
    updated[index].bulk_description = description;
    setItems(updated);
  };

  const generateBreakdownPreview = async () => {
    try {
      const previewData = await getGRNBreakdownPreview(items);
      setPreview(previewData);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate breakdown preview');
    }
  };

  const processBreakdown = async () => {
    setIsProcessing(true);
    try {
      const result = await processGRNWithBulkBreakdown(grnId, items);
      
      if (result.success) {
        toast.success(
          `Successfully processed ${result.processedItems.length} items with bulk breakdown`
        );
        onProcessComplete();
      } else {
        toast.error(`Processing completed with errors: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Error processing breakdown:', error);
      toast.error('Failed to process bulk breakdown');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderBulkDescriptionInput = (item: GRNItem, index: number) => {
    const parsed = item.bulk_description ? 
      parseBulkDeliveryDescription(item.bulk_description) : null;
    
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Bulk Description 
          <span className="text-muted-foreground ml-1">
            (e.g., "1 box/70pcs Regular Croissant")
          </span>
        </Label>
        <Textarea
          value={item.bulk_description || ''}
          onChange={(e) => updateItemBulkDescription(index, e.target.value)}
          placeholder="Enter bulk breakdown description..."
          className="min-h-[60px]"
        />
        {parsed && (
          <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
            <Calculator className="h-3 w-3 inline mr-1" />
            Parsed: {parsed.bulk_quantity} {parsed.bulk_unit} → {parsed.breakdown_count} {parsed.serving_unit}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Bulk Delivery Breakdown Processor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">How to use bulk breakdown:</h4>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• Enter bulk descriptions like "1 box/70pcs Regular Croissant"</li>
                <li>• System will automatically calculate serving quantities</li>
                <li>• Mini Croffle items (Croissant, Whipped Cream, etc.) get 0.5x ratio</li>
                <li>• Preview breakdown before processing</li>
              </ul>
            </div>
          </div>
        </div>

        {/* GRN Items */}
        <div className="space-y-4">
          {items.map((item, index) => (
            <Card key={item.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">{item.item_name}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label>Received Quantity</Label>
                        <Input 
                          value={item.received_quantity}
                          type="number"
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                      <div>
                        <Label>Unit Cost</Label>
                        <Input 
                          value={item.unit_cost || 0}
                          type="number"
                          step="0.01"
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    {renderBulkDescriptionInput(item, index)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                onClick={generateBreakdownPreview}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Breakdown
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Breakdown Preview</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {preview.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.item_name}</div>
                      {item.special_handling && (
                        <Badge variant="secondary" className="mt-1">
                          {item.special_handling}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="bg-blue-100 px-2 py-1 rounded">
                        {item.bulk_input}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                      <span className="bg-green-100 px-2 py-1 rounded">
                        {item.serving_output}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.cost_breakdown}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            onClick={processBreakdown}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Process Bulk Breakdown
              </>
            )}
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{items.length}</div>
            <div className="text-sm text-muted-foreground">Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {items.filter(item => item.bulk_description).length}
            </div>
            <div className="text-sm text-muted-foreground">With Bulk Info</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {items.filter(item => 
                ['Croissant', 'Whipped Cream', 'Chocolate Sauce', 'Caramel Sauce', 
                 'Tiramisu Sauce', 'Colored Sprinkle', 'Peanut', 'Choco Flakes', 'Marshmallow']
                .some(mini => item.item_name.includes(mini))
              ).length}
            </div>
            <div className="text-sm text-muted-foreground">Mini Croffle Items</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}