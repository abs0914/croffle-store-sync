import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BadgePercent, Plus, X, Users, User } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CartCalculationService, 
  SeniorDiscount, 
  OtherDiscount, 
  DiscountBeneficiary,
  DiscountType,
  getDiscountLabel,
  isVATExemptDiscount,
  requiresIdNumber
} from "@/services/cart/CartCalculationService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth/AuthProvider";
import { useMemoizedCroffleCombo } from "@/hooks/pos/useMemoizedCroffleCombo";
import { Coffee } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MultipleSeniorDiscountSelectorProps {
  subtotal: number;
  onApplyDiscounts: (seniorDiscounts: SeniorDiscount[], otherDiscount?: OtherDiscount | null, totalDiners?: number) => void;
  onApplyBeneficiaryDiscounts?: (beneficiaries: DiscountBeneficiary[], totalDiners: number, customPercentage?: number) => void;
  currentSeniorDiscounts: SeniorDiscount[];
  currentOtherDiscount?: OtherDiscount | null;
  currentTotalDiners: number;
  currentBeneficiaries?: DiscountBeneficiary[];
  cartItems?: any[];
}

// Available discount types with their rates
const DISCOUNT_TYPES: { value: DiscountType; label: string; rate: string }[] = [
  { value: 'senior', label: 'Senior Citizen', rate: '20%' },
  { value: 'pwd', label: 'PWD', rate: '20%' },
  { value: 'athletes_coaches', label: 'NAAC (National Athletes & Coaches)', rate: '20%' },
  { value: 'solo_parent', label: 'Solo Parent', rate: '20%' },
  { value: 'employee', label: 'Employee', rate: '15%' },
  { value: 'loyalty', label: 'Loyalty', rate: '10%' },
  { value: 'regular', label: 'Regular', rate: '5%' },
  { value: 'custom', label: 'Custom %', rate: 'Variable' },
  { value: 'complimentary', label: 'Complimentary', rate: '100%' },
];

export default function MultipleSeniorDiscountSelector({
  subtotal,
  onApplyDiscounts,
  onApplyBeneficiaryDiscounts,
  currentSeniorDiscounts,
  currentOtherDiscount,
  currentTotalDiners,
  currentBeneficiaries = [],
  cartItems = []
}: MultipleSeniorDiscountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const comboResult = useMemoizedCroffleCombo(cartItems);
  const { user } = useAuth();
  
  // State for beneficiaries
  const [beneficiaries, setBeneficiaries] = useState<DiscountBeneficiary[]>(
    currentBeneficiaries.length > 0 ? currentBeneficiaries : []
  );
  const [totalDiners, setTotalDiners] = useState<number>(
    currentTotalDiners || Math.max(currentBeneficiaries.length, currentSeniorDiscounts.length, 1)
  );
  const [customPercentage, setCustomPercentage] = useState<number>(10);
  const [complimentaryReason, setComplimentaryReason] = useState('');
  const [approverName, setApproverName] = useState('');

  // Calculate regular diners (non-beneficiary)
  const regularDiners = useMemo(() => 
    Math.max(0, totalDiners - beneficiaries.length),
    [totalDiners, beneficiaries.length]
  );

  // Add a new beneficiary
  const addBeneficiary = (type: DiscountType = 'senior') => {
    if (beneficiaries.length >= totalDiners) {
      return; // Can't exceed total diners
    }
    
    const newBeneficiary: DiscountBeneficiary = {
      id: `beneficiary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      idNumber: '',
      name: '',
      discountAmount: 0,
      vatExemptionAmount: 0,
      isVATExempt: isVATExemptDiscount(type),
      discountRate: 0
    };
    setBeneficiaries([...beneficiaries, newBeneficiary]);
  };

  // Remove a beneficiary
  const removeBeneficiary = (id: string) => {
    setBeneficiaries(beneficiaries.filter(b => b.id !== id));
  };

  // Update a beneficiary field
  const updateBeneficiary = (id: string, field: keyof DiscountBeneficiary, value: any) => {
    setBeneficiaries(beneficiaries.map(b => {
      if (b.id !== id) return b;
      
      const updated = { ...b, [field]: value };
      
      // Update isVATExempt when type changes
      if (field === 'type') {
        updated.isVATExempt = isVATExemptDiscount(value as DiscountType);
      }
      
      return updated;
    }));
  };

  // Calculate preview for each beneficiary
  const getPreviewCalculations = useMemo(() => {
    if (beneficiaries.length === 0 || totalDiners === 0) return null;
    
    const perPersonShare = subtotal / totalDiners;
    
    return beneficiaries.map(b => {
      const preview = CartCalculationService.calculateDiscountPreview(
        subtotal,
        b.type,
        totalDiners,
        b.type === 'custom' ? customPercentage : undefined
      );
      return {
        id: b.id,
        type: b.type,
        ...preview
      };
    });
  }, [beneficiaries, subtotal, totalDiners, customPercentage]);

  // Calculate total discount preview
  const totalDiscountPreview = useMemo(() => {
    if (!getPreviewCalculations) return { totalDiscount: 0, totalVATExemption: 0 };
    
    return getPreviewCalculations.reduce((acc, calc) => ({
      totalDiscount: acc.totalDiscount + calc.discountAmount,
      totalVATExemption: acc.totalVATExemption + calc.vatExemption
    }), { totalDiscount: 0, totalVATExemption: 0 });
  }, [getPreviewCalculations]);

  // Handle apply
  const handleApplyDiscounts = () => {
    // Validate complimentary requires reason and approver
    const complimentaryBeneficiaries = beneficiaries.filter(b => b.type === 'complimentary');
    if (complimentaryBeneficiaries.length > 0 && (!complimentaryReason.trim() || !approverName.trim())) {
      alert('Reason and Approver name are required for complimentary discounts');
      return;
    }

    // Validate BIR-mandated ID numbers
    for (const b of beneficiaries) {
      if (requiresIdNumber(b.type) && !b.idNumber.trim()) {
        alert(`${getDiscountLabel(b.type)} requires an ID number`);
        return;
      }
    }

    // Use new beneficiary system if available
    if (onApplyBeneficiaryDiscounts && beneficiaries.length > 0) {
      const processedBeneficiaries = beneficiaries.map(b => ({
        ...b,
        name: b.type === 'complimentary' ? `${complimentaryReason} | Approved by: ${approverName}` : b.name
      }));
      onApplyBeneficiaryDiscounts(
        processedBeneficiaries,
        totalDiners,
        customPercentage
      );
    } else {
      // Fallback to legacy system
      const seniors = beneficiaries
        .filter(b => b.type === 'senior')
        .map(b => ({
          id: b.id,
          idNumber: b.idNumber,
          name: b.name,
          discountAmount: 0
        }));
      
      const other = beneficiaries.find(b => b.type !== 'senior');
      const otherDiscount: OtherDiscount | null = other ? {
        type: other.type,
        amount: 0,
        idNumber: other.idNumber,
        justification: other.type === 'complimentary' ? `${complimentaryReason} | Approved by: ${approverName}` : undefined,
        customPercentage: other.type === 'custom' ? customPercentage : undefined
      } : null;
      
      onApplyDiscounts(seniors, otherDiscount, totalDiners);
    }
    
    setIsOpen(false);
  };

  // Handle croffle combo apply
  const handleApplyCroffleCombo = () => {
    onApplyDiscounts([], {
      type: 'promo',
      amount: comboResult.discountAmount,
      justification: 'Buy 1 Croffle, Get 1 Free Coffee Promotion'
    }, 1);
    setIsOpen(false);
  };

  // Get display for current discounts
  const currentDiscountDisplay = useMemo(() => {
    const allBeneficiaries = currentBeneficiaries.length > 0 ? currentBeneficiaries : [];
    const legacySeniors = currentSeniorDiscounts.length > 0 ? currentSeniorDiscounts : [];
    
    const totalBeneficiaries = allBeneficiaries.length + legacySeniors.length + (currentOtherDiscount ? 1 : 0);
    const totalAmount = 
      allBeneficiaries.reduce((sum, b) => sum + b.discountAmount, 0) +
      legacySeniors.reduce((sum, s) => sum + s.discountAmount, 0) +
      (currentOtherDiscount?.amount || 0);
    
    return { count: totalBeneficiaries, amount: totalAmount };
  }, [currentBeneficiaries, currentSeniorDiscounts, currentOtherDiscount]);

  // Reset to current state when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Initialize from current state
      if (currentBeneficiaries.length > 0) {
        setBeneficiaries([...currentBeneficiaries]);
      } else if (currentSeniorDiscounts.length > 0) {
        // Convert legacy seniors to beneficiaries
        setBeneficiaries(currentSeniorDiscounts.map(s => ({
          id: s.id,
          type: 'senior' as DiscountType,
          idNumber: s.idNumber,
          name: s.name,
          discountAmount: s.discountAmount,
          vatExemptionAmount: 0,
          isVATExempt: true,
          discountRate: 0.20
        })));
      } else if (currentOtherDiscount) {
        setBeneficiaries([{
          id: `other-${Date.now()}`,
          type: currentOtherDiscount.type,
          idNumber: currentOtherDiscount.idNumber || '',
          name: '',
          discountAmount: currentOtherDiscount.amount,
          vatExemptionAmount: 0,
          isVATExempt: isVATExemptDiscount(currentOtherDiscount.type),
          discountRate: 0
        }]);
        if (currentOtherDiscount.customPercentage) {
          setCustomPercentage(currentOtherDiscount.customPercentage);
        }
      } else {
        setBeneficiaries([]);
      }
      setTotalDiners(currentTotalDiners || 1);
    }
    setIsOpen(open);
  };

  // Group beneficiaries by type for summary
  const beneficiaryGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const b of beneficiaries) {
      groups[b.type] = (groups[b.type] || 0) + 1;
    }
    return groups;
  }, [beneficiaries]);

  return (
    <div className="mb-4">
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center">
              <BadgePercent className="mr-2 h-4 w-4" />
              Apply Discounts
            </div>
            <div className="flex items-center gap-2">
              {currentDiscountDisplay.count > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {currentDiscountDisplay.count}
                </Badge>
              )}
              <span className="text-muted-foreground">
                {currentDiscountDisplay.amount > 0 ? formatCurrency(currentDiscountDisplay.amount) : "None"}
              </span>
            </div>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Apply Discounts</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="py-4 space-y-4">
              {/* Total Diners Input */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor="totalDiners" className="text-sm font-medium">Total Number of Diners *</Label>
                      <Input
                        id="totalDiners"
                        type="number"
                        min="1"
                        max="50"
                        value={totalDiners}
                        onChange={e => setTotalDiners(Math.max(1, parseInt(e.target.value) || 1))}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Beneficiaries: {beneficiaries.length}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground mt-1">
                        <User className="h-4 w-4" />
                        <span>Regular diners: {regularDiners}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Beneficiaries Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Discount Beneficiaries</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addBeneficiary('senior')}
                    disabled={beneficiaries.length >= totalDiners}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Beneficiary
                  </Button>
                </div>

                {beneficiaries.length >= totalDiners && (
                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    Cannot add more beneficiaries than total diners
                  </div>
                )}

                {/* Beneficiary Cards */}
                <div className="space-y-3">
                  {beneficiaries.map((beneficiary, index) => (
                    <Card key={beneficiary.id} className="relative">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-start justify-between mb-3">
                          <Badge variant={isVATExemptDiscount(beneficiary.type) ? "default" : "secondary"}>
                            #{index + 1} - {getDiscountLabel(beneficiary.type)}
                            {isVATExemptDiscount(beneficiary.type) && " (VAT Exempt)"}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBeneficiary(beneficiary.id)}
                            className="h-6 w-6 p-0 text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Discount Type */}
                          <div className="space-y-1">
                            <Label className="text-xs">Discount Type</Label>
                            <Select
                              value={beneficiary.type}
                              onValueChange={(val) => updateBeneficiary(beneficiary.id, 'type', val)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DISCOUNT_TYPES.map(dt => (
                                  <SelectItem key={dt.value} value={dt.value}>
                                    {dt.label} ({dt.rate})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* ID Number */}
                          <div className="space-y-1">
                            <Label className="text-xs">
                              ID Number {requiresIdNumber(beneficiary.type) && '*'}
                            </Label>
                            <Input
                              value={beneficiary.idNumber}
                              onChange={e => updateBeneficiary(beneficiary.id, 'idNumber', e.target.value)}
                              placeholder={requiresIdNumber(beneficiary.type) ? "Required" : "Optional"}
                              className="h-9"
                            />
                          </div>
                          
                          {/* Name */}
                          <div className="space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={beneficiary.name}
                              onChange={e => updateBeneficiary(beneficiary.id, 'name', e.target.value)}
                              placeholder="Optional"
                              className="h-9"
                            />
                          </div>
                        </div>
                        
                        {/* Custom percentage input */}
                        {beneficiary.type === 'custom' && (
                          <div className="mt-3 p-2 bg-blue-50 rounded">
                            <Label className="text-xs">Custom Percentage</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                type="number"
                                min="1"
                                max="100"
                                value={customPercentage}
                                onChange={e => setCustomPercentage(Math.min(100, Math.max(1, Number(e.target.value))))}
                                className="w-24 h-8"
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Preview for this beneficiary */}
                        {getPreviewCalculations && (
                          <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
                            {(() => {
                              const preview = getPreviewCalculations.find(p => p.id === beneficiary.id);
                              if (!preview) return null;
                              return (
                                <div className="flex justify-between">
                                  <span>
                                    Share: {formatCurrency(preview.perPersonGrossShare)}
                                    {preview.isVATExempt && ` → VAT Exempt: ${formatCurrency(preview.vatExemptSale)}`}
                                  </span>
                                  <span className="text-green-600 font-medium">
                                    Discount: {formatCurrency(preview.discountAmount)}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {beneficiaries.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p className="text-sm">No discount beneficiaries added yet.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addBeneficiary('senior')}
                      className="mt-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add First Beneficiary
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Complimentary fields */}
              {beneficiaries.some(b => b.type === 'complimentary') && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="complimentaryReason">Reason (Required) *</Label>
                        <Textarea
                          id="complimentaryReason"
                          value={complimentaryReason}
                          onChange={e => setComplimentaryReason(e.target.value)}
                          placeholder="Enter reason for complimentary discount..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="approverName">Approver Name (Required) *</Label>
                        <Input
                          id="approverName"
                          value={approverName}
                          onChange={e => setApproverName(e.target.value)}
                          placeholder="Manager/Supervisor name"
                          className="mt-1"
                        />
                      </div>
                      <div className="text-sm text-red-600 font-medium">
                        ⚠️ This will apply a 100% discount (no charge) for complimentary beneficiaries
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Croffle Combo Promotion */}
              {comboResult.hasEligiblePairs && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Coffee className="h-5 w-5 text-green-600" />
                      <h4 className="font-medium text-green-700">Free Coffee Promotion Available!</h4>
                    </div>
                    <p className="text-sm text-green-700 mb-2">
                      You qualify for {comboResult.pairedItems.length} free coffee{comboResult.pairedItems.length > 1 ? 's' : ''}
                    </p>
                    <div className="text-sm font-medium text-green-700">
                      Savings: {formatCurrency(comboResult.discountAmount)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApplyCroffleCombo}
                      className="mt-2 border-green-300 text-green-700 hover:bg-green-100"
                    >
                      Apply Croffle Combo
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Calculation Preview */}
              {beneficiaries.length > 0 && (
                <Card className="bg-muted/30">
                  <CardContent className="pt-4">
                    <h4 className="text-sm font-medium mb-3">Calculation Preview</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal (with VAT):</span>
                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Diners:</span>
                        <span>{totalDiners} ({beneficiaries.length} beneficiaries + {regularDiners} regular)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Per-person share:</span>
                        <span>{formatCurrency(subtotal / totalDiners)}</span>
                      </div>
                      
                      {/* Beneficiary summary by type */}
                      <div className="pt-2 border-t space-y-1">
                        {Object.entries(beneficiaryGroups).map(([type, count]) => (
                          <div key={type} className="flex justify-between text-xs">
                            <span>{getDiscountLabel(type as DiscountType)} ({count}x):</span>
                            <span>
                              {isVATExemptDiscount(type as DiscountType) ? "VAT Exempt + 20%" : 
                               type === 'complimentary' ? "100%" :
                               type === 'custom' ? `${customPercentage}%` :
                               `${DISCOUNT_TYPES.find(d => d.value === type)?.rate || ''}`}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Totals */}
                      <div className="pt-2 border-t">
                        {totalDiscountPreview.totalVATExemption > 0 && (
                          <div className="flex justify-between text-blue-600">
                            <span>Total VAT Exemption:</span>
                            <span>-{formatCurrency(totalDiscountPreview.totalVATExemption)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-green-600">
                          <span>Total Discount:</span>
                          <span>-{formatCurrency(totalDiscountPreview.totalDiscount)}</span>
                        </div>
                        <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                          <span>Final Total:</span>
                          <span>{formatCurrency(subtotal - totalDiscountPreview.totalVATExemption - totalDiscountPreview.totalDiscount)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
          
          <DialogFooter className="pt-4 border-t">
            {(currentDiscountDisplay.count > 0) && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (onApplyBeneficiaryDiscounts) {
                    onApplyBeneficiaryDiscounts([], 1);
                  }
                  onApplyDiscounts([], null, 1);
                  setIsOpen(false);
                }}
              >
                Remove All Discounts
              </Button>
            )}
            <Button onClick={handleApplyDiscounts} disabled={beneficiaries.length === 0}>
              Apply Discounts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Current discount summary below button */}
      {currentBeneficiaries.length > 0 && (
        <div className="mt-2 space-y-1">
          {currentBeneficiaries.map((b, index) => (
            <div key={b.id} className="text-xs text-muted-foreground flex justify-between">
              <span>{getDiscountLabel(b.type)} #{index + 1}: {b.name || 'Unnamed'}</span>
              <span>
                {b.idNumber && `ID: ${b.idNumber} • `}
                {formatCurrency(b.discountAmount)}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Legacy display */}
      {currentBeneficiaries.length === 0 && currentSeniorDiscounts.length > 0 && (
        <div className="mt-2 space-y-1">
          {currentSeniorDiscounts.map((senior, index) => (
            <div key={senior.id} className="text-xs text-muted-foreground flex justify-between">
              <span>Senior {index + 1}: {senior.name || 'Unnamed'}</span>
              <span>ID: {senior.idNumber} • {formatCurrency(senior.discountAmount)}</span>
            </div>
          ))}
        </div>
      )}
      
      {currentBeneficiaries.length === 0 && currentOtherDiscount && (
        <div className="mt-1 text-xs text-muted-foreground">
          {getDiscountLabel(currentOtherDiscount.type)} {formatCurrency(currentOtherDiscount.amount)}
          {currentOtherDiscount.idNumber && ` • ID: ${currentOtherDiscount.idNumber}`}
        </div>
      )}
    </div>
  );
}
