import {
  ConfigPlugin,
  withAndroidManifest,
  withInfoPlist,
  AndroidConfig,
} from 'expo/config-plugins';

/**
 * Expo Config Plugin for Razorpay Payment Gateway Integration
 * Configures AndroidManifest and Info.plist for Razorpay checkout, UPI apps, and deep linking return callbacks.
 */
export const withRazorpay: ConfigPlugin = (config) => {
  // 1. Android Configuration
  config = withAndroidManifest(config, (modConfig) => {
    // Ensure package visibility queries for UPI & Razorpay apps (Android 11+ requirements)
    if (!modConfig.modResults.manifest.queries) {
      modConfig.modResults.manifest.queries = [];
    }

    const queries = modConfig.modResults.manifest.queries;
    const packagesToQuery = [
      'com.google.android.apps.nbu.paisa.user', // Google Pay
      'com.phonepe.app',                         // PhonePe
      'net.one97.paytm',                         // Paytm
      'in.org.npci.upiapp',                      // BHIM
      'com.dreamplug.androidapp',                 // CRED
      'com.whatsapp',                            // WhatsApp Pay
      'in.amazon.mShop.android.shopping',        // Amazon Pay
    ];

    packagesToQuery.forEach((pkgName) => {
      const exists = queries.some(
        (q) => q.package && q.package.some((p) => p.$?.['android:name'] === pkgName)
      );
      if (!exists) {
        queries.push({
          package: [{ $: { 'android:name': pkgName } }],
        });
      }
    });

    // Add intent filters for UPI and Razorpay URL schemes
    const schemes = ['upi', 'rzp'];
    schemes.forEach((scheme) => {
      const exists = queries.some(
        (q) => q.intent && q.intent.some((i) => i.data && i.data.some((d) => d.$?.['android:scheme'] === scheme))
      );
      if (!exists) {
        queries.push({
          intent: [
            {
              action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
              data: [{ $: { 'android:scheme': scheme } }],
            },
          ],
        });
      }
    });

    return modConfig;
  });

  // 2. iOS Configuration
  config = withInfoPlist(config, (modConfig) => {
    const infoPlist = modConfig.modResults;

    // Add Razorpay and UPI apps to LSApplicationQueriesSchemes
    const existingSchemes = (infoPlist.LSApplicationQueriesSchemes as string[]) || [];
    const requiredSchemes = [
      'razorpay',
      'upi',
      'gpay',
      'phonepe',
      'paytmmp',
      'bhim',
      'credpay',
      'mobikwik',
    ];

    const mergedSchemes = Array.from(new Set([...existingSchemes, ...requiredSchemes]));
    infoPlist.LSApplicationQueriesSchemes = mergedSchemes;

    return modConfig;
  });

  return config;
};

export default withRazorpay;
