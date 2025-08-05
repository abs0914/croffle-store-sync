
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, CreditCard, Wallet, QrCode } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { GCashQRModal } from "./GCashQRModal";

interface PaymentMethodsProps {
  total: number;
  paymentMethod: 'cash' | 'card' | 'e-wallet';
  setPaymentMethod: (method: 'cash' | 'card' | 'e-wallet') => void;
  amountTendered: number;
  setAmountTendered: (amount: number) => void;
  cardType: string;
  setCardType: (type: string) => void;
  cardNumber: string;
  setCardNumber: (number: string) => void;
  eWalletProvider: string;
  setEWalletProvider: (provider: string) => void;
  eWalletReferenceNumber: string;
  setEWalletReferenceNumber: (reference: string) => void;
  disabled?: boolean;
}

export function CashPaymentTab({ 
  total, 
  amountTendered, 
  setAmountTendered,
  disabled = false
}: {
  total: number;
  amountTendered: number;
  setAmountTendered: (amount: number) => void;
  disabled?: boolean;
}) {
  // Calculate quick amount buttons and remove duplicates
  const quickAmounts = [
    total, // Exact amount
    Math.ceil(total / 50) * 50, // Nearest 50 higher
    Math.ceil(total / 100) * 100, // Nearest 100 higher
    Math.ceil(total / 500) * 500, // Nearest 500 higher
    Math.ceil(total / 1000) * 1000 // Nearest 1000 higher
  ];
  const uniqueQuickAmounts = Array.from(new Set(quickAmounts)).sort((a, b) => a - b);
  
  // Calculate change amount
  const changeAmount = Math.max(0, amountTendered - total);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amountTendered">Amount Received</Label>
        <Input
          id="amountTendered"
          type="number"
          value={amountTendered || ''}
          onChange={(e) => setAmountTendered(Number(e.target.value))}
          disabled={disabled}
        />
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {uniqueQuickAmounts.map((amount) => (
          <Button
            key={amount}
            variant="outline"
            onClick={() => setAmountTendered(amount)}
            disabled={disabled}
          >
            {formatCurrency(amount)}
          </Button>
        ))}
      </div>
      
      <Card className="p-4 bg-muted">
        <div className="flex justify-between text-lg font-medium">
          <span>Change Due:</span>
          <span>{formatCurrency(changeAmount)}</span>
        </div>
      </Card>
    </div>
  );
}

export function CardPaymentTab({
  cardType,
  setCardType,
  cardNumber,
  setCardNumber,
  disabled = false
}: {
  cardType: string;
  setCardType: (type: string) => void;
  cardNumber: string;
  setCardNumber: (number: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cardType">Card Type</Label>
        <Tabs defaultValue={cardType} onValueChange={setCardType} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="Visa" disabled={disabled}>Visa</TabsTrigger>
            <TabsTrigger value="MasterCard" disabled={disabled}>MasterCard</TabsTrigger>
            <TabsTrigger value="Other" disabled={disabled}>Other</TabsTrigger>
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
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export function EWalletPaymentTab({
  total,
  eWalletProvider,
  setEWalletProvider,
  eWalletReferenceNumber,
  setEWalletReferenceNumber,
  disabled = false
}: {
  total: number;
  eWalletProvider: string;
  setEWalletProvider: (provider: string) => void;
  eWalletReferenceNumber: string;
  setEWalletReferenceNumber: (reference: string) => void;
  disabled?: boolean;
}) {
  const [showQRModal, setShowQRModal] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="eWalletProvider">Provider</Label>
        <Select value={eWalletProvider} onValueChange={setEWalletProvider} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Select e-wallet provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GCash">GCash</SelectItem>
            <SelectItem value="Maya">Maya</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {eWalletProvider === "GCash" && (
        <div className="space-y-2">
          <Button 
            variant="outline" 
            onClick={() => setShowQRModal(true)}
            className="w-full"
            disabled={disabled}
          >
            <QrCode className="mr-2 h-4 w-4" />
            Show QR Code
          </Button>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="eWalletReferenceNumber">Reference Number</Label>
        <Input
          id="eWalletReferenceNumber"
          placeholder="Enter reference number"
          value={eWalletReferenceNumber}
          onChange={(e) => setEWalletReferenceNumber(e.target.value)}
          disabled={disabled}
        />
      </div>

      <GCashQRModal 
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        total={total}
      />
    </div>
  );
}

export default function PaymentMethods({
  total,
  paymentMethod,
  setPaymentMethod,
  amountTendered,
  setAmountTendered,
  cardType,
  setCardType,
  cardNumber,
  setCardNumber,
  eWalletProvider,
  setEWalletProvider,
  eWalletReferenceNumber,
  setEWalletReferenceNumber,
  disabled = false
}: PaymentMethodsProps) {
  return (
    <Tabs defaultValue="cash" value={paymentMethod} onValueChange={(value: string) => {
      setPaymentMethod(value as 'cash' | 'card' | 'e-wallet');
      setAmountTendered(total); // Reset amount tendered for card and e-wallet
    }}>
      <TabsList className="grid grid-cols-3 mb-4">
        <TabsTrigger value="cash" className="flex items-center" disabled={disabled}>
          <Banknote className="mr-2 h-4 w-4" />
          Cash
        </TabsTrigger>
        <TabsTrigger value="card" className="flex items-center" disabled={disabled}>
          <CreditCard className="mr-2 h-4 w-4" />
          Card
        </TabsTrigger>
        <TabsTrigger value="e-wallet" className="flex items-center" disabled={disabled}>
          <Wallet className="mr-2 h-4 w-4" />
          E-wallet
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="cash">
        <CashPaymentTab 
          total={total} 
          amountTendered={amountTendered} 
          setAmountTendered={setAmountTendered} 
          disabled={disabled}
        />
      </TabsContent>
      
      <TabsContent value="card">
        <CardPaymentTab
          cardType={cardType}
          setCardType={setCardType}
          cardNumber={cardNumber}
          setCardNumber={setCardNumber}
          disabled={disabled}
        />
      </TabsContent>
      
      <TabsContent value="e-wallet">
        <EWalletPaymentTab
          total={total}
          eWalletProvider={eWalletProvider}
          setEWalletProvider={setEWalletProvider}
          eWalletReferenceNumber={eWalletReferenceNumber}
          setEWalletReferenceNumber={setEWalletReferenceNumber}
          disabled={disabled}
        />
      </TabsContent>
    </Tabs>
  );
}
