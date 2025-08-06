/**
 * SMS Status Manager
 * 
 * Handles automatic status progression for SMS messages:
 * - 'sent' → 'delivered' after 60 seconds
 * - Provides client-side status updates for better UX
 */

import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

export type SMSStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface StatusUpdate {
  messageId: string;
  newStatus: SMSStatus;
  timestamp: Date;
}

class SMSStatusManager {
  private updateQueue: Map<string, NodeJS.Timeout> = new Map();
  private statusCallbacks: Map<string, (status: SMSStatus) => void> = new Map();

  /**
   * Schedule a status update for a message
   * @param messageId The database ID of the message
   * @param currentStatus The current status of the message
   * @param onStatusChange Callback function to call when status changes
   */
  scheduleStatusUpdate(
    messageId: string, 
    currentStatus: SMSStatus,
    onStatusChange?: (status: SMSStatus) => void
  ): void {
    // Clear any existing update for this message
    this.clearScheduledUpdate(messageId);

    // Store the callback if provided
    if (onStatusChange) {
      this.statusCallbacks.set(messageId, onStatusChange);
    }

    // Only schedule updates for 'sent' messages
    if (currentStatus === 'sent') {
      const timeoutId = setTimeout(() => {
        this.updateMessageStatus(messageId, 'delivered');
      }, 60000); // 60 seconds

      this.updateQueue.set(messageId, timeoutId);
      
      logger.debug('SMS status update scheduled', { 
        metadata: { messageId, currentStatus, delayMs: 60000 } 
      });
    }
  }

  /**
   * Clear a scheduled status update
   * @param messageId The message ID to clear
   */
  clearScheduledUpdate(messageId: string): void {
    const existingTimeout = this.updateQueue.get(messageId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.updateQueue.delete(messageId);
      this.statusCallbacks.delete(messageId);
    }
  }

  /**
   * Update message status in the database and trigger callbacks
   * @param messageId The database ID of the message
   * @param newStatus The new status to set
   */
  private async updateMessageStatus(messageId: string, newStatus: SMSStatus): Promise<void> {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('messages')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) {
        logger.error('Failed to update message status', error as Error, {
          metadata: { messageId, newStatus }
        });
        return;
      }

      logger.info('Message status updated', {
        metadata: { messageId, newStatus }
      });

      // Trigger callback if exists
      const callback = this.statusCallbacks.get(messageId);
      if (callback) {
        callback(newStatus);
        this.statusCallbacks.delete(messageId);
      }

      // Clean up
      this.updateQueue.delete(messageId);

    } catch (error) {
      logger.error('Exception updating message status', error as Error, {
        metadata: { messageId, newStatus }
      });
    }
  }

  /**
   * Manually update a message status (e.g., from webhook or error)
   * @param messageId The database ID of the message
   * @param newStatus The new status to set
   */
  async manualStatusUpdate(messageId: string, newStatus: SMSStatus): Promise<void> {
    // Clear any scheduled updates
    this.clearScheduledUpdate(messageId);
    
    // Update immediately
    await this.updateMessageStatus(messageId, newStatus);
  }

  /**
   * Get estimated time until status change
   * @param messageId The message ID
   * @returns Estimated seconds until status change, or null if no update scheduled
   */
  getTimeUntilUpdate(messageId: string): number | null {
    const timeout = this.updateQueue.get(messageId);
    if (!timeout) return null;

    // This is an approximation since we can't get exact remaining time from setTimeout
    return 60; // Assume full 60 seconds for simplicity
  }

  /**
   * Check if a message has a scheduled update
   * @param messageId The message ID
   * @returns True if update is scheduled
   */
  hasScheduledUpdate(messageId: string): boolean {
    return this.updateQueue.has(messageId);
  }

  /**
   * Clean up all scheduled updates (call on component unmount)
   */
  cleanup(): void {
    for (const [, timeoutId] of this.updateQueue.entries()) {
      clearTimeout(timeoutId);
    }
    this.updateQueue.clear();
    this.statusCallbacks.clear();
  }

  /**
   * Get the number of currently scheduled updates
   */
  getScheduledCount(): number {
    return this.updateQueue.size;
  }
}

// Export singleton instance
export const smsStatusManager = new SMSStatusManager();

/**
 * Utility function to get user-friendly status text in Swedish
 */
export function getStatusText(status: SMSStatus): string {
  switch (status) {
    case 'pending':
      return 'Väntar';
    case 'sent':
      return 'Skickat';
    case 'delivered':
      return 'Levererat';
    case 'failed':
      return 'Misslyckat';
    default:
      return 'Okänd';
  }
}

/**
 * Utility function to get status color classes
 */
export function getStatusColorClasses(status: SMSStatus): string {
  switch (status) {
    case 'pending':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    case 'sent':
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
    case 'delivered':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'failed':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
  }
}

/**
 * Hook for React components to use SMS status updates
 */
export function useSMSStatusUpdates() {
  return {
    scheduleUpdate: (messageId: string, currentStatus: SMSStatus, callback?: (status: SMSStatus) => void) => {
      smsStatusManager.scheduleStatusUpdate(messageId, currentStatus, callback);
    },
    clearUpdate: (messageId: string) => {
      smsStatusManager.clearScheduledUpdate(messageId);
    },
    manualUpdate: (messageId: string, newStatus: SMSStatus) => {
      return smsStatusManager.manualStatusUpdate(messageId, newStatus);
    },
    cleanup: () => {
      smsStatusManager.cleanup();
    },
    hasScheduledUpdate: (messageId: string) => {
      return smsStatusManager.hasScheduledUpdate(messageId);
    },
    getScheduledCount: () => {
      return smsStatusManager.getScheduledCount();
    }
  };
}