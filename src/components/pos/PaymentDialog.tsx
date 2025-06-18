
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onPaymentComplete: (
    paymentMethod: 'cash' | 'card' | 'e-wallet',
    amountTendered: number,
    paymentDetails?: {
      cardType?: string;
      cardNumber?: string;
      eWalletProvider?: string;
      eWalletReferenceNumber?: string;
    }
  ) => void;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  isOpen,
  onClose,
  total,
  onPaymentComplete
}) => {
  const [amountTendered, setAmountTendered] = useState(total);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'e-wallet'>('cash');
  const [cardDetails, setCardDetails] = useState({ type: '', number: '' });
  const [eWalletDetails, setEWalletDetails] = useState({ provider: '', reference: '' });

  const handlePayment = () => {
    let paymentDetails;
    
    if (paymentMethod === 'card') {
      paymentDetails = {
        cardType: cardDetails.type,
        cardNumber: cardDetails.number
      };
    } else if (paymentMethod === 'e-wallet') {
      paymentDetails = {
        eWalletProvider: eWalletDetails.provider,
        eWalletReferenceNumber: eWalletDetails.reference
      };
    }

    onPaymentComplete(paymentMethod, amountTendered, paymentDetails);
  };

  const change = amountTendered - total;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Payment - ₱{total.toFixed(2)}</DialogTitle>
        </DialogHeader>

        <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cash">Cash</TabsTrigger>
            <TabsTrigger value="card">Card</TabsTrigger>
            <TabsTrigger value="e-wallet">E-Wallet</TabsTrigger>
          </TabsList>

          <TabsContent value="cash" className="space-y-4">
            <div>
              <Label htmlFor="cash-amount">Amount Tendered</Label>
              <Input
                id="cash-amount"
                type="number"
                value={amountTendered}
                onChange={(e) => setAmountTendered(Number(e.target.value))}
                min={total}
                step="0.01"
              />
            </div>
            {change >= 0 && (
              <div className="text-lg font-semibold">
                Change: ₱{change.toFixed(2)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="card" className="space-y-4">
            <div>
              <Label htmlFor="card-type">Card Type</Label>
              <Input
                id="card-type"
                value={cardDetails.type}
                onChange={(e) => setCardDetails(prev => ({ ...prev, type: e.target.value }))}
                placeholder="Visa, MasterCard, etc."
              />
            </div>
            <div>
              <Label htmlFor="card-number">Card Number (Last 4 digits)</Label>
              <Input
                id="card-number"
                value={cardDetails.number}
                onChange={(e) => setCardDetails(prev => ({ ...prev, number: e.target.value }))}
                placeholder="****"
                maxLength={4}
              />
            </div>
          </TabsContent>

          <TabsContent value="e-wallet" className="space-y-4">
            <div>
              <Label htmlFor="ewallet-provider">E-Wallet Provider</Label>
              <Input
                id="ewallet-provider"
                value={eWalletDetails.provider}
                onChange={(e) => setEWalletDetails(prev => ({ ...prev, provider: e.target.value }))}
                placeholder="GCash, PayMaya, etc."
              />
            </div>
            <div>
              <Label htmlFor="ewallet-reference">Reference Number</Label>
              <Input
                id="ewallet-reference"
                value={eWalletDetails.reference}
                onChange={(e) => setEWalletDetails(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="Transaction reference"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handlePayment}
            disabled={paymentMethod === 'cash' && amountTendered < total}
          >
            Complete Payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
