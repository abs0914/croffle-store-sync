/**
 * ENHANCED NETWORK DETECTION SERVICE
 * 
 * Advanced network monitoring with:
 * - Multi-level connectivity detection (online/offline/poor)
 * - Network quality assessment (RTT, bandwidth, connection type)
 * - Capacitor Network plugin integration for mobile
 * - Intelligent sync decision making based on network conditions
 * - Background monitoring with event-driven updates
 */

import { Capacitor } from '@capacitor/core';
import { Network, ConnectionStatus, ConnectionType } from '@capacitor/network';

export interface NetworkQuality {
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  rtt?: number; // Round-trip time in ms
  downlink?: number; // Bandwidth in Mbps
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  connectionType: ConnectionType;
  isMetered?: boolean;
  timestamp: number;
}

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  justReconnected: boolean;
  quality: NetworkQuality;
  stableConnection: boolean;
  lastQualityCheck: number;
  connectionHistory: NetworkQuality[];
}

export interface SyncRecommendation {
  shouldSync: boolean;
  priority: 'immediate' | 'delayed' | 'background' | 'wait';
  reason: string;
  estimatedTime?: number;
  batchSize?: number;
}

export type NetworkEventCallback = (status: NetworkStatus) => void;

export class EnhancedNetworkDetectionService {
  private static instance: EnhancedNetworkDetectionService;
  private currentStatus: NetworkStatus;
  private listeners: Set<NetworkEventCallback> = new Set();
  private qualityCheckInterval: NodeJS.Timeout | null = null;
  private connectionStabilityTimer: NodeJS.Timeout | null = null;
  private readonly QUALITY_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly STABILITY_THRESHOLD = 10000; // 10 seconds
  private readonly HISTORY_LIMIT = 20;

  private constructor() {
    this.currentStatus = {
      isOnline: navigator.onLine,
      wasOffline: false,
      justReconnected: false,
      quality: {
        level: 'offline',
        connectionType: 'none',
        timestamp: Date.now()
      },
      stableConnection: false,
      lastQualityCheck: 0,
      connectionHistory: []
    };
  }

  static getInstance(): EnhancedNetworkDetectionService {
    if (!EnhancedNetworkDetectionService.instance) {
      EnhancedNetworkDetectionService.instance = new EnhancedNetworkDetectionService();
    }
    return EnhancedNetworkDetectionService.instance;
  }

  /**
   * Initialize network monitoring
   */
  async initialize(): Promise<void> {
    console.log('🌐 Initializing Enhanced Network Detection Service...');

    try {
      // Initial network status check
      await this.updateNetworkStatus();

      // Set up platform-specific monitoring
      if (Capacitor.isNativePlatform()) {
        await this.initializeCapacitorNetworking();
      } else {
        this.initializeWebNetworking();
      }

      // Start periodic quality checks
      this.startQualityMonitoring();

      console.log('✅ Enhanced Network Detection Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize network detection:', error);
      // Continue with basic web networking as fallback
      this.initializeWebNetworking();
    }
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  /**
   * Get sync recommendation based on current network conditions
   */
  getSyncRecommendation(transactionCount: number = 1, totalDataSize: number = 1024): SyncRecommendation {
    const { isOnline, quality, stableConnection } = this.currentStatus;

    if (!isOnline) {
      return {
        shouldSync: false,
        priority: 'wait',
        reason: 'No network connection available'
      };
    }

    if (!stableConnection) {
      return {
        shouldSync: false,
        priority: 'wait',
        reason: 'Connection is unstable, waiting for stability'
      };
    }

    // Determine sync strategy based on network quality
    switch (quality.level) {
      case 'excellent':
        return {
          shouldSync: true,
          priority: 'immediate',
          reason: 'Excellent network conditions',
          estimatedTime: Math.ceil(transactionCount * 1.5), // 1.5s per transaction
          batchSize: Math.min(transactionCount, 20)
        };

      case 'good':
        return {
          shouldSync: true,
          priority: 'immediate',
          reason: 'Good network conditions',
          estimatedTime: Math.ceil(transactionCount * 2.5), // 2.5s per transaction
          batchSize: Math.min(transactionCount, 15)
        };

      case 'fair':
        return {
          shouldSync: true,
          priority: 'delayed',
          reason: 'Fair network conditions, using smaller batches',
          estimatedTime: Math.ceil(transactionCount * 4), // 4s per transaction
          batchSize: Math.min(transactionCount, 10)
        };

      case 'poor':
        return {
          shouldSync: transactionCount <= 5,
          priority: 'background',
          reason: 'Poor network conditions, only sync critical transactions',
          estimatedTime: Math.ceil(transactionCount * 8), // 8s per transaction
          batchSize: Math.min(transactionCount, 5)
        };

      default:
        return {
          shouldSync: false,
          priority: 'wait',
          reason: 'Network quality assessment pending'
        };
    }
  }

  /**
   * Add network status change listener
   */
  addListener(callback: NetworkEventCallback): void {
    this.listeners.add(callback);
  }

  /**
   * Remove network status change listener
   */
  removeListener(callback: NetworkEventCallback): void {
    this.listeners.delete(callback);
  }

  /**
   * Force network quality check
   */
  async checkNetworkQuality(): Promise<NetworkQuality> {
    try {
      const quality = await this.assessNetworkQuality();
      this.updateQualityHistory(quality);
      return quality;
    } catch (error) {
      console.error('❌ Network quality check failed:', error);
      return {
        level: 'offline',
        connectionType: 'none',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Initialize Capacitor network monitoring for mobile
   */
  private async initializeCapacitorNetworking(): Promise<void> {
    if (!Capacitor.isPluginAvailable('Network')) {
      throw new Error('Capacitor Network plugin not available');
    }

    // Get initial status
    const status = await Network.getStatus();
    await this.handleCapacitorNetworkChange(status);

    // Listen for network changes
    Network.addListener('networkStatusChange', (status) => {
      this.handleCapacitorNetworkChange(status);
    });

    console.log('📱 Capacitor network monitoring initialized');
  }

  /**
   * Initialize web-based network monitoring
   */
  private initializeWebNetworking(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.handleWebNetworkChange(true);
    });

    window.addEventListener('offline', () => {
      this.handleWebNetworkChange(false);
    });

    // Initial status
    this.handleWebNetworkChange(navigator.onLine);

    console.log('🌐 Web network monitoring initialized');
  }

  /**
   * Handle Capacitor network status changes
   */
  private async handleCapacitorNetworkChange(status: ConnectionStatus): Promise<void> {
    const wasOffline = !this.currentStatus.isOnline;
    const isNowOnline = status.connected;

    this.currentStatus.isOnline = isNowOnline;
    this.currentStatus.wasOffline = wasOffline;
    this.currentStatus.justReconnected = wasOffline && isNowOnline;

    if (isNowOnline) {
      // Assess network quality when coming online
      const quality = await this.assessNetworkQuality();
      this.currentStatus.quality = quality;
      this.updateQualityHistory(quality);
      this.startConnectionStabilityTimer();
    } else {
      this.currentStatus.quality = {
        level: 'offline',
        connectionType: status.connectionType,
        timestamp: Date.now()
      };
      this.currentStatus.stableConnection = false;
      this.clearConnectionStabilityTimer();
    }

    this.notifyListeners();
  }

  /**
   * Handle web network status changes
   */
  private async handleWebNetworkChange(isOnline: boolean): Promise<void> {
    const wasOffline = !this.currentStatus.isOnline;

    this.currentStatus.isOnline = isOnline;
    this.currentStatus.wasOffline = wasOffline;
    this.currentStatus.justReconnected = wasOffline && isOnline;

    if (isOnline) {
      const quality = await this.assessNetworkQuality();
      this.currentStatus.quality = quality;
      this.updateQualityHistory(quality);
      this.startConnectionStabilityTimer();
    } else {
      this.currentStatus.quality = {
        level: 'offline',
        connectionType: 'none',
        timestamp: Date.now()
      };
      this.currentStatus.stableConnection = false;
      this.clearConnectionStabilityTimer();
    }

    this.notifyListeners();
  }

  /**
   * Assess current network quality
   */
  private async assessNetworkQuality(): Promise<NetworkQuality> {
    const timestamp = Date.now();

    try {
      // Get connection info from various sources
      let connectionType: ConnectionType = 'unknown';
      let effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | undefined;
      let rtt: number | undefined;
      let downlink: number | undefined;

      // Try Capacitor Network plugin first
      if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Network')) {
        const status = await Network.getStatus();
        connectionType = status.connectionType;
      }

      // Try Web Network Information API
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          effectiveType = connection.effectiveType;
          rtt = connection.rtt;
          downlink = connection.downlink;
          if (!connectionType || connectionType === 'unknown') {
            connectionType = this.mapWebConnectionType(connection.type);
          }
        }
      }

      // Perform speed test if no connection info available
      if (!rtt && !downlink) {
        const speedTest = await this.performSpeedTest();
        rtt = speedTest.rtt;
        downlink = speedTest.downlink;
      }

      // Determine quality level
      const level = this.calculateQualityLevel(rtt, downlink, effectiveType);

      return {
        level,
        rtt,
        downlink,
        effectiveType,
        connectionType,
        timestamp
      };
    } catch (error) {
      console.error('❌ Network quality assessment failed:', error);
      return {
        level: 'poor',
        connectionType: 'unknown',
        timestamp
      };
    }
  }

  /**
   * Perform basic speed test
   */
  private async performSpeedTest(): Promise<{ rtt: number; downlink: number }> {
    const startTime = Date.now();
    
    try {
      // Use a small image for speed test
      const testUrl = `${window.location.origin}/favicon.ico?t=${Date.now()}`;
      const response = await fetch(testUrl, { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const rtt = Date.now() - startTime;
      
      // Estimate downlink based on RTT (rough approximation)
      let downlink = 1; // Default 1 Mbps
      if (rtt < 50) downlink = 10; // Excellent
      else if (rtt < 100) downlink = 5; // Good
      else if (rtt < 200) downlink = 2; // Fair
      else downlink = 0.5; // Poor

      return { rtt, downlink };
    } catch (error) {
      console.warn('Speed test failed, using defaults:', error);
      return { rtt: 1000, downlink: 0.5 };
    }
  }

  /**
   * Calculate quality level based on metrics
   */
  private calculateQualityLevel(
    rtt?: number, 
    downlink?: number, 
    effectiveType?: string
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    // Use effective type if available
    if (effectiveType) {
      switch (effectiveType) {
        case '4g': return 'excellent';
        case '3g': return 'good';
        case '2g': return 'fair';
        case 'slow-2g': return 'poor';
      }
    }

    // Use RTT and downlink
    if (rtt && downlink) {
      if (rtt < 50 && downlink > 5) return 'excellent';
      if (rtt < 100 && downlink > 2) return 'good';
      if (rtt < 200 && downlink > 1) return 'fair';
      return 'poor';
    }

    // Use RTT only
    if (rtt) {
      if (rtt < 50) return 'excellent';
      if (rtt < 100) return 'good';
      if (rtt < 200) return 'fair';
      return 'poor';
    }

    // Use downlink only
    if (downlink) {
      if (downlink > 5) return 'excellent';
      if (downlink > 2) return 'good';
      if (downlink > 1) return 'fair';
      return 'poor';
    }

    // Default to fair if no metrics available
    return 'fair';
  }

  /**
   * Map web connection type to Capacitor ConnectionType
   */
  private mapWebConnectionType(webType: string): ConnectionType {
    switch (webType?.toLowerCase()) {
      case 'wifi': return 'wifi';
      case 'cellular': return 'cellular';
      case 'ethernet': return 'wifi'; // Map ethernet to wifi
      default: return 'unknown';
    }
  }

  /**
   * Update network status
   */
  private async updateNetworkStatus(): Promise<void> {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Network')) {
      const status = await Network.getStatus();
      await this.handleCapacitorNetworkChange(status);
    } else {
      await this.handleWebNetworkChange(navigator.onLine);
    }
  }

  /**
   * Start periodic quality monitoring
   */
  private startQualityMonitoring(): void {
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
    }

    this.qualityCheckInterval = setInterval(async () => {
      if (this.currentStatus.isOnline) {
        await this.checkNetworkQuality();
      }
    }, this.QUALITY_CHECK_INTERVAL);
  }

  /**
   * Start connection stability timer
   */
  private startConnectionStabilityTimer(): void {
    this.clearConnectionStabilityTimer();
    
    this.connectionStabilityTimer = setTimeout(() => {
      this.currentStatus.stableConnection = true;
      this.notifyListeners();
    }, this.STABILITY_THRESHOLD);
  }

  /**
   * Clear connection stability timer
   */
  private clearConnectionStabilityTimer(): void {
    if (this.connectionStabilityTimer) {
      clearTimeout(this.connectionStabilityTimer);
      this.connectionStabilityTimer = null;
    }
  }

  /**
   * Update quality history
   */
  private updateQualityHistory(quality: NetworkQuality): void {
    this.currentStatus.connectionHistory.push(quality);
    
    // Keep only recent history
    if (this.currentStatus.connectionHistory.length > this.HISTORY_LIMIT) {
      this.currentStatus.connectionHistory = this.currentStatus.connectionHistory.slice(-this.HISTORY_LIMIT);
    }
    
    this.currentStatus.lastQualityCheck = Date.now();
  }

  /**
   * Notify all listeners of status changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.getNetworkStatus());
      } catch (error) {
        console.error('❌ Network listener callback failed:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
    }
    
    this.clearConnectionStabilityTimer();
    this.listeners.clear();
    
    console.log('🧹 Enhanced Network Detection Service destroyed');
  }
}
