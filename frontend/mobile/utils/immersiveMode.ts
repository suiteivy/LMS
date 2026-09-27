/**
 * Android Immersive Mode Setup
 * 
 * Configures modern edge-to-edge display on Android:
 * - System navigation bar auto-hides during normal interaction
 * - Reveals on a swipe gesture from screen edge as a transient overlay
 * - Avoids pushing or jumping the app layout
 * - System navigation bar background set to transparent
 */

import { Platform } from 'react-native';

export async function setupImmersiveMode() {
  if (Platform.OS !== 'android') return;

  try {
    const NavigationBar = await import('expo-navigation-bar');
    const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version || '0'), 10);

    // On Android 15+ (API 35+), edge-to-edge is mandatory and native.
    // Calling these deprecated methods emits warnings when edge-to-edge is enabled.
    if (apiLevel < 35) {
      // Draw behind system navigation bar
      await NavigationBar.setPositionAsync('absolute');
      // Transparent navigation bar surface
      await NavigationBar.setBackgroundColorAsync('#00000000');
      // Auto-hide navigation bar, reveal on edge swipe without re-layout
      await NavigationBar.setBehaviorAsync('overlay-swipe');
    }
    await NavigationBar.setVisibilityAsync('hidden');
  } catch {
    // Graceful fallback on devices that don't support custom navigation bar behavior
  }
}
