
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Users, Package, BarChart3, Truck, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { checkRouteAccess } from '@/contexts/auth/role-utils';

const QuickActions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Define quick actions based on Phase 4 role requirements
  const actions = [
    {
      title: 'Point of Sale',
      description: 'Process sales transactions',
      icon: ShoppingCart,
      action: () => navigate('/pos'),
      color: 'bg-blue-500 hover:bg-blue-600',
      roles: ['admin', 'owner', 'manager', 'cashier']
    },
    {
      title: 'Manage Customers',
      description: 'View and manage customer data',
      icon: Users,
      action: () => navigate('/customers'),
      color: 'bg-green-500 hover:bg-green-600',
      roles: ['admin', 'owner', 'manager', 'cashier']
    },
    {
      title: 'View Reports',
      description: 'Analyze sales and inventory',
      icon: BarChart3,
      action: () => navigate('/reports'),
      color: 'bg-purple-500 hover:bg-purple-600',
      roles: ['admin', 'owner', 'manager'] // Managers and above only
    },
    {
      title: 'Order Management',
      description: 'Purchase finished goods from commissary',
      icon: Truck,
      action: () => navigate('/order-management'),
      color: 'bg-orange-500 hover:bg-orange-600',
      roles: ['admin', 'owner', 'manager'] // Managers can purchase finished goods
    },
    {
      title: 'Store Inventory',
      description: 'Manage store stock levels',
      icon: Package,
      action: () => navigate('/inventory'),
      color: 'bg-indigo-500 hover:bg-indigo-600',
      roles: ['admin', 'owner', 'manager'] // Managers and above only
    },
    {
      title: 'Settings',
      description: 'Configure store settings',
      icon: Settings,
      action: () => navigate('/settings'),
      color: 'bg-gray-500 hover:bg-gray-600',
      roles: ['admin', 'owner', 'manager'] // Managers and above only
    }
  ];

  // Filter actions based on user role and route access
  const filteredActions = actions.filter(action => {
    if (!user?.role) return false;
    
    // Check if user role is in allowed roles for this action
    const hasRoleAccess = action.roles.includes(user.role);
    
    // Check route-specific access
    const hasRouteAccess = checkRouteAccess(user.role, action.action.toString().split("'")[1]);
    
    return hasRoleAccess && hasRouteAccess;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className={`h-24 flex flex-col items-center justify-center space-y-2 ${action.color} text-white border-none`}
              onClick={action.action}
            >
              <action.icon className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium text-sm">{action.title}</div>
                <div className="text-xs opacity-90">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
        
        {user?.role === 'cashier' && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Cashier Access:</strong> You have access to Dashboard, Point of Sale, and Customer management.
            </p>
          </div>
        )}
        
        {user?.role === 'manager' && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Manager Access:</strong> You can access all store operations including reports and order management for purchasing finished goods from commissary.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickActions;
