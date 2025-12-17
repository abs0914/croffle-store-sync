// Centralized App Version Configuration
// Update this when releasing new versions

export const APP_VERSION = {
  name: 'PVOSyncPOS',
  version: '1.0.0',
  fullName: 'PVOSyncPOS v1.0.0',
  // BIR accreditation display format
  birDisplayName: 'PVOSyncPOS',
  birVersion: 'Version 1.0.0',
} as const;

// Format for display on screens
export const getAppVersionDisplay = () => `${APP_VERSION.name} v${APP_VERSION.version}`;

// Format for BIR compliance (receipts, reports)
export const getBIRVersionDisplay = () => `${APP_VERSION.birDisplayName}\n${APP_VERSION.birVersion}`;
