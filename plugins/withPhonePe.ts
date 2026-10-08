import {
  ConfigPlugin,
  withAndroidManifest,
  withInfoPlist,
  AndroidConfig,
} from 'expo/config-plugins';

/**
 * Expo Config Plugin for PhonePe Payment Gateway Integration
 * Configures AndroidManifest and Info.plist for native PhonePe SDK, UPI apps, and deep linking callbacks.
 */
export const withPhonePe: ConfigPlugin = (config) => {
  // 1. Android Configuration
  config = withAndroidManifest(config, (modConfig) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);

    // Ensure package visibility queries for UPI & PhonePe apps (Android 11+ requirements)
    if (!modConfig.modResults.manifest.queries) {
      modConfig.modResults.manifest.queries = [];
    }

    const queries = modConfig.modResults.manifest.queries;
    const packagesToQuery = [
      'com.phonepe.app',
      'com.phonepe.simulator',
      'net.one97.paytm',
      'com.google.android.apps.nbu.paisa.user',
      'in.org.npci.upiapp',
    ];

    packagesToQuery.forEach((pkgName) => {
      const exists = queries.some((q) => q.package && q.package.some((p) => p.$?.['android:name'] === pkgName));
      if (!exists) {
        queries.push({
          package: [{ $: { 'android:name': pkgName } }],
        });
      }
    });

    // Add intent for UPI URL scheme
    queries.push({
      intent: [
        {
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          data: [{ $: { 'android:scheme': 'upi' } }],
        },
      ],
    });

    return modConfig;
  });

  // 2. iOS Configuration
  config = withInfoPlist(config, (modConfig) => {
    const infoPlist = modConfig.modResults;

    // Add PhonePe and UPI apps to LSApplicationQueriesSchemes
    const existingSchemes = (infoPlist.LSApplicationQueriesSchemes as string[]) || [];
    const requiredSchemes = [
      'phonepe',
      'ppemerchantsdk',
      'paytmmp',
      'gpay',
      'bhim',
      'upi',
    ];

    const mergedSchemes = Array.from(new Set([...existingSchemes, ...requiredSchemes]));
    infoPlist.LSApplicationQueriesSchemes = mergedSchemes;

    return modConfig;
  });

  return config;
};

export default withPhonePe;
