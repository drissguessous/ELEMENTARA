import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elementara.game',
  appName: 'Elementara',
  webDir: 'dist',
  backgroundColor: '#120c24',
  android: { allowMixedContent: false, captureInput: true, webContentsDebuggingEnabled: false },
  ios: { contentInset: 'never', scrollEnabled: false },
};

export default config;
