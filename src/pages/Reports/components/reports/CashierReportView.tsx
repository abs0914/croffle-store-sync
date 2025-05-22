
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CashierReport } from "@/types/reports";
import { CashierSummaryStats } from "./cashier/CashierSummaryStats";
import { CashierReportAlert } from "./cashier/CashierReportAlert";
import { CashierOverviewTab } from "./cashier/CashierOverviewTab";
import { CashierHourlyTab } from "./cashier/CashierHourlyTab";
import { CashierPerformanceTab } from "./cashier/CashierPerformanceTab";
import { CashierAttendanceTab } from "./cashier/CashierAttendanceTab";

interface CashierReportViewProps {
  storeId: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  data: CashierReport;
}

export function CashierReportView({ data }: CashierReportViewProps) {
  const [activeTab, setActiveTab] = useState("overview");
  
  return (
    <div className="space-y-6">
      <CashierReportAlert data={data} />
      <CashierSummaryStats data={data} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-4 flex flex-wrap">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="hourly" className="flex-1">Hourly Analysis</TabsTrigger>
          <TabsTrigger value="cashiers" className="flex-1">Cashiers</TabsTrigger>
          <TabsTrigger value="attendance" className="flex-1">Attendance</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
