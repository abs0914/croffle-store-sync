import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, XCircle, PlayCircle } from "lucide-react";
import { format } from "date-fns";

interface EODWarningDialogProps {
  open: boolean;
  onClose: () => void;
  onPerformEOD: () => void;
  missingDate: string;
  lastCompletedDate: string | null;
  isPerforming?: boolean;
}

export function EODWarningDialog({
  open,
  onClose,
  onPerformEOD,
  missingDate,
  lastCompletedDate,
  isPerforming = false
}: EODWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            Previous Day EOD Not Completed
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Robinsons Compliance Requirement #6</AlertTitle>
              <AlertDescription>
                System must detect if previous business day was NOT closed and must NOT allow any transactions
                to be processed until previous day is closed.
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Missing EOD Date</p>
                  <p className="text-lg font-bold text-destructive">
                    {format(new Date(missingDate), 'MMMM dd, yyyy')}
                  </p>
                </div>
                {lastCompletedDate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Completed EOD</p>
                    <p className="text-lg font-bold">
                      {format(new Date(lastCompletedDate), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold">Required Action:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Complete the Z-Reading for {format(new Date(missingDate), 'MMMM dd, yyyy')}</li>
                <li>Verify all transactions for that day are recorded</li>
                <li>Ensure data is transmitted to Robinsons</li>
                <li>Only then can you proceed with today's transactions</li>
              </ul>
            </div>

            <Alert>
              <PlayCircle className="h-4 w-4" />
              <AlertTitle>Automatic EOD Closure</AlertTitle>
              <AlertDescription>
                You can perform the previous day's EOD automatically, or close this dialog and
                perform it manually from the Z-Reading Report.
              </AlertDescription>
            </Alert>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Manual Z-Reading
          </Button>
          <Button
            onClick={onPerformEOD}
            disabled={isPerforming}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPerforming ? 'Performing EOD...' : 'Perform Previous Day EOD'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
