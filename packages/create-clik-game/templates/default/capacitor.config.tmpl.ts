// Capacitor config — rename to capacitor.config.ts and run:
//   npm install @capacitor/core @capacitor/cli
//   npx cap init {{name}} com.example.{{name}}
//   npx cap add android
//   npx cap add ios
//   npm run build && npx cap sync

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.{{name}}',
  appName: '{{name}}',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000',
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#000000',
    },
  },
};

export default config;
