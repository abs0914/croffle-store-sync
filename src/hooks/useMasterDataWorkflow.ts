import { useState, useCallback } from 'react';
import { MasterDataOrchestrator, WorkflowStep, MasterRecipe } from '@/services/workflow/masterDataOrchestrator';

export const useMasterDataWorkflow = () => {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [orchestrator, setOrchestrator] = useState<MasterDataOrchestrator | null>(null);

  const initializeWorkflow = useCallback(() => {
    const newOrchestrator = new MasterDataOrchestrator(setSteps);
    setOrchestrator(newOrchestrator);
    setSteps(newOrchestrator.getSteps());
  }, []);

  const executeWorkflow = useCallback(async (masterRecipes: MasterRecipe[]) => {
    if (!orchestrator) {
      throw new Error('Workflow not initialized');
    }

    setIsRunning(true);
    try {
      const success = await orchestrator.executeWorkflow(masterRecipes);
      return success;
    } finally {
      setIsRunning(false);
    }
  }, [orchestrator]);

  const resetWorkflow = useCallback(() => {
    setOrchestrator(null);
    setSteps([]);
    setIsRunning(false);
  }, []);

  return {
    steps,
    isRunning,
    initializeWorkflow,
    executeWorkflow,
    resetWorkflow,
    isInitialized: !!orchestrator
  };
};