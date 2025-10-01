/**
 * Request Deduplication Service
 * Prevents duplicate concurrent requests for the same data
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

export class RequestDeduplicationService {
  private static instance: RequestDeduplicationService;
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private dedupeWindow = 500; // 500ms window for deduplication

  static getInstance(): RequestDeduplicationService {
    if (!RequestDeduplicationService.instance) {
      RequestDeduplicationService.instance = new RequestDeduplicationService();
    }
    return RequestDeduplicationService.instance;
  }

  /**
   * Execute a request with deduplication
   * If a similar request is in-flight, returns the existing promise
   */
  async dedupe<T>(
    key: string,
    executor: () => Promise<T>
  ): Promise<T> {
    const existing = this.pendingRequests.get(key);
    
    // Return existing request if within deduplication window
    if (existing && (Date.now() - existing.timestamp) < this.dedupeWindow) {
      console.log(`🔄 Deduplicating request: ${key}`);
      return existing.promise;
    }

    // Create new request
    const promise = executor()
      .finally(() => {
        // Clean up after completion
        setTimeout(() => {
          this.pendingRequests.delete(key);
        }, this.dedupeWindow);
      });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    return promise;
  }

  /**
   * Clear pending requests for a specific key pattern
   */
  clearPattern(pattern: string): void {
    const keysToDelete: string[] = [];
    this.pendingRequests.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.pendingRequests.delete(key));
  }

  /**
   * Clear all pending requests
   */
  clearAll(): void {
    this.pendingRequests.clear();
  }
}

export const requestDeduplicationService = RequestDeduplicationService.getInstance();
