import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Product } from "@/types/product";
interface MiniCroffleComboDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onNext: (customization: {
    sauce: string;
    toppings: string[];
    price: number;
    customizedProduct: Product;
  }) => void;
  onBack: () => void;
}
const SAUCE_OPTIONS = [{
  id: "chocolate",
  name: "Chocolate",
  price: 0
}, {
  id: "caramel",
  name: "Caramel",
  price: 0
}, {
  id: "tiramisu",
  name: "Tiramisu",
  price: 0
}];
const TOPPING_OPTIONS = [{
  id: "colored_sprinkles",
  name: "Colored Sprinkles",
  price: 0
}, {
  id: "marshmallow",
  name: "Marshmallow",
  price: 0
}, {
  id: "chocolate_flakes",
  name: "Chocolate Flakes",
  price: 0
}, {
  id: "peanuts",
  name: "Peanuts",
  price: 0
}];
export function MiniCroffleComboDialog({
  open,
  onOpenChange,
  product,
  onNext,
  onBack
}: MiniCroffleComboDialogProps) {
  const [selectedSauce, setSelectedSauce] = useState<string>("chocolate");
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const handleToppingChange = (toppingId: string, checked: boolean) => {
    if (checked) {
      setSelectedToppings(prev => [...prev, toppingId]);
    } else {
      setSelectedToppings(prev => prev.filter(id => id !== toppingId));
    }
  };
  const calculateTotalPrice = () => {
    // Fixed prices based on product type
    if (product.name.toLowerCase().includes('mini')) {
      return 65;
    } else if (product.name.toLowerCase().includes('overload')) {
      return 99;
    }
    return product.price; // fallback
  };
  const getSelectedSauceName = () => {
    const sauce = SAUCE_OPTIONS.find(s => s.id === selectedSauce);
    return sauce?.name || "Chocolate";
  };
  const getSelectedToppingsNames = () => {
    return selectedToppings.map(id => {
      const topping = TOPPING_OPTIONS.find(t => t.id === id);
      return topping?.name || id;
    });
  };
  const handleNext = () => {
    const customization = {
      sauce: selectedSauce,
      toppings: selectedToppings,
      price: calculateTotalPrice(),
      customizedProduct: {
        ...product,
        name: `${product.name} (${getSelectedSauceName()})`,
        price: calculateTotalPrice(),
        customization: {
          sauce: getSelectedSauceName(),
          toppings: getSelectedToppingsNames()
        }
      }
    };
    onNext(customization);
  };
  const reset = () => {
    setSelectedSauce("chocolate");
    setSelectedToppings([]);
  };
  const handleClose = () => {
    reset();
    onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Customize {product.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Mix and match selections are no additional charge
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sauce Selection (Required) */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Sauce Selection <span className="text-destructive">*</span>
            </Label>
            <RadioGroup value={selectedSauce} onValueChange={setSelectedSauce} className="space-y-2">
              {SAUCE_OPTIONS.map(sauce => <div key={sauce.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={sauce.id} id={sauce.id} />
                  <Label htmlFor={sauce.id} className="flex-1 cursor-pointer">
                    {sauce.name}
                  </Label>
                </div>)}
            </RadioGroup>
          </div>

          <Separator />

          {/* Toppings Selection (Optional - Mini Croffle only) */}
          {product.name.toLowerCase().includes('mini') && (
            <div>
              <Label className="text-base font-medium mb-3 block">
                Toppings Selection 
              </Label>
              <div className="space-y-3">
                {TOPPING_OPTIONS.map(topping => <div key={topping.id} className="flex items-center space-x-2">
                    <Checkbox id={topping.id} checked={selectedToppings.includes(topping.id)} onCheckedChange={checked => handleToppingChange(topping.id, checked as boolean)} />
                    <Label htmlFor={topping.id} className="cursor-pointer">
                      {topping.name}
                    </Label>
                  </div>)}
              </div>
            </div>
          )}

          <Separator />

          {/* Order Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Order Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{product.name} ({getSelectedSauceName()})</span>
                <span>₱{calculateTotalPrice()}</span>
              </div>
              {selectedToppings.length > 0 && <div className="space-y-1">
                  {selectedToppings.map(toppingId => {
                const topping = TOPPING_OPTIONS.find(t => t.id === toppingId);
                return <div key={toppingId} className="flex justify-between text-muted-foreground">
                        <span>+ {topping?.name}</span>
                        <span>No charge</span>
                      </div>;
              })}
                </div>}
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>₱{calculateTotalPrice()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          
          <Button onClick={handleNext} className="min-w-24">
            Next
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
}