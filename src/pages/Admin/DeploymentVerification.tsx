import React from 'react';
import { DeploymentReadinessVerification } from '@/components/Admin/DeploymentReadinessVerification';

export const DeploymentVerification: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <DeploymentReadinessVerification />
    </div>
  );
};
