
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Cash, CreditCard, Wallet } from "lucide-react";
import { useShift } from "@/contexts/ShiftContext";

interface PaymentProcessorProps {
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

export default function PaymentProcessor({ total, onPaymentComplete }: PaymentProcessorProps) {
  const { currentShift } = useShift();
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'e-wallet'>('cash');
  const [amountTendered, setAmountTendered] = useState<number>(0);
  
  // Card payment details
  const [cardType, setCardType] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  
  // E-wallet payment details
  const [eWalletProvider, setEWalletProvider] = useState<string>('');
  const [eWalletReferenceNumber, setEWalletReferenceNumber] = useState<string>('');
  
  const handlePayment = () => {
    // Validate payment
    if (!currentShift) {
      toast.error("No active shift. Please start a shift before processing payments.");
      return;
    }
    
    if (paymentMethod === 'cash') {
      if (amountTendered < total) {
        toast.error("Cash amount must be equal to or greater than the total.");
        return;
      }
      
      onPaymentComplete(paymentMethod, amountTendered);
      
    } else if (paymentMethod === 'card') {
      if (!cardType) {
        toast.error("Please select a card type.");
        return;
      }
      if (!cardNumber || cardNumber.length < 4) {
        toast.error("Please enter at least the last 4 digits of the card.");
        return;
      }
      
      onPaymentComplete(
        paymentMethod, 
        total, 
        { cardType, cardNumber: cardNumber.slice(-4) }
      );
      
    } else if (paymentMethod === 'e-wallet') {
      if (!eWalletProvider) {
        toast.error("Please select an e-wallet provider.");
        return;
      }
      if (!eWalletReferenceNumber) {
        toast.error("Please enter the reference number.");
        return;
      }
      
      onPaymentComplete(
        paymentMethod,
        total,
        { eWalletProvider, eWalletReferenceNumber }
      );
    }
    
    // Close dialog
    setIsOpen(false);
    
    // Reset state
    setAmountTendered(0);
    setCardType('');
    setCardNumber('');
    setEWalletProvider('');
    setEWalletReferenceNumber('');
  };
  
  // Quick amount buttons for cash payments
  const quickAmounts = [
    total, // Exact amount
    Math.ceil(total / 50) * 50, // Nearest 50 higher
    Math.ceil(total / 100) * 100, // Nearest 100 higher
    Math.ceil(total / 500) * 500, // Nearest 500 higher
    Math.ceil(total / 1000) * 1000 // Nearest 1000 higher
  ];
  
  // Remove duplicates from quickAmounts
  const uniqueQuickAmounts = Array.from(new Set(quickAmounts)).sort((a, b) => a - b);
  
  // Calculate change amount
  const changeAmount = Math.max(0, amountTendered - total);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-lg py-6"
          disabled={total <= 0 || !currentShift}
        >
          Pay ₱{total.toFixed(2)}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Payment: ₱{total.toFixed(2)}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="cash" value={paymentMethod} onValueChange={(value: string) => {
          setPaymentMethod(value as 'cash' | 'card' | 'e-wallet');
          setAmountTendered(total); // Reset amount tendered for card and e-wallet
        }}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="cash" className="flex items-center">
              <Cash className="mr-2 h-4 w-4" />
              Cash
            </TabsTrigger>
            <TabsTrigger value="card" className="flex items-center">
              <CreditCard className="mr-2 h-4 w-4" />
              Card
            </TabsTrigger>
            <TabsTrigger value="e-wallet" className="flex items-center">
              <Wallet className="mr-2 h-4 w-4" />
              E-wallet
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="cash" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amountTendered">Amount Received</Label>
              <Input
                id="amountTendered"
                type="number"
                value={amountTendered || ''}
                onChange={(e) => setAmountTendered(Number(e.target.value))}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {uniqueQuickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  onClick={() => setAmountTendered(amount)}
                >
                  ₱{amount.toFixed(2)}
                </Button>
              ))}
            </div>
            
            <Card className="p-4 bg-muted">
              <div className="flex justify-between text-lg font-medium">
                <span>Change Due:</span>
                <span>₱{changeAmount.toFixed(2)}</span>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="card" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardType">Card Type</Label>
              <Tabs defaultValue={cardType} onValueChange={setCardType} className="w-full">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="Visa">Visa</TabsTrigger>
                  <TabsTrigger value="MasterCard">MasterCard</TabsTrigger>
                  <TabsTrigger value="Other">Other</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Last 4 Digits</Label>
              <Input
                id="cardNumber"
                maxLength={4}
                placeholder="Last 4 digits"
                value={cardNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setCardNumber(value.slice(0, 4));
                }}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="e-wallet" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eWalletProvider">Provider</Label>
              <Tabs defaultValue={eWalletProvider} onValueChange={setEWalletProvider} className="w-full">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="GCash">GCash</TabsTrigger>
                  <TabsTrigger value="Maya">Maya</TabsTrigger>
                  <TabsTrigger value="Other">Other</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="eWalletReferenceNumber">Reference Number</Label>
              <Input
                id="eWalletReferenceNumber"
                placeholder="Enter reference number"
                value={eWalletReferenceNumber}
                onChange={(e) => setEWalletReferenceNumber(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button onClick={() => setIsOpen(false)} variant="outline">
            Cancel
          </Button>
          <Button onClick={handlePayment}>
            Complete Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
