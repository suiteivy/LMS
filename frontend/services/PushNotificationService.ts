/**
 * PushNotificationService
 * 
 * Production-ready push notification service for Cloudora LMS:
 * - Device registration with Expo Push Service (APNs on iOS, FCM on Android)
 * - Android high-importance notification channel configuration
 * - Permission requests and token management with Supabase persistence
 * - In-app foreground notification presentation handler
 * - Deep-link routing on notification tap
 * - Per-category notification routing (announcements, grades, attendance, etc.)
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { supabase } from '@/libs/supabase';
import { logger } from '@/services/LoggingService';

// Configure foreground presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationPayload {
  title?: string;
  body?: string;
  data?: {
    route?: string;
    type?: 'announcement' | 'assignment' | 'grade' | 'attendance' | 'exam' | 'chat' | 'general';
    id?: string;
    url?: string;
    [key: string]: any;
  };
}

class PushNotificationService {
  private pushToken: string | null = null;
  private notificationListener: { remove: () => void } | null = null;
  private responseListener: { remove: () => void } | null = null;
  private isInitialized = false;

  /**
   * Initialize notification listeners and handlers.
   * Call once during app mount.
   */
  public init() {
    if (this.isInitialized || Platform.OS === 'web') return;
    this.isInitialized = true;

    // Listen for incoming notifications while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      logger.info('Notification received in foreground:', notification.request.content.title);
    });

    // Handle user tapping on a notification in the system tray
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      this.handleNotificationTap(data);
    });
  }

  /**
   * Request notification permissions and register device token with Supabase.
   * Should be called after onboarding or upon user authentication.
   */
  public async registerForPushNotifications(userId?: string): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      // 1. Android notification channel setup
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('cloudora-default', {
          name: 'Cloudora Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B00',
          sound: 'default',
        });
      }

      // 2. Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // 3. Request permissions if not yet granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.info('Push notification permission not granted.');
        return null;
      }

      // 4. Obtain Expo Push Token
      const tokenData = await Notifications.getExpoPushTokenAsync();
      this.pushToken = tokenData.data;

      // 5. Associate token with the user on the backend
      if (userId && this.pushToken) {
        await this.syncTokenWithBackend(userId, this.pushToken);
      }

      return this.pushToken;
    } catch (error: any) {
      logger.error('Failed to register push token:', error?.message);
      return null;
    }
  }

  /**
   * Persist device push token to backend for targeted dispatch.
   */
  private async syncTokenWithBackend(userId: string, token: string) {
    try {
      // Store in user metadata or device tokens table
      await (supabase as any).from('user_devices').upsert(
        {
          user_id: userId,
          push_token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,push_token' }
      );
    } catch {
      // Fallback: update push_token column on users table if user_devices doesn't exist
      try {
        await (supabase as any).from('users')
          .update({ push_token: token })
          .eq('id', userId);
      } catch {
        // Non-blocking
      }
    }
  }

  /**
   * Navigate to the appropriate screen when user taps a notification.
   */
  public handleNotificationTap(data?: any) {
    if (!data) return;

    try {
      // 1. Explicit route provided
      if (data.route) {
        router.push(data.route as any);
        return;
      }

      // 2. Categorical route mapping
      switch (data.type) {
        case 'announcement':
          router.push('/notifications' as any);
          break;
        case 'assignment':
          if (data.id) {
            router.push({ pathname: '/assignments/[id]', params: { id: data.id } } as any);
          }
          break;
        case 'attendance':
          router.push('/attendance' as any);
          break;
        case 'grade':
          router.push('/grades' as any);
          break;
        case 'chat':
          router.push('/communication' as any);
          break;
        default:
          router.push('/notifications' as any);
          break;
      }
    } catch (e: any) {
      logger.error('Failed to navigate from notification:', e?.message);
    }
  }

  /**
   * Clean up listeners when component unmounts.
   */
  public cleanup() {
    this.notificationListener?.remove();
    this.responseListener?.remove();
    this.isInitialized = false;
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
