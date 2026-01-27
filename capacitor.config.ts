import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vendormobile.app',
  appName: 'Vendor Mobile',
  webDir: 'dist',
  android: {
    useLegacyBridge: true
  }
};

export default config;
