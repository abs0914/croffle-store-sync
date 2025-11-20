/**
 * OUTBOX SERVICE
 * 
 * Implements the outbox pattern for reliable event synchronization.
 * All write operations first go to the local outbox, then sync to server.
 */

import { offlineDB, OutboxEvent } from './db/schema';
import { deviceIdService } from './deviceIdService';
import { v4 as uuidv4 } from 'uuid';

class OutboxService {
  /**
   * Add event to outbox
   */
  async addEvent(
    storeId: string,
    eventType: string,
    payload: any,
    priority: number = 5
  ): Promise<string> {
    const deviceId = await deviceIdService.getDeviceId();
    const eventId = uuidv4();

    const event: OutboxEvent = {
      id: eventId,
      device_id: deviceId,
      store_id: storeId,
      event_type: eventType,
      payload,
      created_at: Date.now(),
      synced: false,
      sync_attempts: 0,
      priority
    };

    await offlineDB.outbox.add(event);
    console.log(`📤 Event added to outbox: ${eventType} (${eventId})`);

    return eventId;
  }

  /**
   * Get pending events for sync (by priority)
   */
  async getPendingEvents(limit: number = 50): Promise<OutboxEvent[]> {
    return await offlineDB.outbox
      .where('synced')
      .equals(0) // false
      .sortBy('priority')
      .then(events => events.reverse().slice(0, limit)); // highest priority first
  }

  /**
   * Get pending events for a specific store
   */
  async getPendingEventsByStore(storeId: string, limit: number = 50): Promise<OutboxEvent[]> {
    return await offlineDB.outbox
      .where('[store_id+synced]')
      .equals([storeId, 0])
      .limit(limit)
      .toArray();
  }

  /**
   * Mark event as synced
   */
  async markEventSynced(eventId: string): Promise<void> {
    await offlineDB.outbox.update(eventId, {
      synced: true
    });
  }

  /**
   * Record sync failure
   */
  async recordSyncFailure(eventId: string, error: string): Promise<void> {
    const event = await offlineDB.outbox.get(eventId);
    if (!event) return;

    await offlineDB.outbox.update(eventId, {
      sync_attempts: event.sync_attempts + 1,
      last_sync_attempt: Date.now(),
      sync_error: error
    });
  }

  /**
   * Get outbox statistics
   */
  async getStats(storeId?: string): Promise<{
    total: number;
    pending: number;
    failed: number;
    synced: number;
  }> {
    let query = offlineDB.outbox;

    if (storeId) {
      const all = await query.where('store_id').equals(storeId).toArray();
      return {
        total: all.length,
        pending: all.filter(e => !e.synced && e.sync_attempts < 3).length,
        failed: all.filter(e => !e.synced && e.sync_attempts >= 3).length,
        synced: all.filter(e => e.synced).length
      };
    }

    const all = await query.toArray();
    return {
      total: all.length,
      pending: all.filter(e => !e.synced && e.sync_attempts < 3).length,
      failed: all.filter(e => !e.synced && e.sync_attempts >= 3).length,
      synced: all.filter(e => e.synced).length
    };
  }

  /**
   * Clean up synced events older than X days
   */
  async cleanupOldEvents(daysToKeep: number = 7): Promise<number> {
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    const oldEvents = await offlineDB.outbox
      .where('synced')
      .equals(1) // true
      .and(e => e.created_at < cutoff)
      .toArray();

    if (oldEvents.length > 0) {
      await offlineDB.outbox.bulkDelete(oldEvents.map(e => e.id));
      console.log(`🧹 Cleaned up ${oldEvents.length} old synced events`);
    }

    return oldEvents.length;
  }

  /**
   * Retry failed events
   */
  async retryFailedEvents(maxAttempts: number = 5): Promise<OutboxEvent[]> {
    return await offlineDB.outbox
      .where('synced')
      .equals(0)
      .and(e => e.sync_attempts < maxAttempts)
      .toArray();
  }

  /**
   * Get events by type
   */
  async getEventsByType(eventType: string, limit: number = 100): Promise<OutboxEvent[]> {
    return await offlineDB.outbox
      .where('event_type')
      .equals(eventType)
      .limit(limit)
      .toArray();
  }

  /**
   * Delete event (use with caution)
   */
  async deleteEvent(eventId: string): Promise<void> {
    await offlineDB.outbox.delete(eventId);
  }

  /**
   * Clear all events for a store (dangerous - use for testing only)
   */
  async clearAllEvents(storeId: string): Promise<void> {
    await offlineDB.outbox.where('store_id').equals(storeId).delete();
  }
}

// Export singleton instance
export const outboxService = new OutboxService();
