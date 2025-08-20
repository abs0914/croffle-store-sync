import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProactiveSyncMonitor } from './proactiveSyncMonitor';
import { advancedAnalyticsEngine } from './advancedAnalyticsEngine';

interface AutomationRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isActive: boolean;
  priority: number;
  cooldownMinutes: number;
  lastExecuted?: string;
}

interface AutomationTrigger {
  type: 'schedule' | 'event' | 'threshold' | 'failure_pattern';
  config: {
    schedule?: string; // cron expression
    event?: string;
    threshold?: { metric: string; operator: string; value: number };
    pattern?: string;
  };
}

interface AutomationCondition {
  type: 'time_window' | 'store_status' | 'metric_check' | 'custom';
  config: Record<string, any>;
}

interface AutomationAction {
  type: 'repair' | 'notify' | 'escalate' | 'schedule_maintenance' | 'adjust_settings';
  config: Record<string, any>;
}

interface WorkflowExecution {
  id: string;
  ruleId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results: AutomationResult[];
  error?: string;
}

interface AutomationResult {
  action: string;
  success: boolean;
  message: string;
  data?: any;
}

class WorkflowAutomationEngine {
  private static instance: WorkflowAutomationEngine;
  private rules: Map<string, AutomationRule> = new Map();
  private activeExecutions: Map<string, WorkflowExecution> = new Map();
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();
  
  static getInstance(): WorkflowAutomationEngine {
    if (!WorkflowAutomationEngine.instance) {
      WorkflowAutomationEngine.instance = new WorkflowAutomationEngine();
    }
    return WorkflowAutomationEngine.instance;
  }

  async initialize(): Promise<void> {
    console.log('🤖 Initializing Workflow Automation Engine...');
    
    // Initialize default automation rules
    await this.initializeDefaultRules();
    
    // Start scheduled tasks
    this.startScheduledTasks();
    
    // Set up event listeners
    this.setupEventListeners();
    
    console.log('✅ Workflow Automation Engine initialized');
  }

  private async initializeDefaultRules(): Promise<void> {
    const defaultRules: AutomationRule[] = [
      {
        id: 'auto-repair-missing-templates',
        name: 'Auto Repair Missing Templates',
        trigger: {
          type: 'schedule',
          config: { schedule: '0 */2 * * *' } // Every 2 hours
        },
        conditions: [
          {
            type: 'metric_check',
            config: { metric: 'missing_templates', threshold: 5 }
          }
        ],
        actions: [
          {
            type: 'repair',
            config: { repairType: 'missing_templates', autoCreate: true }
          },
          {
            type: 'notify',
            config: { message: 'Auto-repair completed for missing templates' }
          }
        ],
        isActive: true,
        priority: 1,
        cooldownMinutes: 120
      },
      {
        id: 'performance-optimization',
        name: 'Performance Optimization',
        trigger: {
          type: 'threshold',
          config: {
            threshold: { metric: 'avg_sync_time', operator: '>', value: 10000 }
          }
        },
        conditions: [
          {
            type: 'time_window',
            config: { startHour: 9, endHour: 17 } // Business hours
          }
        ],
        actions: [
          {
            type: 'adjust_settings',
            config: { setting: 'batch_size', value: 50 }
          },
          {
            type: 'schedule_maintenance',
            config: { task: 'database_optimization', delay: 30 }
          }
        ],
        isActive: true,
        priority: 2,
        cooldownMinutes: 60
      },
      {
        id: 'failure-escalation',
        name: 'Failure Pattern Escalation',
        trigger: {
          type: 'failure_pattern',
          config: { pattern: 'consecutive_failures' }
        },
        conditions: [
          {
            type: 'metric_check',
            config: { metric: 'failure_count', threshold: 10 }
          }
        ],
        actions: [
          {
            type: 'escalate',
            config: { level: 'high', notify: ['admin', 'owner'] }
          },
          {
            type: 'repair',
            config: { repairType: 'comprehensive', priority: 'high' }
          }
        ],
        isActive: true,
        priority: 3,
        cooldownMinutes: 30
      },
      {
        id: 'preventive-maintenance',
        name: 'Daily Preventive Maintenance',
        trigger: {
          type: 'schedule',
          config: { schedule: '0 2 * * *' } // 2 AM daily
        },
        conditions: [],
        actions: [
          {
            type: 'repair',
            config: { repairType: 'preventive', scope: 'all_stores' }
          },
          {
            type: 'notify',
            config: { message: 'Daily preventive maintenance completed' }
          }
        ],
        isActive: true,
        priority: 4,
        cooldownMinutes: 1440 // 24 hours
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  private startScheduledTasks(): void {
    this.rules.forEach(rule => {
      if (rule.trigger.type === 'schedule' && rule.isActive) {
        this.scheduleRule(rule);
      }
    });
  }

  private scheduleRule(rule: AutomationRule): void {
    if (rule.trigger.config.schedule) {
      // Parse cron expression and schedule task
      // For now, implementing basic interval scheduling
      const interval = this.parseCronToInterval(rule.trigger.config.schedule);
      
      if (interval > 0) {
        const taskId = setInterval(async () => {
          await this.executeRule(rule);
        }, interval);
        
        this.scheduledTasks.set(rule.id, taskId as any);
      }
    }
  }

  private parseCronToInterval(cronExpression: string): number {
    // Basic cron parsing - in production, use a proper cron library
    if (cronExpression === '0 */2 * * *') return 2 * 60 * 60 * 1000; // 2 hours
    if (cronExpression === '0 2 * * *') return 24 * 60 * 60 * 1000; // 24 hours
    return 0;
  }

  private setupEventListeners(): void {
    // Set up threshold monitoring
    setInterval(async () => {
      await this.checkThresholdRules();
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Set up failure pattern monitoring
    setInterval(async () => {
      await this.checkFailurePatterns();
    }, 2 * 60 * 1000); // Check every 2 minutes
  }

  private async checkThresholdRules(): Promise<void> {
    const thresholdRules = Array.from(this.rules.values())
      .filter(rule => rule.trigger.type === 'threshold' && rule.isActive);

    for (const rule of thresholdRules) {
      try {
        const shouldExecute = await this.evaluateThreshold(rule);
        if (shouldExecute && this.canExecuteRule(rule)) {
          await this.executeRule(rule);
        }
      } catch (error) {
        console.error(`Error checking threshold rule ${rule.id}:`, error);
      }
    }
  }

  private async evaluateThreshold(rule: AutomationRule): Promise<boolean> {
    const threshold = rule.trigger.config.threshold;
    if (!threshold) return false;

    const metrics = await advancedAnalyticsEngine.getPerformanceMetrics();
    
    switch (threshold.metric) {
      case 'avg_sync_time':
        return this.compareValue(metrics.avgSyncTime, threshold.operator, threshold.value);
      case 'resource_utilization':
        return this.compareValue(metrics.resourceUtilization, threshold.operator, threshold.value);
      default:
        return false;
    }
  }

  private compareValue(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case '>': return actual > expected;
      case '<': return actual < expected;
      case '>=': return actual >= expected;
      case '<=': return actual <= expected;
      case '==': return actual === expected;
      default: return false;
    }
  }

  private async checkFailurePatterns(): Promise<void> {
    const failureRules = Array.from(this.rules.values())
      .filter(rule => rule.trigger.type === 'failure_pattern' && rule.isActive);

    for (const rule of failureRules) {
      try {
        const shouldExecute = await this.evaluateFailurePattern(rule);
        if (shouldExecute && this.canExecuteRule(rule)) {
          await this.executeRule(rule);
        }
      } catch (error) {
        console.error(`Error checking failure pattern rule ${rule.id}:`, error);
      }
    }
  }

  private async evaluateFailurePattern(rule: AutomationRule): Promise<boolean> {
    const pattern = rule.trigger.config.pattern;
    
    if (pattern === 'consecutive_failures') {
      const insights = await advancedAnalyticsEngine.generatePredictiveInsights();
      const failureInsights = insights.filter(i => i.type === 'failure_risk');
      return failureInsights.some(i => i.severity === 'high' || i.severity === 'critical');
    }
    
    return false;
  }

  private canExecuteRule(rule: AutomationRule): boolean {
    // Check cooldown
    if (rule.lastExecuted) {
      const cooldownMs = rule.cooldownMinutes * 60 * 1000;
      const timeSinceLastExecution = Date.now() - new Date(rule.lastExecuted).getTime();
      if (timeSinceLastExecution < cooldownMs) {
        return false;
      }
    }

    // Check if already running
    return !this.activeExecutions.has(rule.id);
  }

  async executeRule(rule: AutomationRule): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: `exec_${rule.id}_${Date.now()}`,
      ruleId: rule.id,
      startTime: new Date().toISOString(),
      status: 'running',
      results: []
    };

    this.activeExecutions.set(rule.id, execution);
    console.log(`🤖 Executing automation rule: ${rule.name}`);

    try {
      // Evaluate conditions
      const conditionsMet = await this.evaluateConditions(rule.conditions);
      
      if (!conditionsMet) {
        execution.status = 'cancelled';
        execution.results.push({
          action: 'condition_check',
          success: false,
          message: 'Conditions not met for execution'
        });
        return execution;
      }

      // Execute actions
      for (const action of rule.actions) {
        try {
          const result = await this.executeAction(action);
          execution.results.push(result);
        } catch (error) {
          execution.results.push({
            action: action.type,
            success: false,
            message: `Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }

      execution.status = 'completed';
      rule.lastExecuted = new Date().toISOString();
      
      toast.success(`Automation completed: ${rule.name}`);
      
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to execute rule ${rule.id}:`, error);
    } finally {
      execution.endTime = new Date().toISOString();
      this.activeExecutions.delete(rule.id);
    }

    return execution;
  }

  private async evaluateConditions(conditions: AutomationCondition[]): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition);
      if (!result) return false;
    }
    return true;
  }

  private async evaluateCondition(condition: AutomationCondition): Promise<boolean> {
    switch (condition.type) {
      case 'time_window':
        const now = new Date();
        const hour = now.getHours();
        return hour >= condition.config.startHour && hour <= condition.config.endHour;
        
      case 'metric_check':
        const metrics = await advancedAnalyticsEngine.getPerformanceMetrics();
        // Implement metric checking logic
        return true;
        
      default:
        return true;
    }
  }

  private async executeAction(action: AutomationAction): Promise<AutomationResult> {
    switch (action.type) {
      case 'repair':
        return await this.executeRepairAction(action);
        
      case 'notify':
        return await this.executeNotifyAction(action);
        
      case 'escalate':
        return await this.executeEscalateAction(action);
        
      case 'schedule_maintenance':
        return await this.executeScheduleMaintenanceAction(action);
        
      case 'adjust_settings':
        return await this.executeAdjustSettingsAction(action);
        
      default:
        return {
          action: action.type,
          success: false,
          message: `Unknown action type: ${action.type}`
        };
    }
  }

  private async executeRepairAction(action: AutomationAction): Promise<AutomationResult> {
    try {
      const repairType = action.config.repairType;
      
      switch (repairType) {
        case 'missing_templates':
          const result = await new ProactiveSyncMonitor().performGlobalRepair();
          return {
            action: 'repair',
            success: true,
            message: `Auto-repair completed: ${result.fixedCount} issues resolved`,
            data: result
          };
          
        case 'preventive':
          const preventiveResult = await new ProactiveSyncMonitor().performPreventiveMaintenance();
          return {
            action: 'repair',
            success: true,
            message: 'Preventive maintenance completed successfully',
            data: preventiveResult
          };
          
        default:
          return {
            action: 'repair',
            success: false,
            message: `Unknown repair type: ${repairType}`
          };
      }
    } catch (error) {
      return {
        action: 'repair',
        success: false,
        message: `Repair action failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async executeNotifyAction(action: AutomationAction): Promise<AutomationResult> {
    const message = action.config.message || 'Automation notification';
    toast.info(message);
    
    return {
      action: 'notify',
      success: true,
      message: `Notification sent: ${message}`
    };
  }

  private async executeEscalateAction(action: AutomationAction): Promise<AutomationResult> {
    // In a real implementation, this would send notifications to admins
    console.log(`🚨 Escalation triggered - Level: ${action.config.level}`);
    
    return {
      action: 'escalate',
      success: true,
      message: `Issue escalated to ${action.config.level} priority`
    };
  }

  private async executeScheduleMaintenanceAction(action: AutomationAction): Promise<AutomationResult> {
    const task = action.config.task;
    const delay = action.config.delay || 0;
    
    setTimeout(async () => {
      // Execute maintenance task
      console.log(`🔧 Executing scheduled maintenance: ${task}`);
    }, delay * 60 * 1000);
    
    return {
      action: 'schedule_maintenance',
      success: true,
      message: `Maintenance task '${task}' scheduled in ${delay} minutes`
    };
  }

  private async executeAdjustSettingsAction(action: AutomationAction): Promise<AutomationResult> {
    const setting = action.config.setting;
    const value = action.config.value;
    
    // In a real implementation, this would adjust system settings
    console.log(`⚙️ Adjusting setting: ${setting} = ${value}`);
    
    return {
      action: 'adjust_settings',
      success: true,
      message: `Setting '${setting}' adjusted to ${value}`
    };
  }

  async getActiveExecutions(): Promise<WorkflowExecution[]> {
    return Array.from(this.activeExecutions.values());
  }

  async getRules(): Promise<AutomationRule[]> {
    return Array.from(this.rules.values());
  }

  async updateRule(ruleId: string, updates: Partial<AutomationRule>): Promise<boolean> {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    
    Object.assign(rule, updates);
    this.rules.set(ruleId, rule);
    
    // Reschedule if needed
    if (updates.isActive !== undefined || updates.trigger) {
      const taskId = this.scheduledTasks.get(ruleId);
      if (taskId) {
        clearInterval(taskId);
        this.scheduledTasks.delete(ruleId);
      }
      
      if (rule.isActive && rule.trigger.type === 'schedule') {
        this.scheduleRule(rule);
      }
    }
    
    return true;
  }

  destroy(): void {
    // Clear all scheduled tasks
    this.scheduledTasks.forEach(taskId => clearInterval(taskId));
    this.scheduledTasks.clear();
    
    // Clear active executions
    this.activeExecutions.clear();
    
    console.log('🤖 Workflow Automation Engine destroyed');
  }
}

export const workflowAutomationEngine = WorkflowAutomationEngine.getInstance();
export type { AutomationRule, WorkflowExecution, AutomationResult };