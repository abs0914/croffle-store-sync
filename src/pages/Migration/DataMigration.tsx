
import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataMigrationWizard } from '@/components/migration/DataMigrationWizard';

export const DataMigration: React.FC = () => {
  return (
    <MainLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Data Migration</h1>
          <p className="text-muted-foreground">
            Migrate existing recipe data to the new Product Catalog system
          </p>
        </div>
        <DataMigrationWizard />
      </div>
    </MainLayout>
  );
};
