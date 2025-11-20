import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Send } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RobinsonsResendDataPanelProps {
  storeId: string;
}

export function RobinsonsResendDataPanel({ storeId }: RobinsonsResendDataPanelProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!date) {
      toast.error('Please select a date');
      return;
    }

    setLoading(true);
    try {
      const salesDate = format(date, 'yyyy-MM-dd');

      const { data, error } = await supabase.functions.invoke('robinsons-transmission', {
        body: {
          storeId,
          salesDate,
          isManualResend: true,
          transmissionType: 'manual',
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message || 'Data transmitted successfully');
      } else {
        toast.warning(data.message || 'Transmission pending - check configuration');
      }

      console.log('Transmission result:', data);
    } catch (error: any) {
      console.error('Resend error:', error);
      toast.error('Failed to transmit data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Data Transmission</CardTitle>
        <CardDescription>
          Manually send transaction data to Robinsons servers for a specific date
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Select Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <Button 
          onClick={handleResend} 
          disabled={!date || loading}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {loading ? 'Transmitting...' : 'Send Data to Robinsons'}
        </Button>

        <p className="text-xs text-muted-foreground">
          This will generate a 30-line TXT file and transmit it to the Robinsons SFTP server.
          Make sure SFTP credentials are properly configured in store settings.
        </p>
      </CardContent>
    </Card>
  );
}
