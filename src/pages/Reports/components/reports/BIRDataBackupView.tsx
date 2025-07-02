import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Shield, Database, FileArchive } from "lucide-react";
import { BIREJournalService } from "@/services/reports/modules/birEJournalService";
import { BIRComplianceService } from "@/services/bir/birComplianceService";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

interface BIRDataBackupViewProps {
  storeId: string;
}

export function BIRDataBackupView({ storeId }: BIRDataBackupViewProps) {
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateBackup = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (startDate > endDate) {
      toast.error("Start date cannot be after end date");
      return;
    }

    setIsGenerating(true);
    try {
      const backupData = await BIREJournalService.generateDataBackup(
        storeId,
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd')
      );

      BIREJournalService.downloadDataBackup(
        backupData,
        storeId,
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd')
      );

      toast.success("BIR data backup generated successfully");
    } catch (error) {
      console.error('Backup generation error:', error);
      toast.error("Failed to generate data backup");
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePresetBackup = async (days: number, label: string) => {
    const end = new Date();
    const start = subDays(end, days);
    
    setIsGenerating(true);
    try {
      const backupData = await BIREJournalService.generateDataBackup(
        storeId,
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd')
      );

      BIREJournalService.downloadDataBackup(
        backupData,
        storeId,
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd')
      );

      toast.success(`${label} backup generated successfully`);
    } catch (error) {
      console.error('Backup generation error:', error);
      toast.error(`Failed to generate ${label.toLowerCase()} backup`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            BIR Data Backup & Export
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate comprehensive data backups for BIR compliance and inspection purposes
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Quick Backup Options */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Quick Backup Options</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                onClick={() => generatePresetBackup(7, "Weekly")}
                disabled={isGenerating}
                className="h-auto p-4 flex flex-col items-start"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileArchive className="h-4 w-4" />
                  <span className="font-medium">Weekly Backup</span>
                </div>
                <span className="text-xs text-muted-foreground">Last 7 days</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => generatePresetBackup(30, "Monthly")}
                disabled={isGenerating}
                className="h-auto p-4 flex flex-col items-start"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileArchive className="h-4 w-4" />
                  <span className="font-medium">Monthly Backup</span>
                </div>
                <span className="text-xs text-muted-foreground">Last 30 days</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => generatePresetBackup(90, "Quarterly")}
                disabled={isGenerating}
                className="h-auto p-4 flex flex-col items-start"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileArchive className="h-4 w-4" />
                  <span className="font-medium">Quarterly Backup</span>
                </div>
                <span className="text-xs text-muted-foreground">Last 90 days</span>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Custom Date Range */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Custom Date Range Backup</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label htmlFor="start-date" className="text-sm">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={format(startDate, 'yyyy-MM-dd')}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="end-date" className="text-sm">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={format(endDate, 'yyyy-MM-dd')}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                />
              </div>
              
              <Button
                onClick={handleGenerateBackup}
                disabled={isGenerating}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate Backup"}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Backup Contents Info */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Backup Contents</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  Transaction Data
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All completed transactions</li>
                  <li>• Receipt numbers and sequences</li>
                  <li>• VAT breakdown by transaction</li>
                  <li>• Payment method details</li>
                  <li>• Discount information</li>
                </ul>
              </Card>
              
              <Card className="p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  Compliance Data
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Non-resettable grand totals</li>
                  <li>• Audit trail logs</li>
                  <li>• System access records</li>
                  <li>• Data integrity hashes</li>
                  <li>• BIR compliance status</li>
                </ul>
              </Card>
            </div>
          </div>

          {/* Important Notes */}
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2 text-orange-800">Important Notes</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Backups contain sensitive financial data - store securely</li>
                <li>• BIR requires data retention for minimum 5 years</li>
                <li>• These backups are suitable for BIR inspection purposes</li>
                <li>• Data is exported in JSON format for easy verification</li>
                <li>• Include cumulative totals and audit trails for compliance</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}