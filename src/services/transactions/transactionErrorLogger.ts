/**
 * Comprehensive Transaction Error Logger
 * Provides detailed error tracking and diagnosis for transaction failures
 */

import { supabase } from "@/integrations/supabase/client";

export interface TransactionErrorContext {
  transactionId?: string;
  storeId: string;
  userId?: string;
  step: string;
  operationId?: string;
  itemCount?: number;
  totalAmount?: number;
  paymentMethod?: string;
  timestamp: string;
}

export interface TransactionErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  error_context: TransactionErrorContext;
  stack_trace?: string;
  user_action?: string;
  resolution_status: 'pending' | 'investigating' | 'resolved';
  created_at: string;
}

class TransactionErrorLogger {
  private static instance: TransactionErrorLogger;

  static getInstance(): TransactionErrorLogger {
    if (!TransactionErrorLogger.instance) {
      TransactionErrorLogger.instance = new TransactionErrorLogger();
    }
    return TransactionErrorLogger.instance;
  }

  /**
   * Log a transaction error with full context
   */
  async logError(
    errorType: string,
    error: Error | string,
    context: TransactionErrorContext,
    userAction?: string
  ): Promise<void> {
    try {
      const errorMessage = error instanceof Error ? error.message : error;
      const stackTrace = error instanceof Error ? error.stack : undefined;

      console.error('🚨 Transaction Error Logged:', {
        type: errorType,
        message: errorMessage,
        context,
        userAction,
        timestamp: context.timestamp
      });

      // For now, only log to console - database table needs to be created first
      // TODO: Implement database logging when transaction_error_logs table is available
      
      // Also log critical errors to console for immediate debugging
      if (errorType === 'CRITICAL' || errorType === 'DATABASE_ERROR') {
        console.error('🚨 CRITICAL TRANSACTION ERROR:', {
          errorType,
          errorMessage,
          context,
          stackTrace
        });
      }

    } catch (loggingError) {
      console.error('Failed to log transaction error:', loggingError);
    }
  }

  /**
   * Log validation errors with detailed context
   */
  async logValidationError(
    validationStep: string,
    errors: string[],
    context: TransactionErrorContext
  ): Promise<void> {
    await this.logError(
      'VALIDATION_ERROR',
      `Validation failed at ${validationStep}: ${errors.join(', ')}`,
      context,
      'pre_payment_validation'
    );
  }

  /**
   * Log inventory-related errors
   */
  async logInventoryError(
    inventoryStep: string,
    error: Error | string,
    context: TransactionErrorContext & {
      affectedItems?: string[];
      inventoryStatus?: any;
    }
  ): Promise<void> {
    await this.logError(
      'INVENTORY_ERROR',
      error,
      context,
      `inventory_${inventoryStep}`
    );
  }

  /**
   * Log database-related errors
   */
  async logDatabaseError(
    operation: string,
    error: Error | string,
    context: TransactionErrorContext & {
      query?: string;
      parameters?: any;
    }
  ): Promise<void> {
    await this.logError(
      'DATABASE_ERROR',
      `Database operation failed: ${operation} - ${error}`,
      context,
      `database_${operation}`
    );
  }

  /**
   * Log successful transaction with performance metrics
   */
  async logSuccess(
    context: TransactionErrorContext & {
      processingTimeMs?: number;
      inventoryItemsUpdated?: number;
    }
  ): Promise<void> {
    console.log('✅ Transaction Success Logged:', {
      transactionId: context.transactionId,
      storeId: context.storeId,
      processingTime: context.processingTimeMs,
      itemCount: context.itemCount,
      timestamp: context.timestamp
    });

    // Log success metrics for analysis
    try {
      await this.logError(
        'SUCCESS',
        'Transaction completed successfully',
        context,
        'transaction_completed'
      );
    } catch (error) {
      console.warn('Failed to log transaction success:', error);
    }
  }

  /**
   * Generate detailed error report for debugging
   */
  async generateErrorReport(storeId: string, timeframeHours: number = 24): Promise<{
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: any[];
    recommendations: string[];
  }> {
    // For now, return mock data since database table doesn't exist yet
    // TODO: Implement real database querying when transaction_error_logs table is available
    console.log('Generating error report for store:', storeId);
    
    return {
      totalErrors: 0,
      errorsByType: {},
      recentErrors: [],
      recommendations: ['Error report database table not yet available - using console logging']
    };
  }
}

export const transactionErrorLogger = TransactionErrorLogger.getInstance();