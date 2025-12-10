
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth/AuthProvider';
import { checkPermission } from '@/contexts/auth/role-utils';

interface DiscountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDiscount: (
    discountAmount: number,
    discountType: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary' | 'athletes_coaches' | 'solo_parent' | 'regular' | 'custom',
    idNumber?: string,
    justification?: string
  ) => void;
  currentTotal: number;
}

export const DiscountDialog: React.FC<DiscountDialogProps> = ({
  isOpen,
  onClose,
  onApplyDiscount,
  currentTotal
}) => {
  const [discountType, setDiscountType] = useState<'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary' | 'athletes_coaches' | 'solo_parent' | 'regular' | 'custom'>('senior');
  const [discountPercentage, setDiscountPercentage] = useState(20);
  const [idNumber, setIdNumber] = useState('');
  const [justification, setJustification] = useState('');
  const [approverName, setApproverName] = useState('');
  const { user } = useAuth();

  const discountTypes = {
    regular: { label: 'Regular (5%)', defaultPercent: 5 },
    senior: { label: 'Senior Citizen (20%)', defaultPercent: 20 },
    pwd: { label: 'PWD (20%)', defaultPercent: 20 },
    employee: { label: 'Employee (10%)', defaultPercent: 10 },
    loyalty: { label: 'Loyalty (5%)', defaultPercent: 5 },
    promo: { label: 'Promo (Custom)', defaultPercent: 15 },
    custom: { label: 'Custom %', defaultPercent: 10 },
    complimentary: { label: 'Complimentary (100%)', defaultPercent: 100 },
    athletes_coaches: { label: 'National Athletes & Coaches (20%)', defaultPercent: 20 },
    solo_parent: { label: 'Solo Parent (20%)', defaultPercent: 20 }
  };

  // Allow all authenticated users to apply complimentary discounts with proper authorization
  const canApplyComplimentary = !!user;

  const handleTypeChange = (type: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary' | 'athletes_coaches' | 'solo_parent' | 'regular' | 'custom') => {
    setDiscountType(type);
    setDiscountPercentage(discountTypes[type].defaultPercent);
    if (type !== 'complimentary') {
      setJustification('');
      setApproverName('');
    }
  };

  const handleApply = () => {
    if (discountType === 'complimentary') {
      if (!justification.trim()) {
        alert('Justification is required for complimentary discounts');
        return;
      }
      if (!approverName.trim()) {
        alert('Approver name is required for complimentary discounts');
        return;
      }
    }
    
    const discountAmount = (currentTotal * discountPercentage) / 100;
    const completeJustification = discountType === 'complimentary' 
      ? `${justification} | Approved by: ${approverName}`
      : justification;
    onApplyDiscount(discountAmount, discountType, idNumber, completeJustification);
    onClose();
  };

  const discountAmount = (currentTotal * discountPercentage) / 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply Discount</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="discount-type">Discount Type</Label>
            <Select value={discountType} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(discountTypes).map(([key, { label }]) => {
                  if (key === 'complimentary' && !canApplyComplimentary) {
                    return null;
                  }
                  return (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {(discountType === 'custom' || discountType === 'promo') && (
            <div>
              <Label htmlFor="discount-percentage">Discount Percentage</Label>
              <Input
                id="discount-percentage"
                type="number"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                min="0"
                max="100"
                step="1"
              />
            </div>
          )}

          {(discountType === 'senior' || discountType === 'pwd' || discountType === 'employee' || discountType === 'athletes_coaches' || discountType === 'solo_parent') && (
            <div>
              <Label htmlFor="id-number">
                {discountType === 'senior' ? 'Senior Citizen ID' : 
                 discountType === 'pwd' ? 'PWD ID' : 
                 discountType === 'employee' ? 'Employee ID' :
                 discountType === 'athletes_coaches' ? 'Athletes/Coaches ID' :
                 discountType === 'solo_parent' ? 'Solo Parent ID' : 'ID Number'}
              </Label>
              <Input
                id="id-number"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="Enter ID number"
              />
            </div>
          )}

          {discountType === 'complimentary' && (
            <>
              <div>
                <Label htmlFor="justification">Reason (Required)</Label>
                <Textarea
                  id="justification"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Enter reason for complimentary discount..."
                  required
                />
              </div>
              <div>
                <Label htmlFor="approver-name">Approver Name (Required)</Label>
                <Input
                  id="approver-name"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="Enter name of manager/supervisor who approved this"
                  required
                />
              </div>
            </>
          )}

          <div className={`p-3 rounded ${discountType === 'complimentary' ? 'bg-red-50 border border-red-200' : 'bg-gray-100'}`}>
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₱{currentTotal.toFixed(2)}</span>
            </div>
            <div className={`flex justify-between ${discountType === 'complimentary' ? 'text-red-600 font-bold' : 'text-green-600'}`}>
              <span>Discount ({discountPercentage}%):</span>
              <span>-₱{discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>New Total:</span>
              <span className={discountType === 'complimentary' ? 'text-red-600 font-bold' : ''}>
                ₱{(currentTotal - discountAmount).toFixed(2)}
              </span>
            </div>
            {discountType === 'complimentary' && (
              <div className="text-sm text-red-600 mt-2 font-medium">
                ⚠️ Requires reason and approver name
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply Discount
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
