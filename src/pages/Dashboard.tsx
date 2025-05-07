
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { QuickAccess } from "@/components/dashboard/QuickAccess";
import { StoreInfo } from "@/components/dashboard/StoreInfo";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <DashboardHeader />
      <DashboardStats />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <QuickAccess />
        <StoreInfo />
      </div>
    </div>
  );
}
