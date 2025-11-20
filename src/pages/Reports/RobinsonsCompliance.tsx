import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Building2, CheckCircle2 } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { RobinsonsResendDataPanel } from "./components/RobinsonsResendDataPanel";
import { RobinsonsTransmissionMonitor } from "@/components/robinsons/RobinsonsTransmissionMonitor";
import { RobinsonsConfigurationPanel } from "@/components/robinsons/RobinsonsConfigurationPanel";

export default function RobinsonsCompliance() {
  const { currentStore } = useStore();

  if (!currentStore) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a store to view Robinsons compliance details.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isRobinsonsStore = currentStore.name?.toLowerCase().includes('robinsons');

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Robinsons Land Corporation Compliance</h1>
          <p className="text-muted-foreground">
            POS accreditation and data transmission management
          </p>
        </div>
      </div>

      {!isRobinsonsStore && (
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This store is not identified as a Robinsons store. To enable Robinsons accreditation,
            please configure the store settings below.
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Panel */}
      <RobinsonsConfigurationPanel storeId={currentStore.id} />

      {/* Accreditation Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Robinsons Accreditation Status
          </CardTitle>
          <CardDescription>
            POS system evaluation requirements for Robinsons Land Corporation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {[
              "Daily sales transmission via SFTP (30-field TXT format)",
              "Automatic EOD trigger integration",
              "Transaction data accuracy and completeness",
              "Tenant ID configuration",
              "Terminal identification",
              "EOD counter tracking",
              "Accumulated grand total calculation",
              "Sales breakdown by payment method",
              "Discount tracking (Senior, PWD)",
              "Audit trail and transmission logs"
            ].map((requirement, index) => (
              <div key={index} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{requirement}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual Resend Panel */}
      <RobinsonsResendDataPanel storeId={currentStore.id} />

      {/* Transmission Monitor */}
      <RobinsonsTransmissionMonitor storeId={currentStore.id} />
    </div>
  );
}
