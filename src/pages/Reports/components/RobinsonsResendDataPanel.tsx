import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Send, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RobinsonsResendDataPanelProps {
  storeId: string;
}

interface TransmissionResult {
  success: boolean;
  message: string;
  filename: string;
  fileContent: string;
  recordCount: number;
  eodCounter: number;
  status: string;
  details: {
    grossSales: number;
    netSales: number;
    transactionCount: number;
  };
}

export function RobinsonsResendDataPanel({ storeId }: RobinsonsResendDataPanelProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<TransmissionResult | null>(null);

  const handleGenerateAndSend = async (downloadOnly: boolean = false) => {
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
          downloadOnly, // Pass this flag to allow file generation without full Robinsons setup
        },
      });

      if (error) throw error;

      setLastResult(data);

      if (downloadOnly) {
        // Download the file directly
        downloadTextFile(data.filename, data.fileContent);
        toast.success('Text file downloaded successfully');
      } else {
        if (data.success) {
          toast.success(data.message || 'Data transmitted successfully');
        } else {
          toast.warning(data.message || 'File generated but SFTP transmission pending');
        }
      }

      console.log('Transmission result:', data);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to generate data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadLastResult = () => {
    if (lastResult?.fileContent && lastResult?.filename) {
      downloadTextFile(lastResult.filename, lastResult.fileContent);
      toast.success('Text file downloaded');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Data Transmission</CardTitle>
        <CardDescription>
          Generate and send transaction data to Robinsons servers, or download the text file for manual submission
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

        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={() => handleGenerateAndSend(false)} 
            disabled={!date || loading}
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Processing...' : 'Send to SFTP'}
          </Button>
          
          <Button 
            onClick={() => handleGenerateAndSend(true)} 
            disabled={!date || loading}
            variant="secondary"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {loading ? 'Generating...' : 'Download Text File'}
          </Button>
        </div>

        {lastResult && (
          <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">{lastResult.filename}</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Records: {lastResult.recordCount} transactions</p>
              <p>EOD Counter: {lastResult.eodCounter}</p>
              <p>Gross Sales: ₱{lastResult.details.grossSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              <p>Net Sales: ₱{lastResult.details.netSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadLastResult}
              className="w-full mt-2"
            >
              <Download className="h-3 w-3 mr-2" />
              Download Again
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          This generates the 30-line TXT file in Robinsons format. You can either transmit it via SFTP or download it for manual submission.
        </p>
      </CardContent>
    </Card>
  );
}
