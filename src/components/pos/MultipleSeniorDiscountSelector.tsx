import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { BadgePercent, Plus, X, Users } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { Card, CardContent } from "@/components/ui/card";

interface SeniorDiscount {
  id: string;
  idNumber: string;
  name: string;
  discountAmount: number;
}

interface MultipleSeniorDiscountSelectorProps {
  subtotal: number;
  onApplyDiscounts: (seniorDiscounts: SeniorDiscount[], otherDiscount?: { type: 'pwd' | 'employee' | 'loyalty' | 'promo', amount: number, idNumber?: string }) => void;
  currentSeniorDiscounts: SeniorDiscount[];
  currentOtherDiscount?: { type: string, amount: number, idNumber?: string };
}

export default function MultipleSeniorDiscountSelector({ 
  subtotal, 
  onApplyDiscounts, 
  currentSeniorDiscounts,
  currentOtherDiscount
}: MultipleSeniorDiscountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [discountMode, setDiscountMode] = useState<'senior' | 'other'>('senior');
  const [seniorDiscounts, setSeniorDiscounts] = useState<SeniorDiscount[]>(currentSeniorDiscounts);
  const [otherDiscountType, setOtherDiscountType] = useState<'pwd' | 'employee' | 'loyalty' | 'promo'>('pwd');
  const [otherIdNumber, setOtherIdNumber] = useState(currentOtherDiscount?.idNumber || '');
  const [totalDiners, setTotalDiners] = useState<number>(currentSeniorDiscounts.length || 1);
  
  // BIR mandated discounts
  const SENIOR_DISCOUNT_RATE = 0.20; // 20% for senior citizens
  const PWD_DISCOUNT_RATE = 0.20;    // 20% for PWDs
  const EMPLOYEE_DISCOUNT_RATE = 0.15; // 15% for employees
  const LOYALTY_DISCOUNT_RATE = 0.10;  // 10% for loyal customers

  const addSeniorDiscount = () => {
    const newDiscount: SeniorDiscount = {
      id: `senior-${Date.now()}`,
      idNumber: '',
      name: `Senior Citizen ${seniorDiscounts.length + 1}`,
      discountAmount: 0
    };
    setSeniorDiscounts([...seniorDiscounts, newDiscount]);
  };

  const removeSeniorDiscount = (id: string) => {
    setSeniorDiscounts(seniorDiscounts.filter(d => d.id !== id));
  };

  const updateSeniorDiscount = (id: string, field: keyof SeniorDiscount, value: string) => {
    setSeniorDiscounts(seniorDiscounts.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const calculateSeniorDiscountAmount = (numberOfSeniors: number) => {
    if (numberOfSeniors === 0 || totalDiners === 0) return 0;
    
    // BIR-compliant calculation for multiple senior citizens
    // 1. Per-person gross share = Subtotal ÷ Total Diners
    const perPersonGrossShare = subtotal / totalDiners;
    
    // 2. Per-senior VAT-exempt sale = Per-person share ÷ 1.12
    const perSeniorVatExemptSale = perPersonGrossShare / 1.12;
    
    // 3. Per-senior discount = VAT-exempt sale × 0.20
    const perSeniorDiscountAmount = perSeniorVatExemptSale * SENIOR_DISCOUNT_RATE;
    
    // 4. Total discount for all seniors
    return perSeniorDiscountAmount * numberOfSeniors;
  };

  const calculateBirCompliantTotal = (numberOfSeniors: number) => {
    if (numberOfSeniors === 0 || totalDiners === 0) return subtotal;
    
    const perPersonGrossShare = subtotal / totalDiners;
    const perSeniorVatExemptSale = perPersonGrossShare / 1.12;
    const perSeniorDiscountAmount = perSeniorVatExemptSale * SENIOR_DISCOUNT_RATE;
    const perSeniorPays = perSeniorVatExemptSale - perSeniorDiscountAmount;
    
    const numberOfNonSeniors = totalDiners - numberOfSeniors;
    
    // Total due = (seniors × senior pays) + (non-seniors × gross share)
    return (numberOfSeniors * perSeniorPays) + (numberOfNonSeniors * perPersonGrossShare);
  };

  const calculateOtherDiscount = (type: string): number => {
    switch(type) {
      case 'pwd':
        return subtotal * PWD_DISCOUNT_RATE;
      case 'employee':
        return subtotal * EMPLOYEE_DISCOUNT_RATE;
      case 'loyalty':
        return subtotal * LOYALTY_DISCOUNT_RATE;
      case 'promo':
        return 0; // Custom amount will be entered
      default:
        return 0;
    }
  };

  const handleApplyDiscounts = () => {
    let finalSeniorDiscounts: SeniorDiscount[] = [];
    let finalOtherDiscount;

    if (discountMode === 'senior' && seniorDiscounts.length > 0) {
      // Validate all senior discounts have ID numbers
      const validSeniorDiscounts = seniorDiscounts.filter(d => d.idNumber.trim() !== '');
      if (validSeniorDiscounts.length > 0) {
        const totalSeniorDiscount = calculateSeniorDiscountAmount(validSeniorDiscounts.length);
        const perSeniorAmount = totalSeniorDiscount / validSeniorDiscounts.length;
        
        finalSeniorDiscounts = validSeniorDiscounts.map(d => ({
          ...d,
          discountAmount: perSeniorAmount
        }));
      }
    } else if (discountMode === 'other') {
      finalOtherDiscount = {
        type: otherDiscountType,
        amount: calculateOtherDiscount(otherDiscountType),
        idNumber: (otherDiscountType === 'pwd') ? otherIdNumber : undefined
      };
    }

    onApplyDiscounts(finalSeniorDiscounts, finalOtherDiscount);
    setIsOpen(false);
  };

  const totalSeniorDiscount = calculateSeniorDiscountAmount(seniorDiscounts.filter(d => d.idNumber.trim() !== '').length);
  const totalOtherDiscount = discountMode === 'other' ? calculateOtherDiscount(otherDiscountType) : 0;
  const totalCurrentDiscounts = currentSeniorDiscounts.reduce((sum, d) => sum + d.discountAmount, 0) + (currentOtherDiscount?.amount || 0);

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
              Apply Discounts
            </div>
            <div className="flex items-center gap-2">
              {currentSeniorDiscounts.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {currentSeniorDiscounts.length}
                </Badge>
              )}
              <span className="text-muted-foreground">
                {totalCurrentDiscounts > 0 ? formatCurrency(totalCurrentDiscounts) : "None"}
              </span>
            </div>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply Discounts</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <RadioGroup value={discountMode} onValueChange={(val: any) => setDiscountMode(val)} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="senior" id="senior-mode" />
                <Label htmlFor="senior-mode">Multiple Senior Citizens (20% each)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other-mode" />
                <Label htmlFor="other-mode">Single Discount (PWD/Employee/Loyalty/Promo)</Label>
              </div>
            </RadioGroup>

            {discountMode === 'senior' && (
              <div className="space-y-4">
                {/* Total Diners Input */}
                <div className="space-y-2">
                  <Label htmlFor="totalDiners" className="text-sm font-medium">Total Number of Diners *</Label>
                  <Input
                    id="totalDiners"
                    type="number"
                    min="1"
                    max="50"
                    value={totalDiners}
                    onChange={(e) => setTotalDiners(Math.max(1, parseInt(e.target.value) || 1))}
                    placeholder="Enter total number of diners (including seniors and non-seniors)"
                    className="text-sm"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This includes both senior citizens and non-senior diners sharing the bill
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Senior Citizens</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSeniorDiscount}
                    className="flex items-center gap-1"
                    disabled={seniorDiscounts.length >= totalDiners}
                  >
                    <Plus className="h-3 w-3" />
                    Add Senior
                  </Button>
                </div>

                {seniorDiscounts.length >= totalDiners && (
                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    Cannot add more seniors than total diners
                  </div>
                )}

                {seniorDiscounts.map((senior, index) => (
                  <Card key={senior.id} className="p-3">
                    <CardContent className="p-0 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Senior Citizen {index + 1}</Label>
                        {seniorDiscounts.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSeniorDiscount(senior.id)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`name-${senior.id}`} className="text-xs">Name (Optional)</Label>
                        <Input
                          id={`name-${senior.id}`}
                          value={senior.name}
                          onChange={(e) => updateSeniorDiscount(senior.id, 'name', e.target.value)}
                          placeholder="Senior citizen name"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`id-${senior.id}`} className="text-xs">Senior Citizen ID Number *</Label>
                        <Input
                          id={`id-${senior.id}`}
                          value={senior.idNumber}
                          onChange={(e) => updateSeniorDiscount(senior.id, 'idNumber', e.target.value)}
                          placeholder="Enter Senior Citizen ID"
                          className="text-sm"
                          required
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {seniorDiscounts.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">No senior citizens added yet.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSeniorDiscount}
                      className="mt-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add First Senior Citizen
                    </Button>
                  </div>
                )}
              </div>
            )}

            {discountMode === 'other' && (
              <div className="space-y-4">
                <RadioGroup value={otherDiscountType} onValueChange={(val: any) => setOtherDiscountType(val)} className="space-y-2">
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
                </RadioGroup>

                {otherDiscountType === 'pwd' && (
                  <div className="space-y-2">
                    <Label htmlFor="pwdId">PWD ID Number (Required)</Label>
                    <Input
                      id="pwdId"
                      value={otherIdNumber}
                      onChange={(e) => setOtherIdNumber(e.target.value)}
                      placeholder="Enter PWD ID number"
                    />
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm">
                Subtotal (with VAT): <span className="font-medium">{formatCurrency(subtotal)}</span>
              </p>
              {discountMode === 'senior' && totalSeniorDiscount > 0 && (
                <>
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="font-medium">BIR-Compliant Calculation:</p>
                    <p>• Total diners: {totalDiners}</p>
                    <p>• Senior citizens: {seniorDiscounts.filter(d => d.idNumber.trim() !== '').length}</p>
                    <p>• Non-seniors: {totalDiners - seniorDiscounts.filter(d => d.idNumber.trim() !== '').length}</p>
                    <p>• Per-person gross share: {formatCurrency(subtotal / totalDiners)}</p>
                    <p>• Per-senior VAT-exempt sale: {formatCurrency((subtotal / totalDiners) / 1.12)}</p>
                    <p>• Per-senior discount (20%): {formatCurrency(((subtotal / totalDiners) / 1.12) * 0.20)}</p>
                    <p>• Per-senior pays: {formatCurrency(((subtotal / totalDiners) / 1.12) * 0.80)}</p>
                  </div>
                  <p className="text-sm mt-2">
                    Total Senior Discount: 
                    <span className="font-medium text-green-600"> -{formatCurrency(totalSeniorDiscount)}</span>
                  </p>
                </>
              )}
              {discountMode === 'other' && totalOtherDiscount > 0 && (
                <p className="text-sm">
                  {otherDiscountType.toUpperCase()} Discount: 
                  <span className="font-medium text-green-600"> -{formatCurrency(totalOtherDiscount)}</span>
                </p>
              )}
              <p className="text-sm font-medium mt-2 pt-2 border-t">
                Final Total: {formatCurrency(
                  discountMode === 'senior' 
                    ? calculateBirCompliantTotal(seniorDiscounts.filter(d => d.idNumber.trim() !== '').length)
                    : subtotal - totalOtherDiscount
                )}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            {(currentSeniorDiscounts.length > 0 || currentOtherDiscount) && (
              <Button 
                variant="destructive"
                onClick={() => {
                  onApplyDiscounts([], undefined);
                  setIsOpen(false);
                }}
              >
                Remove All Discounts
              </Button>
            )}
            <Button onClick={handleApplyDiscounts}>Apply Discounts</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {currentSeniorDiscounts.length > 0 && (
        <div className="mt-2 space-y-1">
          {currentSeniorDiscounts.map((senior, index) => (
            <div key={senior.id} className="text-xs text-muted-foreground flex justify-between">
              <span>Senior {index + 1}: {senior.name || 'Unnamed'}</span>
              <span>ID: {senior.idNumber} • {formatCurrency(senior.discountAmount)}</span>
            </div>
          ))}
        </div>
      )}
      
      {currentOtherDiscount && (
        <div className="mt-1 text-xs text-muted-foreground">
          {currentOtherDiscount.type.toUpperCase()}: {formatCurrency(currentOtherDiscount.amount)}
          {currentOtherDiscount.idNumber && ` • ID: ${currentOtherDiscount.idNumber}`}
        </div>
      )}
    </div>
  );
}