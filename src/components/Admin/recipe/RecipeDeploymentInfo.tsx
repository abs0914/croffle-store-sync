import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Rocket, Store, Calendar } from 'lucide-react';

interface RecipeDeploymentInfoProps {
  template: any;
  stores: Array<{ id: string; name: string }>;
}

export function RecipeDeploymentInfo({ template, stores }: RecipeDeploymentInfoProps) {
  const deployedStoreIds = template.deployments?.map((d: any) => d.store_id) || [];
  const undeployedStores = stores.filter(store => !deployedStoreIds.includes(store.id));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Deployment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {template.deployment_count || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Deployments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {template.deployed_stores?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Active Stores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {undeployedStores.length}
              </div>
              <div className="text-sm text-muted-foreground">Available Stores</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deployed Stores */}
      {template.deployed_stores && template.deployed_stores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Deployed Stores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {template.deployed_stores.map((storeName: string, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{storeName}</span>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Stores */}
      {undeployedStores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available for Deployment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {undeployedStores.map((store) => (
                <div key={store.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{store.name}</span>
                  </div>
                  <Badge variant="outline">Available</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Deployments */}
      {(!template.deployed_stores || template.deployed_stores.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <Rocket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Deployments Yet</h3>
            <p className="text-muted-foreground mb-4">
              This template hasn't been deployed to any stores yet.
            </p>
            <Button>
              <Rocket className="h-4 w-4 mr-2" />
              Deploy Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}