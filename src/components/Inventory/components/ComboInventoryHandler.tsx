
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Coffee, 
  Plus, 
  Minus, 
  CheckCircle, 
  XCircle,
  Calculator,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { realTimeAvailabilityService, ComboAvailabilityCheck } from '@/services/inventory/realTimeAvailabilityService';
import { toast } from 'sonner';

// Predefined combo configurations
const COMBO_CONFIGURATIONS = {
  'Mini Croffle + Hot Espresso': {
    price: 110,
    items: [
      { itemName: 'Mini Croffle', quantity: 1, price: 65 },
      { itemName: 'Americano', quantity: 1, price: 65 }
    ]
  },
  'Mini Croffle + Iced Espresso': {
    price: 115,
    items: [
      { itemName: 'Mini Croffle', quantity: 1, price: 65 },
      { itemName: 'Americano', quantity: 1, price: 70 }
    ]
  },
  'Regular Croffle + Hot Espresso': {
    price: 170,
    items: [
      { itemName: 'Tiramisu Croffle', quantity: 1, price: 125 },
      { itemName: 'Cappuccino', quantity: 1, price: 75 }
    ]
  },
  'Regular Croffle + Iced Espresso': {
    price: 175,
    items: [
      { itemName: 'Tiramisu Croffle', quantity: 1, price: 125 },
      { itemName: 'Cappuccino', quantity: 1, price: 80 }
    ]
  }
};

export const ComboInventoryHandler: React.FC = () => {
  const { user } = useAuth();
  const [selectedCombo, setSelectedCombo] = useState<string>('');
  const [quantityNeeded, setQuantityNeeded] = useState<number>(1);
  const [comboAvailability, setComboAvailability] = useState<ComboAvailabilityCheck | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const storeId = user?.storeIds?.[0] || '';

  const checkComboAvailability = async () => {
    if (!selectedCombo || !storeId) return;

    setIsChecking(true);
    try {
      const comboConfig = COMBO_CONFIGURATIONS[selectedCombo as keyof typeof COMBO_CONFIGURATIONS];
      if (!comboConfig) {
        toast.error('Invalid combo selection');
        return;
      }

      const availability = await realTimeAvailabilityService.checkComboAvailability(
        selectedCombo,
        comboConfig.items,
        storeId,
        quantityNeeded
      );

      setComboAvailability(availability);
    } catch (error) {
      console.error('Error checking combo availability:', error);
      toast.error('Failed to check combo availability');
    } finally {
      setIsChecking(false);
    }
  };

  const processComboSale = async () => {
    if (!comboAvailability?.isComboAvailable || !selectedCombo) {
      toast.error('Combo is not available for sale');
      return;
    }

    try {
      const comboConfig = COMBO_CONFIGURATIONS[selectedCombo as keyof typeof COMBO_CONFIGURATIONS];
      const transactionId = `combo-${Date.now()}`;

      // Process each item in the combo
      for (const item of comboConfig.items) {
        const success = await realTimeAvailabilityService.deductInventoryForSale(
          item.itemName,
          storeId,
          item.quantity * quantityNeeded,
          transactionId,
          user?.id || ''
        );

        if (!success) {
          toast.error(`Failed to process ${item.itemName} for combo sale`);
          return;
        }
      }

      toast.success(`Combo sale processed successfully! (${quantityNeeded} units)`);
      
      // Refresh availability after sale
      await checkComboAvailability();
    } catch (error) {
      console.error('Error processing combo sale:', error);
      toast.error('Failed to process combo sale');
    }
  };

  const getSavingsAmount = () => {
    if (!selectedCombo) return 0;
    
    const comboConfig = COMBO_CONFIGURATIONS[selectedCombo as keyof typeof COMBO_CONFIGURATIONS];
    const individualTotal = comboConfig.items.reduce((sum, item) => sum + item.price, 0);
    return individualTotal - comboConfig.price;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Combo Inventory Handler</h3>
        <p className="text-sm text-muted-foreground">
          Check availability and process combo orders with complex inventory deductions
        </p>
      </div>

      {/* Combo Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Combo Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Combo</Label>
              <Select value={selectedCombo} onValueChange={setSelectedCombo}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a combo..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(COMBO_CONFIGURATIONS).map((combo) => (
                    <SelectItem key={combo} value={combo}>
                      {combo} - ₱{COMBO_CONFIGURATIONS[combo as keyof typeof COMBO_CONFIGURATIONS].price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity Needed</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantityNeeded(Math.max(1, quantityNeeded - 1))}
                  disabled={quantityNeeded <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={quantityNeeded}
                  onChange={(e) => setQuantityNeeded(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center"
                  min="1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantityNeeded(quantityNeeded + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {selectedCombo && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Combo Details:</h4>
              <div className="space-y-2">
                {COMBO_CONFIGURATIONS[selectedCombo as keyof typeof COMBO_CONFIGURATIONS].items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{item.quantity}x {item.itemName}</span>
                    <span className="text-sm text-muted-foreground">₱{item.price}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-center font-medium">
                  <span>Combo Price:</span>
                  <span className="text-green-600">₱{COMBO_CONFIGURATIONS[selectedCombo as keyof typeof COMBO_CONFIGURATIONS].price}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>You Save:</span>
                  <span className="text-blue-600">₱{getSavingsAmount()}</span>
                </div>
              </div>
            </div>
          )}

          <Button 
            onClick={checkComboAvailability}
            disabled={!selectedCombo || isChecking}
            className="w-full"
          >
            <Calculator className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            Check Availability
          </Button>
        </CardContent>
      </Card>

      {/* Availability Results */}
      {comboAvailability && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {comboAvailability.isComboAvailable ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Availability Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Combo Available:</span>
              <Badge variant={comboAvailability.isComboAvailable ? "default" : "destructive"}>
                {comboAvailability.isComboAvailable ? 'Yes' : 'No'}
              </Badge>
            </div>

            {comboAvailability.isComboAvailable && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Max Quantity:</span>
                <span className="text-lg font-bold text-green-600">
                  {comboAvailability.maxComboQuantity}
                </span>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-medium">Individual Item Status:</h4>
              {comboAvailability.comboItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    {item.isAvailable ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">{item.itemName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Max: {item.maxQuantity}</span>
                    <Badge variant={item.isAvailable ? "secondary" : "destructive"} className="text-xs">
                      {item.isAvailable ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Total Cost:</span>
                <span className="text-lg font-bold">₱{comboAvailability.totalCost.toFixed(2)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Profit Margin:</span>
                <span className={`text-lg font-bold ${
                  comboAvailability.profitMargin > 50 ? 'text-green-600' : 
                  comboAvailability.profitMargin < 30 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {comboAvailability.profitMargin.toFixed(1)}%
                </span>
              </div>
            </div>

            {comboAvailability.isComboAvailable ? (
              <Button onClick={processComboSale} className="w-full bg-green-600 hover:bg-green-700">
                <Coffee className="h-4 w-4 mr-2" />
                Process Combo Sale ({quantityNeeded} units)
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">
                  Cannot process sale - insufficient inventory for one or more items
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
