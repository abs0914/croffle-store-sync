
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CashierReport } from "@/types/reports";
import {
  CashierSummaryStats,
  CashierReportAlert,
  CashierOverviewTab,
  CashierHourlyTab,
  CashierPerformanceTab,
  CashierAttendanceTab
} from "./index";
import { CashierCashTrackingCard } from "./CashierCashTrackingCard";
import { ShiftTransactionsTab } from "@/components/pos/void/ShiftTransactionsTab";
import { useShift } from "@/contexts/shift";

interface CashierReportContainerProps {
  storeId: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  data: CashierReport;
}

export function CashierReportContainer({ storeId, data }: CashierReportContainerProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { currentShift } = useShift();
  
  // Debug logging
  console.log('CashierReportContainer - currentShift:', currentShift);

  return (
    <div className="space-y-6">
      <CashierReportAlert data={data} />
      <CashierCashTrackingCard data={data} />
      <CashierSummaryStats data={data} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-4 flex flex-wrap">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="hourly" className="flex-1">Hourly Analysis</TabsTrigger>
          <TabsTrigger value="cashiers" className="flex-1">Cashiers</TabsTrigger>
          <TabsTrigger value="attendance" className="flex-1">Attendance</TabsTrigger>
          <TabsTrigger value="void-transactions" className="flex-1">Void Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <CashierOverviewTab data={data} />
        </TabsContent>

        <TabsContent value="hourly">
          <CashierHourlyTab data={data} />
        </TabsContent>

        <TabsContent value="cashiers">
          <CashierPerformanceTab data={data} />
        </TabsContent>

        <TabsContent value="attendance">
          <CashierAttendanceTab data={data} />
        </TabsContent>

        <TabsContent value="void-transactions">
          {currentShift ? (
            <ShiftTransactionsTab 
              shiftId={currentShift.id} 
              storeId={storeId} 
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No active shift found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                You need an active shift to view and void transactions.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
