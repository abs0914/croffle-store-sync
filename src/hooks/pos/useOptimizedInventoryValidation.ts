/**
 * Optimized Inventory Validation Hook
 * Phase 5: Radical Simplification
 * - Automatic validation DISABLED (only validates at payment)
 * - Eliminates 1.6-2.2s overhead on every cart change
 * - Immediate validation still available for payment processing
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { CartItem } from '@/types';
import { debouncedValidationService, ValidationResult, ItemValidation } from '@/services/cart/DebouncedValidationService';
import { performanceMonitor } from '@/utils/performanceMonitor';

interface OptimizedValidationState {
  isValidating: boolean;
  validationResult: ValidationResult | null;
  lastValidatedItemCount: number;
  validationTime: number | null;
}

export function useOptimizedInventoryValidation(storeId: string) {
  const [state, setState] = useState<OptimizedValidationState>({
    isValidating: false,
    validationResult: null,
    lastValidatedItemCount: 0,
    validationTime: null
  });

  const previousItemsRef = useRef<CartItem[]>([]);
  const validationCountRef = useRef(0);

  /**
   * PHASE 5: Automatic validation disabled for performance
   * This function now returns true immediately without validation
   * Use validateCartImmediate() for payment-time validation instead
   */
  const validateCartItems = useCallback(async (items: CartItem[]): Promise<boolean> => {
    console.log('⚡ [PHASE 5] Skipping automatic cart validation (only validates at payment)');
    
    setState({
      isValidating: false,
      validationResult: null,
      lastValidatedItemCount: 0,
      validationTime: null
    });
    
    return true;
  }, [storeId]);

  /**
   * Validate immediately without debounce (for checkout)
   * This is the ONLY validation that runs now - at payment time
   */
  const validateCartImmediate = useCallback(async (items: CartItem[]): Promise<boolean> => {
    if (!storeId || items.length === 0) return true;

    const operationId = `validation_immediate_${Date.now()}`;
    performanceMonitor.start(operationId, 'Cart Validation (Immediate)', {
      itemCount: items.length,
      storeId
    });

    setState(prev => ({ ...prev, isValidating: true }));

    try {
      const result = await debouncedValidationService.validateCartImmediate(storeId, items);

      const duration = performanceMonitor.end(operationId, {
        success: true,
        isValid: result.isValid
      });

      setState({
        isValidating: false,
        validationResult: result,
        lastValidatedItemCount: items.length,
        validationTime: duration
      });

      console.log('⚡ [IMMEDIATE VALIDATION] Complete', {
        itemCount: items.length,
        isValid: result.isValid,
        duration: `${duration?.toFixed(2)}ms`
      });

      return result.isValid;
    } catch (error) {
      performanceMonitor.end(operationId, { success: false, error: String(error) });
      console.error('❌ [IMMEDIATE VALIDATION] Error:', error);
      setState(prev => ({ ...prev, isValidating: false }));
      return false;
    }
  }, [storeId]);

  /**
   * Get validation result for a specific item
   */
  const getItemValidation = useCallback((productId: string, variationId?: string): ItemValidation | null => {
    if (!state.validationResult) return null;

    const key = variationId ? `${productId}_${variationId}` : productId;
    
    for (const [itemKey, validation] of state.validationResult.itemValidations) {
      if (itemKey.startsWith(key)) {
        return validation;
      }
    }

    return null;
  }, [state.validationResult]);

  /**
   * Check if validation is pending (debounced)
   */
  const isValidationPending = useCallback(() => {
    return debouncedValidationService.isPending();
  }, []);

  /**
   * Clear validation cache
   */
  const clearValidationCache = useCallback(() => {
    debouncedValidationService.clearCache();
    setState({
      isValidating: false,
      validationResult: null,
      lastValidatedItemCount: 0,
      validationTime: null
    });
  }, []);

  /**
   * Get performance stats
   */
  const getValidationStats = useCallback(() => {
    return {
      totalValidations: validationCountRef.current,
      lastValidationTime: state.validationTime,
      isCurrentlyValidating: state.isValidating,
      isPending: isValidationPending()
    };
  }, [state.validationTime, state.isValidating, isValidationPending]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isValidationPending()) {
        console.log('🧹 [OPTIMIZED VALIDATION] Cleaning up pending validation');
      }
    };
  }, [isValidationPending]);

  return {
    // State
    isValidating: state.isValidating,
    validationResult: state.validationResult,
    validationTime: state.validationTime,
    
    // Methods
    validateCartItems,
    validateCartImmediate,
    getItemValidation,
    clearValidationCache,
    isValidationPending,
    getValidationStats,
    
    // Computed
    hasErrors: state.validationResult ? state.validationResult.errors.length > 0 : false,
    hasWarnings: state.validationResult ? state.validationResult.warnings.length > 0 : false,
    errors: state.validationResult?.errors || [],
    warnings: state.validationResult?.warnings || []
  };
}
