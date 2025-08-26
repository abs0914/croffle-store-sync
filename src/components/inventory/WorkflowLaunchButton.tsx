import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database } from 'lucide-react';
import { MasterDataWorkflowDialog } from '@/components/workflow/MasterDataWorkflowDialog';

export const WorkflowLaunchButton: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button 
        onClick={() => setDialogOpen(true)}
        variant="default"
        size="lg"
        className="gap-2"
      >
        <Database className="h-4 w-4" />
        Complete System Setup
      </Button>

      <MasterDataWorkflowDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};