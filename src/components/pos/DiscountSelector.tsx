
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BadgePercent } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { BOGOService } from "@/services/cart/BOGOService";

interface DiscountSelectorProps {
  subtotal: number;
  onApplyDiscount: (discountAmount: number, discountType: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | 'bogo', idNumber?: string) => void;
  currentDiscount: number;
  currentDiscountType?: string;
  currentDiscountIdNumber?: string;
  cartItems?: any[]; // For BOGO analysis
}

export default function DiscountSelector({ 
  subtotal, 
  onApplyDiscount, 
  currentDiscount, 
  currentDiscountType,
  currentDiscountIdNumber,
  cartItems = []
}: DiscountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | 'bogo'>(
    (currentDiscountType as any) || 'senior'
  );
  const [idNumber, setIdNumber] = useState(currentDiscountIdNumber || '');
  
  // BIR mandated discounts
  const SENIOR_DISCOUNT_RATE = 0.20; // 20% for senior citizens
  const PWD_DISCOUNT_RATE = 0.20;    // 20% for PWDs
  
  // Other discount rates
  const EMPLOYEE_DISCOUNT_RATE = 0.15; // 15% for employees
  const LOYALTY_DISCOUNT_RATE = 0.10;  // 10% for loyal customers
  
  // Check for BOGO eligibility
  const bogoResult = BOGOService.analyzeBOGO(cartItems);
  
  const calculateDiscount = (type: string): number => {
    switch(type) {
      case 'senior':
        return subtotal * SENIOR_DISCOUNT_RATE;
      case 'pwd':
        return subtotal * PWD_DISCOUNT_RATE;
      case 'employee':
        return subtotal * EMPLOYEE_DISCOUNT_RATE;
      case 'loyalty':
        return subtotal * LOYALTY_DISCOUNT_RATE;
      case 'promo':
        return 0; // Custom amount will be entered
      case 'bogo':
        return bogoResult.discountAmount;
      default:
        return 0;
    }
  };
  
  const handleApplyDiscount = () => {
    let discountAmount = calculateDiscount(discountType);
    
    // Apply the discount
    onApplyDiscount(discountAmount, discountType, idNumber);
    setIsOpen(false);
  };

  // Calculate the display discount amount
  const displayDiscount = currentDiscount > 0
    ? `${formatCurrency(currentDiscount)} (${currentDiscountType})`
    : "None";
  
  return (
    <div className="mb-4">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
          >
            <div className="flex items-center">
              <BadgePercent className="mr-2 h-4 w-4" />
              Apply Discount
            </div>
            <span className="text-muted-foreground">{displayDiscount}</span>
          </Button>
        </DialogTrigger>
        
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <RadioGroup value={discountType} onValueChange={(val: any) => setDiscountType(val)} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="senior" id="senior" />
                <Label htmlFor="senior">Senior Citizen (20%)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pwd" id="pwd" />
                <Label htmlFor="pwd">PWD (20%)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="employee" id="employee" />
                <Label htmlFor="employee">Employee (15%)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="loyalty" id="loyalty" />
                <Label htmlFor="loyalty">Loyalty (10%)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="promo" id="promo" />
                <Label htmlFor="promo">Promo (Custom)</Label>
              </div>
              {bogoResult.hasEligibleItems && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bogo" id="bogo" />
                  <Label htmlFor="bogo">BOGO Promotion (Auto-Applied)</Label>
                </div>
              )}
            </RadioGroup>
            
            {(discountType === 'senior' || discountType === 'pwd') && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="idNumber">ID Number (Required)</Label>
                <Input
                  id="idNumber"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="Enter ID number"
                />
              </div>
            )}
            
            {discountType === 'promo' && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="promoCode">Promo Code</Label>
                <Input
                  id="promoCode"
                  placeholder="Enter promo code"
                />
              </div>
            )}
            
            {discountType === 'bogo' && bogoResult.hasEligibleItems && (
              <div className="mt-4 space-y-2">
                <Label>BOGO Promotion Details:</Label>
                <div className="text-sm space-y-1">
                  {bogoResult.breakdown.map((line, index) => (
                    <p key={index} className="text-muted-foreground">{line}</p>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-4">
              <p className="text-sm">
                Discount Amount: <span className="font-medium">₱{calculateDiscount(discountType).toFixed(2)}</span>
              </p>
              <p className="text-sm">
                Subtotal: <span className="font-medium">₱{subtotal.toFixed(2)}</span>
              </p>
              <p className="text-sm font-medium mt-1">
                New Subtotal: ₱{(subtotal - calculateDiscount(discountType)).toFixed(2)}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            {currentDiscount > 0 && (
              <Button 
                variant="destructive"
                onClick={() => {
                  onApplyDiscount(0, 'promo', '');
                  setIsOpen(false);
                }}
              >
                Remove Discount
              </Button>
            )}
            <Button onClick={handleApplyDiscount}>Apply Discount</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {currentDiscount > 0 && currentDiscountIdNumber && (
        <div className="mt-1 text-xs text-muted-foreground">
          ID #: {currentDiscountIdNumber}
        </div>
      )}
    </div>
  );
}
