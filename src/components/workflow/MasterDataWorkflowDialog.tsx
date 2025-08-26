import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Clock, Play } from 'lucide-react';
import { useMasterDataWorkflow } from '@/hooks/useMasterDataWorkflow';
import { sampleMasterRecipes } from '@/data/sampleMasterRecipes';

interface MasterDataWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MasterDataWorkflowDialog: React.FC<MasterDataWorkflowDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { 
    steps, 
    isRunning, 
    initializeWorkflow, 
    executeWorkflow, 
    resetWorkflow,
    isInitialized 
  } = useMasterDataWorkflow();

  const [hasStarted, setHasStarted] = useState(false);

  const handleStart = async () => {
    if (!isInitialized) {
      initializeWorkflow();
    }
    
    setHasStarted(true);
    await executeWorkflow();
  };

  const handleClose = () => {
    resetWorkflow();
    setHasStarted(false);
    onOpenChange(false);
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'running':
        return <Clock className="h-5 w-5 text-warning animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  const allCompleted = steps.length > 0 && steps.every(s => s.status === 'completed');
  const hasErrors = steps.some(s => s.status === 'error');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Master Data Workflow</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!hasStarted ? (
            <div className="text-center space-y-4">
              <div className="p-6 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2">Database Reset Complete</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Complete the system setup after importing recipes through Admin → Recipe Management.
                </p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="text-left">
                    <p className="font-medium">What will happen:</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      <li>• Verify existing recipe templates</li>
                      <li>• Map ingredients to inventory</li>
                      <li>• Deploy to all stores</li>
                      <li>• Update product catalog</li>
                      <li>• Sync inventory units</li>
                    </ul>
                  </div>
                  <div className="text-left">
                    <p className="font-medium">This will fix:</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      <li>• Unit mismatch issues</li>
                      <li>• Recipe-inventory mapping</li>
                      <li>• Transaction failures</li>
                      <li>• Product availability</li>
                    </ul>
                  </div>
                </div>
              </div>
              
                <Button 
                onClick={handleStart} 
                disabled={isRunning}
                size="lg"
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                Complete System Setup
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    {getStepIcon(step.status)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{step.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {step.progress}%
                        </span>
                      </div>
                      {step.message && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {step.message}
                        </p>
                      )}
                      {step.error && (
                        <p className="text-xs text-destructive mt-1">
                          {step.error}
                        </p>
                      )}
                    </div>
                  </div>
                  <Progress value={step.progress} className="h-2" />
                </div>
              ))}

              {allCompleted && (
                <div className="mt-6 p-4 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="font-medium text-success">Workflow Completed Successfully!</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Master recipes imported, ingredients mapped, and system is ready for transactions.
                  </p>
                </div>
              )}

              {hasErrors && (
                <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="font-medium text-destructive">Workflow Failed</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Some steps failed. Check the error messages above.
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  disabled={isRunning}
                  className="flex-1"
                >
                  {allCompleted || hasErrors ? 'Close' : 'Cancel'}
                </Button>
                {(allCompleted || hasErrors) && (
                  <Button 
                    onClick={() => {
                      setHasStarted(false);
                      resetWorkflow();
                    }}
                    variant="secondary"
                    disabled={isRunning}
                  >
                    Reset & Restart
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};