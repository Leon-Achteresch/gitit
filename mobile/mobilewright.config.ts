import { defineConfig } from 'mobilewright';

export default defineConfig({
  platform: 'ios',
  bundleId: 'host.exp.Exponent',
  deviceId: process.env.MW_DEVICE_ID,
  deviceName: /iPhone 17/,
  testDir: 'mw',
  timeout: 180_000,
  autoAppLaunch: false,
});
