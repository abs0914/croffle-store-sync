import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { PerformanceMonitor } from '@/services/performance/performanceMonitor';
import { BackgroundProcessingService } from '@/services/transactions/backgroundProcessingService';
import { InventoryCacheService } from '@/services/cache/inventoryCacheService';
import { OptimizedValidationService } from '@/services/productCatalog/optimizedValidationService';

interface TransactionStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  duration?: number;
}

interface OptimizedTransactionState {
  isProcessing: boolean;
  currentStep: string;
  steps: TransactionStep[];
  totalProgress: number;
  estimatedTimeRemaining?: number;
  error?: string;
}

export function useOptimizedTransaction() {
  const [state, setState] = useState<OptimizedTransactionState>({
    isProcessing: false,
    currentStep: '',
    steps: [],
    totalProgress: 0
  });

  const initializeSteps = useCallback((itemCount: number) => {
    const shouldUseBatchProcessing = itemCount > 1;
    
    const steps: TransactionStep[] = [
      { id: 'validation', label: 'Validating products', status: 'pending' },
      { id: 'payment', label: 'Processing payment', status: 'pending' },
      { id: 'transaction', label: 'Creating transaction', status: 'pending' },
    ];

    if (shouldUseBatchProcessing) {
      steps.push({ id: 'inventory', label: 'Updating inventory (background)', status: 'pending' });
    }

    steps.push({ id: 'complete', label: 'Finalizing', status: 'pending' });

    setState(prev => ({
      ...prev,
      steps,
      totalProgress: 0,
      currentStep: steps[0].id
    }));

    return steps;
  }, []);

  const updateStep = useCallback((stepId: string, status: TransactionStep['status'], error?: string) => {
    setState(prev => {
      const steps = prev.steps.map(step => {
        if (step.id === stepId) {
          const now = Date.now();
          const updatedStep = { 
            ...step, 
            status,
            ...(status === 'processing' && { startTime: now }),
            ...(status === 'completed' && step.startTime && { 
              endTime: now,
              duration: now - step.startTime 
            })
          };
          return updatedStep;
        }
        return step;
      });

      const completedSteps = steps.filter(s => s.status === 'completed').length;
      const totalProgress = (completedSteps / steps.length) * 100;

      // Calculate estimated time remaining
      const processingStep = steps.find(s => s.status === 'processing');
      const averageStepTime = steps
        .filter(s => s.duration)
        .reduce((sum, s) => sum + (s.duration || 0), 0) / Math.max(1, completedSteps);
      
      const remainingSteps = steps.length - completedSteps - (processingStep ? 1 : 0);
      const estimatedTimeRemaining = remainingSteps * averageStepTime;

      // Find next step to process
      let currentStep = prev.currentStep;
      if (status === 'completed') {
        const currentIndex = steps.findIndex(s => s.id === stepId);
        const nextStep = steps[currentIndex + 1];
        if (nextStep && nextStep.status === 'pending') {
          currentStep = nextStep.id;
        }
      }

      return {
        ...prev,
        steps,
        totalProgress,
        currentStep,
        estimatedTimeRemaining: estimatedTimeRemaining > 0 ? estimatedTimeRemaining : undefined,
        error: status === 'failed' ? error : prev.error
      };
    });
  }, []);

  const processOptimizedTransaction = useCallback(async (
    items: any[],
    storeId: string,
    onPaymentComplete: () => Promise<boolean>
  ) => {
    const operationId = `optimized_transaction_${Date.now()}`;
    PerformanceMonitor.startTimer(operationId);
    
    console.log('🚀 OPTIMIZED TRANSACTION - START', {
      itemCount: items.length,
      storeId,
      operationId,
      timestamp: new Date().toISOString()
    });
    
    try {
      setState(prev => ({ ...prev, isProcessing: true, error: undefined }));
      
      const steps = initializeSteps(items.length);
      
      // Step 1: Validation (with cache)
      updateStep('validation', 'processing');
      
      const validationResult = await OptimizedValidationService.preValidateCartItems(
        items.map(item => ({ productId: item.productId, quantity: item.quantity })),
        storeId
      );
      
      if (!validationResult.allValid) {
        updateStep('validation', 'failed', `Invalid items: ${validationResult.invalidItems.join(', ')}`);
        toast.error(`Cannot process transaction: ${validationResult.invalidItems.join(', ')}`);
        return false;
      }
      
      updateStep('validation', 'completed');
      
      // Step 2: Payment Processing
      updateStep('payment', 'processing');
      
      console.log('💳 OPTIMIZED TRANSACTION - Payment Processing', {
        operationId,
        timestamp: new Date().toISOString()
      });
      
      const paymentSuccess = await onPaymentComplete();
      
      console.log('💳 OPTIMIZED TRANSACTION - Payment Result', {
        operationId,
        paymentSuccess,
        timestamp: new Date().toISOString()
      });
      
      if (!paymentSuccess) {
        console.error('❌ OPTIMIZED TRANSACTION - Payment Failed', {
          operationId,
          timestamp: new Date().toISOString()
        });
        updateStep('payment', 'failed', 'Payment processing failed');
        return false;
      }
      
      updateStep('payment', 'completed');
      
      // Step 3: Transaction Creation
      updateStep('transaction', 'processing');
      
      // Simulate transaction creation (this would be handled by the caller)
      await new Promise(resolve => setTimeout(resolve, 200));
      
      updateStep('transaction', 'completed');
      
      // Step 4: Background Inventory (if applicable) 
      if (items.length > 1) {
        updateStep('inventory', 'processing');
        
        // Queue background inventory processing
        const jobId = await BackgroundProcessingService.processInventoryInBackground(
          `temp_${Date.now()}`,
          items,
          storeId
        );
        
        // Don't wait for completion - mark as completed for UI purposes
        setTimeout(() => {
          updateStep('inventory', 'completed');
        }, 500);
      }
      
      // Step 5: Finalization
      updateStep('complete', 'processing');
      
      // Final cleanup and cache updates
      InventoryCacheService.invalidateStoreCache(storeId);
      
      updateStep('complete', 'completed');
      
      const totalTime = PerformanceMonitor.endTimer(
        operationId,
        'optimized_transaction_complete',
        { 
          itemCount: items.length,
          validationTime: validationResult.validationTime,
          success: true
        }
      );
      
      toast.success(`Transaction completed in ${totalTime.toFixed(0)}ms`);
      
      return true;
      
    } catch (error) {
      console.error('❌ OPTIMIZED TRANSACTION - Critical Error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        operationId,
        storeId,
        itemCount: items.length,
        timestamp: new Date().toISOString(),
        items: items.map(item => ({ name: item.name, quantity: item.quantity }))
      });
      
      const currentStep = state.steps.find(s => s.status === 'processing')?.id || 'unknown';
      updateStep(currentStep, 'failed', error instanceof Error ? error.message : 'Unknown error');
      
      PerformanceMonitor.endTimer(operationId, 'optimized_transaction_failed', { error });
      
      toast.error('Transaction failed - please try again');
      return false;
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [initializeSteps, updateStep, state.steps]);

  const resetTransaction = useCallback(() => {
    setState({
      isProcessing: false,
      currentStep: '',
      steps: [],
      totalProgress: 0,
      estimatedTimeRemaining: undefined,
      error: undefined
    });
  }, []);

  return {
    ...state,
    processOptimizedTransaction,
    resetTransaction,
    updateStep
  };
}