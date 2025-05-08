
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ReceiptSettingsProps {
  receiptHeader: string;
  receiptFooter: string;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const ReceiptSettings = ({ receiptHeader, receiptFooter, handleChange }: ReceiptSettingsProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl">Receipt Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="receipt_header">Receipt Header</Label>
          <Textarea
            id="receipt_header"
            name="receipt_header"
            value={receiptHeader}
            onChange={handleChange}
            placeholder="Store name and address that appears at the top of receipts"
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="receipt_footer">Receipt Footer</Label>
          <Textarea
            id="receipt_footer"
            name="receipt_footer"
            value={receiptFooter}
            onChange={handleChange}
            placeholder="Thank you message that appears at the bottom of receipts"
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
};
