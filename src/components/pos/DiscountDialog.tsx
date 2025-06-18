
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DiscountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDiscount: (
    discountAmount: number,
    discountType: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo',
    idNumber?: string
  ) => void;
  currentTotal: number;
}

export const DiscountDialog: React.FC<DiscountDialogProps> = ({
  isOpen,
  onClose,
  onApplyDiscount,
  currentTotal
}) => {
  const [discountType, setDiscountType] = useState<'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo'>('senior');
  const [discountPercentage, setDiscountPercentage] = useState(20);
  const [idNumber, setIdNumber] = useState('');

  const discountTypes = {
    senior: { label: 'Senior Citizen', defaultPercent: 20 },
    pwd: { label: 'PWD', defaultPercent: 20 },
    employee: { label: 'Employee', defaultPercent: 10 },
    loyalty: { label: 'Loyalty', defaultPercent: 5 },
    promo: { label: 'Promo', defaultPercent: 15 }
  };

  const handleTypeChange = (type: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo') => {
    setDiscountType(type);
    setDiscountPercentage(discountTypes[type].defaultPercent);
  };

  const handleApply = () => {
    const discountAmount = (currentTotal * discountPercentage) / 100;
    onApplyDiscount(discountAmount, discountType, idNumber);
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
                {Object.entries(discountTypes).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          {(discountType === 'senior' || discountType === 'pwd' || discountType === 'employee') && (
            <div>
              <Label htmlFor="id-number">
                {discountType === 'senior' ? 'Senior Citizen ID' : 
                 discountType === 'pwd' ? 'PWD ID' : 'Employee ID'}
              </Label>
              <Input
                id="id-number"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="Enter ID number"
              />
            </div>
          )}

          <div className="p-3 bg-gray-100 rounded">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₱{currentTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Discount ({discountPercentage}%):</span>
              <span>-₱{discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>New Total:</span>
              <span>₱{(currentTotal - discountAmount).toFixed(2)}</span>
            </div>
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
