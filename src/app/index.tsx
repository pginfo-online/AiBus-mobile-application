import React from 'react';
import { Redirect } from 'expo-router';

/**
 * App Entry Point — Immediate Guest Access
 *
 * Directs the user immediately to the Home screen without blocking on auth bootstrapping.
 * Auth verification and token hydration happen asynchronously in the background via RootLayout,
 * ensuring zero startup latency and no flashing loading indicators.
 */
export default function Index() {
  return <Redirect href={'/(tabs)/home' as any} />;
}
