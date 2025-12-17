// Centralized App Version Configuration
// Update this when releasing new versions

export const APP_VERSION = {
  name: 'CROFFLE STORE SYNC POS',
  version: '1.0.0',
  fullName: 'CROFFLE STORE SYNC POS v1.0.0',
  // BIR accreditation display format
  birDisplayName: 'CROFFLE STORE SYNC POS',
  birVersion: 'Version 1.0.0',
} as const;

// Format for display on screens
export const getAppVersionDisplay = () => `${APP_VERSION.name} v${APP_VERSION.version}`;

// Format for BIR compliance (receipts, reports)
export const getBIRVersionDisplay = () => `${APP_VERSION.birDisplayName}\n${APP_VERSION.birVersion}`;
