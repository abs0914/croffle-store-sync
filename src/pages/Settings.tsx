
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsersPage from "./Settings/Users";
import CashiersPage from "./Settings/Cashiers";
import ManagersPage from "./Settings/Managers";
import { ThermalPrinterPage } from './Settings/ThermalPrinter';
import { PrinterStatusIndicator } from '@/components/printer/PrinterStatusIndicator';

export default function Settings() {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
        <PrinterStatusIndicator />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="cashiers">Cashiers</TabsTrigger>
          <TabsTrigger value="managers">Managers</TabsTrigger>
          <TabsTrigger value="printer">Thermal Printer</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UsersPage />
        </TabsContent>

        <TabsContent value="cashiers" className="space-y-4">
          <CashiersPage />
        </TabsContent>

        <TabsContent value="managers" className="space-y-4">
          <ManagersPage />
        </TabsContent>

        <TabsContent value="printer" className="space-y-4">
          <ThermalPrinterPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
