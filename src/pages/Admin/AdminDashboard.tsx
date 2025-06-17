
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Store, 
  Package, 
  ClipboardList, 
  ChefHat,
  Factory,
  ArrowRightLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System overview and key metrics
          </p>
        </div>
        <Badge variant="outline">Admin Panel</Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              +2 from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">245</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              +12 from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recipe Templates</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              +7 from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commissary Items</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              +15 from last month
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              System Alerts
            </CardTitle>
            <CardDescription>Important notifications requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4 p-3 bg-yellow-50 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Low stock alert: Flour</p>
                <p className="text-xs text-muted-foreground">Commissary inventory below threshold</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">5 pending store approvals</p>
                <p className="text-xs text-muted-foreground">New store registrations waiting for review</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">All systems operational</p>
                <p className="text-xs text-muted-foreground">No critical issues detected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest system activities and operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Recipe deployed to Store A</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Commissary conversion completed</p>
                <p className="text-xs text-muted-foreground">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New manager registered</p>
                <p className="text-xs text-muted-foreground">6 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Bulk inventory upload processed</p>
                <p className="text-xs text-muted-foreground">1 day ago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supply Chain Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Supply Chain Flow
          </CardTitle>
          <CardDescription>Overview of the commissary → production → store pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg flex-1">
              <div className="flex items-center gap-3">
                <Factory className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-medium">Raw Materials</p>
                  <p className="text-sm text-muted-foreground">Commissary inventory</p>
                </div>
              </div>
              <span className="text-lg font-bold text-blue-600">156</span>
            </div>
            
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg flex-1">
              <div className="flex items-center gap-3">
                <ChefHat className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium">Recipe Production</p>
                  <p className="text-sm text-muted-foreground">Active conversions</p>
                </div>
              </div>
              <span className="text-lg font-bold text-green-600">89</span>
            </div>
            
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg flex-1">
              <div className="flex items-center gap-3">
                <Store className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="font-medium">Store Inventory</p>
                  <p className="text-sm text-muted-foreground">Ready products</p>
                </div>
              </div>
              <span className="text-lg font-bold text-purple-600">12</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a 
              href="/admin/stores" 
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Store className="h-8 w-8 mb-2 text-blue-600" />
              <span className="text-sm font-medium">Manage Stores</span>
            </a>
            <a 
              href="/admin/users" 
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="h-8 w-8 mb-2 text-green-600" />
              <span className="text-sm font-medium">Manage Users</span>
            </a>
            <a 
              href="/admin/commissary-inventory" 
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Factory className="h-8 w-8 mb-2 text-purple-600" />
              <span className="text-sm font-medium">Commissary</span>
            </a>
            <a 
              href="/admin/reports" 
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="h-8 w-8 mb-2 text-orange-600" />
              <span className="text-sm font-medium">View Reports</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
