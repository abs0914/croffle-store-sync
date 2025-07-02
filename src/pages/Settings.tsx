
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThermalPrinterPage } from './Settings/ThermalPrinter';
import { PrinterStatusIndicator } from '@/components/printer/PrinterStatusIndicator';
import { BIRSettings } from '@/pages/Stores/components/settings/TaxSettings';
import { useStore } from '@/contexts/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, User, Printer, MoreVertical, Shield, LogOut, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const { user, logout } = useAuth();
  const { currentStore } = useStore();
  const navigate = useNavigate();

  const canAccessAdmin = user?.role === 'admin' || user?.role === 'owner';

  const handleBIRChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // For settings page, this would be read-only or redirect to store settings
    console.log('BIR change:', e.target.name, e.target.value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
        <div className="flex items-center gap-4">
          {canAccessAdmin && (
            <Button
              onClick={() => navigate('/admin')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <SettingsIcon className="h-4 w-4" />
              Admin Panel
            </Button>
          )}
          <PrinterStatusIndicator />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">User Profile</TabsTrigger>
          <TabsTrigger value="printer">Thermal Printer</TabsTrigger>
          <TabsTrigger value="bir-compliance">BIR Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm text-gray-900">{user?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <p className="text-sm text-gray-900 capitalize">{user?.role}</p>
                </div>
                <div className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    To modify user information, contact your system administrator or access the Admin Panel.
                  </p>
                </div>

                {/* User Account Actions */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="cursor-default">
                          <User className="mr-2 h-4 w-4" />
                          My Account
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {canAccessAdmin && (
                          <>
                            <DropdownMenuItem onClick={() => navigate('/admin')}>
                              <Shield className="mr-2 h-4 w-4" />
                              Admin Panel
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={logout}>
                          <LogOut className="mr-2 h-4 w-4" />
                          Log out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Thermal Printer Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThermalPrinterPage />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bir-compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                BIR Compliance Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentStore ? (
                <BIRSettings 
                  birData={{
                    tin: currentStore.tin || '',
                    business_name: currentStore.business_name || currentStore.name || '',
                    machine_accreditation_number: currentStore.machine_accreditation_number || '',
                    machine_serial_number: currentStore.machine_serial_number || '',
                    permit_number: currentStore.permit_number || '',
                    date_issued: currentStore.date_issued || '',
                    valid_until: currentStore.valid_until || ''
                  }}
                  handleBIRChange={handleBIRChange}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No store selected. Please select a store to view BIR compliance information.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
