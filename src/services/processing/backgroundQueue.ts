import { toast } from "sonner";

export interface QueueJob {
  id: string;
  type: 'inventory_sync' | 'receipt_generation' | 'analytics' | 'cache_refresh';
  data: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  retries: number;
  maxRetries: number;
  createdAt: number;
  scheduledAt?: number;
  processor: (data: any) => Promise<any>;
}

export interface QueueStats {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
}

/**
 * High-performance background processing queue
 */
export class BackgroundQueue {
  private static instance: BackgroundQueue;
  private jobs = new Map<string, QueueJob>();
  private processing = new Set<string>();
  private completed = new Set<string>();
  private failed = new Set<string>();
  private processingTimes: number[] = [];
  private maxProcessingTimes = 100; // Keep last 100 processing times
  
  private constructor() {
    this.startProcessor();
    this.startCleanupWorker();
  }

  static getInstance(): BackgroundQueue {
    if (!this.instance) {
      this.instance = new BackgroundQueue();
    }
    return this.instance;
  }

  /**
   * Add job to queue with priority
   */
  addJob(job: Omit<QueueJob, 'id' | 'createdAt' | 'retries'>): string {
    const id = `${job.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queueJob: QueueJob = {
      ...job,
      id,
      createdAt: Date.now(),
      retries: 0
    };

    this.jobs.set(id, queueJob);
    console.log(`📋 Queued job: ${id} (${job.type}) priority: ${job.priority}`);
    
    return id;
  }

  /**
   * Process jobs with priority ordering
   */
  private async startProcessor(): Promise<void> {
    const processNextJob = async () => {
      const pendingJobs = Array.from(this.jobs.values())
        .filter(job => 
          !this.processing.has(job.id) && 
          !this.completed.has(job.id) && 
          !this.failed.has(job.id) &&
          (!job.scheduledAt || job.scheduledAt <= Date.now())
        )
        .sort((a, b) => {
          // Priority ordering: critical > high > normal > low
          const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

      if (pendingJobs.length === 0) {
        setTimeout(processNextJob, 100); // Check again in 100ms
        return;
      }

      const job = pendingJobs[0];
      await this.processJob(job);
      
      // Process next job immediately
      setImmediate(processNextJob);
    };

    processNextJob();
  }

  /**
   * Process individual job with error handling and retries
   */
  private async processJob(job: QueueJob): Promise<void> {
    const startTime = Date.now();
    this.processing.add(job.id);

    try {
      console.log(`🔄 Processing job: ${job.id} (${job.type})`);
      
      const result = await job.processor(job.data);
      
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      
      // Keep only recent processing times
      if (this.processingTimes.length > this.maxProcessingTimes) {
        this.processingTimes = this.processingTimes.slice(-this.maxProcessingTimes);
      }

      this.processing.delete(job.id);
      this.completed.add(job.id);
      
      console.log(`✅ Completed job: ${job.id} in ${processingTime}ms`);
      
      // Show success toast for critical jobs
      if (job.priority === 'critical') {
        toast.success(`${job.type} completed successfully`);
      }

    } catch (error) {
      console.error(`❌ Job failed: ${job.id}`, error);
      
      this.processing.delete(job.id);
      job.retries++;

      if (job.retries < job.maxRetries) {
        // Exponential backoff retry
        const retryDelay = Math.min(1000 * Math.pow(2, job.retries), 30000);
        job.scheduledAt = Date.now() + retryDelay;
        
        console.log(`🔄 Retrying job: ${job.id} in ${retryDelay}ms (attempt ${job.retries + 1}/${job.maxRetries})`);
      } else {
        this.failed.add(job.id);
        console.error(`💀 Job permanently failed: ${job.id}`);
        
        // Show error toast for critical jobs
        if (job.priority === 'critical') {
          toast.error(`${job.type} failed after ${job.maxRetries} attempts`);
        }
      }
    }
  }

  /**
   * Clean up old completed/failed jobs
   */
  private startCleanupWorker(): void {
    setInterval(() => {
      const now = Date.now();
      const maxAge = 300000; // 5 minutes
      
      let cleanedCount = 0;
      
      for (const [id, job] of this.jobs.entries()) {
        if ((this.completed.has(id) || this.failed.has(id)) && 
            (now - job.createdAt) > maxAge) {
          this.jobs.delete(id);
          this.completed.delete(id);
          this.failed.delete(id);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old jobs`);
      }
    }, 60000); // Run every minute
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): 'pending' | 'processing' | 'completed' | 'failed' | 'not_found' {
    if (!this.jobs.has(jobId)) return 'not_found';
    if (this.processing.has(jobId)) return 'processing';
    if (this.completed.has(jobId)) return 'completed';
    if (this.failed.has(jobId)) return 'failed';
    return 'pending';
  }

  /**
   * Wait for job completion
   */
  async waitForJob(jobId: string, timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const checkStatus = () => {
        const status = this.getJobStatus(jobId);
        
        if (status === 'completed') {
          resolve(true);
          return;
        }
        
        if (status === 'failed' || status === 'not_found') {
          resolve(false);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          console.warn(`⏰ Job ${jobId} timed out after ${timeout}ms`);
          resolve(false);
          return;
        }
        
        setTimeout(checkStatus, 100);
      };
      
      checkStatus();
    });
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const totalJobs = this.jobs.size;
    const processingJobs = this.processing.size;
    const completedJobs = this.completed.size;
    const failedJobs = this.failed.size;
    const pendingJobs = totalJobs - processingJobs - completedJobs - failedJobs;
    
    const averageProcessingTime = this.processingTimes.length > 0
      ? this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length
      : 0;

    return {
      totalJobs,
      pendingJobs,
      processingJobs,
      completedJobs,
      failedJobs,
      averageProcessingTime
    };
  }

  /**
   * Clear all jobs (for testing/reset)
   */
  clear(): void {
    this.jobs.clear();
    this.processing.clear();
    this.completed.clear();
    this.failed.clear();
    this.processingTimes = [];
    console.log('🗑️ Queue cleared');
  }
}
