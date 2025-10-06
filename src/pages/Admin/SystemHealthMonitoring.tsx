/**
 * Phase 5: System Health Monitoring Page
 * Central dashboard for monitoring inventory system health
 */

import { StoreHealthDashboard } from "@/components/inventory/StoreHealthDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle, AlertTriangle, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SystemHealthMonitoring() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">System Health Monitoring</h1>
        <p className="text-muted-foreground">
          Real-time monitoring of inventory system health and cross-store protection status
        </p>
      </div>

      {/* Protection Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Phase 1: Store Validation</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="outline" className="text-green-500 border-green-500">
                ACTIVE
              </Badge>
              <p className="text-xs text-muted-foreground">
                Runtime validation blocks cross-store deductions at transaction time
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Phase 2: Data Repair</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="outline" className="text-blue-500 border-blue-500">
                AVAILABLE
              </Badge>
              <p className="text-xs text-muted-foreground">
                Automated repair tool for fixing existing cross-store mappings
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Phase 3: Database Trigger</CardTitle>
              <Shield className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="outline" className="text-purple-500 border-purple-500">
                ENFORCED
              </Badge>
              <p className="text-xs text-muted-foreground">
                Database-level trigger prevents creation of new cross-store mappings
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Health Dashboard */}
      <StoreHealthDashboard />

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Protection Layers</CardTitle>
          <CardDescription>
            Multi-layer defense system against cross-store inventory deductions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-500/10 p-2 mt-0.5">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Layer 1: Runtime Validation</p>
                <p className="text-sm text-muted-foreground">
                  All inventory queries filtered by store_id at runtime. Cross-store attempts are blocked with detailed error messages.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-500/10 p-2 mt-0.5">
                <Activity className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">Layer 2: Data Repair</p>
                <p className="text-sm text-muted-foreground">
                  Automated detection and repair of existing cross-store mappings. Preview changes before applying.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-purple-500/10 p-2 mt-0.5">
                <Shield className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="font-medium">Layer 3: Database Enforcement</p>
                <p className="text-sm text-muted-foreground">
                  Database trigger prevents insertion or update of recipe ingredients with cross-store references.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-yellow-500/10 p-2 mt-0.5">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <p className="font-medium">Layer 4: Continuous Monitoring</p>
                <p className="text-sm text-muted-foreground">
                  Real-time health checks and alerting for any system anomalies or configuration issues.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
