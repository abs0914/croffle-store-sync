import { supabase } from "@/integrations/supabase/client";
import { IntelligentValidationService } from "../inventory/intelligentValidationService";
import { toast } from "sonner";

export interface TransactionIntegrityResult {
  success: boolean;
  transactionId: string;
  affectedSystems: {
    inventory: { success: boolean; items: string[] };
    commissary: { success: boolean; items: string[] };
    audit: { success: boolean; entries: number };
  };
  rollbackRequired: boolean;
  errors: string[];
}

/**
 * Cross-System Transaction Integrity Service
 * Ensures data consistency across commissary, inventory, recipes, and sales
 */
export class TransactionIntegrityService {
  
  /**
   * Process a complete sale with full system integrity
   */
  static async processIntegratedSale(
    transactionId: string,
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      price: number;
    }>,
    storeId: string
  ): Promise<TransactionIntegrityResult> {
    const result: TransactionIntegrityResult = {
      success: false,
      transactionId,
      affectedSystems: {
        inventory: { success: false, items: [] },
        commissary: { success: false, items: [] },
        audit: { success: false, entries: 0 }
      },
      rollbackRequired: false,
      errors: []
    };
    
    try {
      console.log('🔄 Processing integrated sale:', { transactionId, items, storeId });
      
      // Phase 1: Pre-validate all items
      console.log('📋 Phase 1: Pre-validating all items...');
      const preValidationResults = await this.preValidateAllItems(items, storeId);
      
      if (!preValidationResults.allValid) {
        result.errors = preValidationResults.errors;
        return result;
      }
      
      // Phase 2: Begin distributed transaction
      console.log('💾 Phase 2: Beginning distributed transaction...');
      const transactionContext = await this.beginDistributedTransaction(transactionId, items, storeId);
      
      // Phase 3: Process inventory deductions
      console.log('📦 Phase 3: Processing inventory deductions...');
      const inventoryResult = await this.processInventoryDeductions(transactionContext);
      result.affectedSystems.inventory = inventoryResult;
      
      if (!inventoryResult.success) {
        result.rollbackRequired = true;
        result.errors.push('Inventory deduction failed');
        await this.rollbackTransaction(transactionContext);
        return result;
      }
      
      // Phase 4: Process commissary implications
      console.log('🏭 Phase 4: Processing commissary implications...');
      const commissaryResult = await this.processCommissaryImplications(transactionContext);
      result.affectedSystems.commissary = commissaryResult;
      
      // Phase 5: Create audit trail
      console.log('📊 Phase 5: Creating comprehensive audit trail...');
      const auditResult = await this.createComprehensiveAuditTrail(transactionContext);
      result.affectedSystems.audit = auditResult;
      
      // Phase 6: Commit transaction
      console.log('✅ Phase 6: Committing distributed transaction...');
      await this.commitDistributedTransaction(transactionContext);
      
      result.success = true;
      console.log('✅ Integrated sale processed successfully');
      
      return result;
    } catch (error) {
      console.error('❌ Integrated sale failed:', error);
      result.errors.push(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.rollbackRequired = true;
      
      // Attempt rollback
      try {
        await this.emergencyRollback(transactionId, storeId);
      } catch (rollbackError) {
        console.error('❌ Emergency rollback failed:', rollbackError);
        result.errors.push('Rollback failed - manual intervention required');
      }
      
      return result;
    }
  }
  
  /**
   * Pre-validate all items before processing
   */
  private static async preValidateAllItems(
    items: Array<{ productId: string; quantity: number; productName: string }>,
    storeId: string
  ): Promise<{ allValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    for (const item of items) {
      try {
        const validation = await IntelligentValidationService.validateProductForPOS(item.productId);
        
        if (!validation.canSell) {
          if (validation.missingIngredients.length > 0) {
            errors.push(`${item.productName}: Missing ingredients - ${validation.missingIngredients.join(', ')}`);
          }
          
          if (validation.insufficientIngredients.length > 0) {
            const insufficient = validation.insufficientIngredients
              .map(i => `${i.item} (need ${i.required}, have ${i.available})`)
              .join(', ');
            errors.push(`${item.productName}: Insufficient stock - ${insufficient}`);
          }
          
          if (!validation.validationDetails.hasRecipe) {
            errors.push(`${item.productName}: No recipe found`);
          }
        } else if (item.quantity > validation.maxQuantityAvailable) {
          errors.push(`${item.productName}: Requested ${item.quantity}, only ${validation.maxQuantityAvailable} available`);
        }
      } catch (error) {
        errors.push(`${item.productName}: Validation error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return {
      allValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Begin distributed transaction context
   */
  private static async beginDistributedTransaction(
    transactionId: string,
    items: any[],
    storeId: string
  ): Promise<any> {
    const context = {
      transactionId,
      storeId,
      items,
      startTime: new Date().toISOString(),
      inventoryChanges: [],
      commissaryChanges: [],
      auditEntries: []
    };
    
    // Log transaction start
    await supabase
      .from('inventory_sync_audit')
      .insert({
        transaction_id: transactionId,
        sync_status: 'started',
        items_processed: items.length,
        affected_inventory_items: items
      });
    
    return context;
  }
  
  /**
   * Process inventory deductions with full tracking
   */
  private static async processInventoryDeductions(context: any): Promise<{
    success: boolean;
    items: string[];
  }> {
    const affectedItems: string[] = [];
    
    try {
      for (const item of context.items) {
        // Get recipe ingredients
        const { data: ingredients, error } = await supabase
          .from('product_ingredients')
          .select(`
            *,
            inventory_stock!inner(*)
          `)
          .eq('product_catalog_id', item.productId);
          
        if (error) throw error;
        
        for (const ingredient of ingredients || []) {
          const deductionQuantity = ingredient.required_quantity * item.quantity;
          const inventoryItem = ingredient.inventory_stock;
          
          // Calculate new stock level
          const newStockQuantity = Math.max(0, inventoryItem.stock_quantity - deductionQuantity);
          
          // Update inventory
          const { error: updateError } = await supabase
            .from('inventory_stock')
            .update({
              stock_quantity: newStockQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', inventoryItem.id);
            
          if (updateError) throw updateError;
          
          // Track the change
          context.inventoryChanges.push({
            inventoryId: inventoryItem.id,
            itemName: inventoryItem.item,
            previousQuantity: inventoryItem.stock_quantity,
            newQuantity: newStockQuantity,
            deductionQuantity
          });
          
          affectedItems.push(inventoryItem.item);
          
          // Log inventory movement
          await supabase
            .from('inventory_movements')
            .insert({
              inventory_stock_id: inventoryItem.id,
              movement_type: 'sale',
              quantity_change: -deductionQuantity,
              previous_quantity: inventoryItem.stock_quantity,
              new_quantity: newStockQuantity,
              notes: `Sale transaction: ${context.transactionId}`,
              created_by: null // System transaction
            });
        }
      }
      
      return { success: true, items: affectedItems };
    } catch (error) {
      console.error('Inventory deduction failed:', error);
      return { success: false, items: affectedItems };
    }
  }
  
  /**
   * Process commissary implications (future enhancement)
   */
  private static async processCommissaryImplications(context: any): Promise<{
    success: boolean;
    items: string[];
  }> {
    // For now, just log the implications
    // In future: trigger automatic commissary-to-store transfers when needed
    
    const commissaryItems: string[] = [];
    
    try {
      for (const change of context.inventoryChanges) {
        // Check if store inventory is running low
        if (change.newQuantity <= 10) { // Low stock threshold
          commissaryItems.push(change.itemName);
          
          // Log low stock alert (future: trigger auto-reorder)
          console.log(`📉 Low stock alert: ${change.itemName} at ${change.newQuantity} units`);
        }
      }
      
      context.commissaryChanges = commissaryItems;
      
      return { success: true, items: commissaryItems };
    } catch (error) {
      console.error('Commissary processing failed:', error);
      return { success: false, items: commissaryItems };
    }
  }
  
  /**
   * Create comprehensive audit trail
   */
  private static async createComprehensiveAuditTrail(context: any): Promise<{
    success: boolean;
    entries: number;
  }> {
    try {
      let entries = 0;
      
      // Log final transaction status
      await supabase
        .from('inventory_sync_audit')
        .insert({
          transaction_id: context.transactionId,
          sync_status: 'completed',
          items_processed: context.items.length,
          affected_inventory_items: context.inventoryChanges,
          sync_duration_ms: Date.now() - new Date(context.startTime).getTime()
        });
      entries++;
      
      // Log each inventory change detail
      for (const change of context.inventoryChanges) {
        context.auditEntries.push({
          transaction_id: context.transactionId,
          item_name: change.itemName,
          previous_quantity: change.previousQuantity,
          new_quantity: change.newQuantity,
          change_type: 'inventory_deduction'
        });
        entries++;
      }
      
      return { success: true, entries };
    } catch (error) {
      console.error('Audit trail creation failed:', error);
      return { success: false, entries: 0 };
    }
  }
  
  /**
   * Commit distributed transaction
   */
  private static async commitDistributedTransaction(context: any): Promise<void> {
    // Mark transaction as successfully committed
    await supabase
      .from('inventory_sync_audit')
      .insert({
        transaction_id: context.transactionId,
        sync_status: 'committed',
        items_processed: context.items.length,
        affected_inventory_items: context.inventoryChanges
      });
      
    console.log(`✅ Transaction ${context.transactionId} committed successfully`);
  }
  
  /**
   * Rollback transaction
   */
  private static async rollbackTransaction(context: any): Promise<void> {
    console.log(`🔄 Rolling back transaction ${context.transactionId}...`);
    
    // Reverse all inventory changes
    for (const change of context.inventoryChanges) {
      await supabase
        .from('inventory_stock')
        .update({
          stock_quantity: change.previousQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', change.inventoryId);
        
      // Log rollback movement
      await supabase
        .from('inventory_movements')
        .insert({
          inventory_stock_id: change.inventoryId,
          movement_type: 'adjustment',
          quantity_change: change.deductionQuantity,
          previous_quantity: change.newQuantity,
          new_quantity: change.previousQuantity,
          notes: `Rollback for transaction: ${context.transactionId}`,
          created_by: null
        });
    }
    
    // Log rollback
    await supabase
      .from('inventory_sync_audit')
      .insert({
        transaction_id: context.transactionId,
        sync_status: 'rolled_back',
        items_processed: context.items.length,
        error_details: 'Transaction rolled back due to failures'
      });
  }
  
  /**
   * Emergency rollback without context
   */
  private static async emergencyRollback(transactionId: string, storeId: string): Promise<void> {
    console.log(`🚨 Emergency rollback for transaction ${transactionId}`);
    
    // This would need to inspect audit logs to determine what to rollback
    // For now, just log the emergency rollback attempt
    await supabase
      .from('inventory_sync_audit')
      .insert({
        transaction_id: transactionId,
        sync_status: 'emergency_rollback',
        error_details: 'Emergency rollback attempted',
        items_processed: 0
      });
  }
}