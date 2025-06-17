
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store } from 'lucide-react';

export const StoreManagementTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Store className="h-6 w-6" />
            Store Management
          </h2>
          <p className="text-muted-foreground">
            Manage store locations and settings
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Store management features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};
