
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChangeEvent } from "react";

interface ReceiptSettingsProps {
  receiptHeader: string;
  receiptFooter: string;
  onReceiptHeaderChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onReceiptFooterChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}

export const ReceiptSettings = ({
  receiptHeader,
  receiptFooter,
  onReceiptHeaderChange,
  onReceiptFooterChange
}: ReceiptSettingsProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Receipt Settings</CardTitle>
        <CardDescription>
          Customize the header and footer text that appears on customer receipts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="receipt-header">Receipt Header</Label>
          <Textarea
            id="receipt-header"
            placeholder="Enter header text for receipts..."
            value={receiptHeader}
            onChange={onReceiptHeaderChange}
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="receipt-footer">Receipt Footer</Label>
          <Textarea
            id="receipt-footer"
            placeholder="Enter footer text for receipts..."
            value={receiptFooter}
            onChange={onReceiptFooterChange}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
};
