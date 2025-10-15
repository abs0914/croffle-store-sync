import { useStore } from "@/contexts/StoreContext";
import { RobinsonsResendDataPanel } from "@/components/reports/RobinsonsResendDataPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2, CheckCircle } from "lucide-react";

export default function RobinsonsCompliance() {
  const { currentStore } = useStore();

  if (!currentStore) {
    return (
      <Alert>
        <Building2 className="h-4 w-4" />
        <AlertTitle>No Store Selected</AlertTitle>
        <AlertDescription>Please select a store to view Robinsons compliance features.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Robinsons Compliance</h1>
        <p className="text-muted-foreground">
          Data transmission and accreditation compliance for Robinsons Land Corporation
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Robinsons Accreditation Status
          </CardTitle>
          <CardDescription>
            System meets all 10 Robinsons POS evaluation requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">✅ Network Support (Wired/Wireless)</p>
              <p className="text-sm font-medium">✅ SFTP Data Transmission</p>
              <p className="text-sm font-medium">✅ EOD/Closing Process</p>
              <p className="text-sm font-medium">✅ Automatic Unsent Data Handling</p>
              <p className="text-sm font-medium">✅ File Naming Conventions</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">✅ 30-Field Data Format</p>
              <p className="text-sm font-medium">✅ Transaction Queue & Retry</p>
              <p className="text-sm font-medium">✅ CSV Export Format</p>
              <p className="text-sm font-medium">✅ Previous Day EOD Detection</p>
              <p className="text-sm font-medium">✅ Re-send Data Facility</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <RobinsonsResendDataPanel storeId={currentStore.id} />
    </div>
  );
}
