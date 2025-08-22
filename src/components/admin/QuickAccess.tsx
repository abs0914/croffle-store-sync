import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, Settings, Package, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminQuickAccess: React.FC = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Store Standardization',
      description: 'Multi-phase standardization to bring all stores to operational level',
      icon: <Store className="h-6 w-6" />,
      action: () => navigate('/admin/stores/standardization'),
      variant: 'default' as const
    },
    {
      title: 'Store Management',
      description: 'View and manage all store locations',
      icon: <Settings className="h-6 w-6" />,
      action: () => navigate('/admin/stores'),
      variant: 'outline' as const
    },
    {
      title: 'Product Catalog',
      description: 'Manage product catalogs across stores',
      icon: <Package className="h-6 w-6" />,
      action: () => navigate('/admin/products'),
      variant: 'outline' as const
    },
    {
      title: 'Recipe Templates',
      description: 'Manage centralized recipe templates',
      icon: <Database className="h-6 w-6" />,
      action: () => navigate('/admin/recipes'),
      variant: 'outline' as const
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Quick Access</CardTitle>
        <CardDescription>
          Quick access to key administrative functions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              className="h-auto p-4 flex flex-col items-start space-y-2"
              onClick={action.action}
            >
              <div className="flex items-center gap-2 w-full">
                {action.icon}
                <span className="font-medium">{action.title}</span>
              </div>
              <p className="text-sm text-left text-muted-foreground">
                {action.description}
              </p>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};