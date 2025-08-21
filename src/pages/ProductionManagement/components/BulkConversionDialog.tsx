import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";

interface BulkConversionItem {
  id: string;
  name: string;
  requestedQuantity: number;
  availableStock: number;
  storeName: string;
  priority: 'high' | 'medium' | 'low';
}

interface BulkConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingRequests: BulkConversionItem[];
  onSuccess: () => void;
}

export function BulkConversionDialog({
  open,
  onOpenChange,
  pendingRequests,
  onSuccess
}: BulkConversionDialogProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [conversionQuantities, setConversionQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setConversionQuantities(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  };

  const handleBulkConversion = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to convert');
      return;
    }

    setLoading(true);
    try {
      // Simulate bulk conversion process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Successfully processed ${selectedItems.length} conversions`);
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setSelectedItems([]);
      setConversionQuantities({});
    } catch (error) {
      console.error('Error processing bulk conversion:', error);
      toast.error('Failed to process bulk conversion');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const totalSelected = selectedItems.length;
  const totalRequests = pendingRequests.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bulk Conversion Processing
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Process multiple store requests simultaneously to optimize commissary operations
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {totalRequests} pending requests
              </Badge>
              <Badge variant={totalSelected > 0 ? "default" : "outline"}>
                {totalSelected} selected
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedItems(
                selectedItems.length === totalRequests 
                  ? [] 
                  : pendingRequests.map(item => item.id)
              )}
            >
              {selectedItems.length === totalRequests ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No pending conversion requests found
                </p>
              </div>
            ) : (
              pendingRequests.map((item) => {
                const isSelected = selectedItems.includes(item.id);
                const conversionQty = conversionQuantities[item.id] || item.requestedQuantity;
                
                return (
                  <Card 
                    key={item.id} 
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleSelectItem(item.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                          }`}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{item.name}</h4>
                              <Badge variant={getPriorityColor(item.priority)} className="text-xs">
                                {item.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {item.storeName} • Available: {item.availableStock} units
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-2 text-sm">
                              <span>Requested: {item.requestedQuantity}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span className="font-medium">Convert: {conversionQty}</span>
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`qty-${item.id}`} className="text-xs">
                                Qty:
                              </Label>
                              <Input
                                id={`qty-${item.id}`}
                                type="number"
                                value={conversionQty}
                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-20 h-8"
                                min="1"
                                max={item.availableStock}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {totalSelected > 0 && (
              <span>Processing {totalSelected} item(s)</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkConversion}
              disabled={loading || totalSelected === 0}
            >
              {loading ? 'Processing...' : `Process ${totalSelected} Conversions`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}