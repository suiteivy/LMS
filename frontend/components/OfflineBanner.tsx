import React, { useEffect, useRef, useState } from 'react';
import { Text, View, Platform, TouchableOpacity } from 'react-native';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react-native';
import { usePathname } from 'expo-router';
import { isOffline, onOfflineChange, retryLastRequest, getPendingRetry } from '@/services/api';
import { showWarning, showSuccess } from '@/utils/toast';

export function OfflineBanner() {
  const [offline, setOffline] = useState(isOffline());
  const [retrying, setRetrying] = useState(false);
  const [hasRetry, setHasRetry] = useState(!!getPendingRetry());
  const pathname = usePathname();
  const prevOfflineRef = useRef(offline);

  const isLandingPage = !pathname || pathname === '/' || pathname === '/index';

  useEffect(() => {
    const unsub = onOfflineChange((val) => {
      setOffline(val);
      setHasRetry(!!getPendingRetry());

      // Show toast on transition if not on landing page
      if (!isLandingPage) {
        if (val && !prevOfflineRef.current) {
          showWarning('Offline Mode', 'No internet connection. Some features may be unavailable.');
        } else if (!val && prevOfflineRef.current) {
          showSuccess('Back Online', 'Internet connection restored.');
        }
      }
      prevOfflineRef.current = val;
    });
    return unsub;
  }, [isLandingPage]);

  useEffect(() => {
    if (!offline) return;
    const interval = setInterval(() => {
      setHasRetry(!!getPendingRetry());
    }, 2500);
    return () => clearInterval(interval);
  }, [offline]);

  // Never render on landing page or when online
  if (!offline || isLandingPage) return null;

  const handleRetry = async () => {
    if (retrying || !getPendingRetry()) return;
    setRetrying(true);
    try {
      await retryLastRequest();
    } catch {}
    setRetrying(false);
    setHasRetry(!!getPendingRetry());
  };

  return (
    <View
      style={{
        position: 'absolute',
        top: Platform.OS === 'android' ? 44 : 12,
        right: 16,
        zIndex: 99999,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(185, 28, 28, 0.92)',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
      }}
      accessibilityRole="alert"
      accessibilityLabel="Offline indicator"
    >
      <WifiOff size={13} color="#ffffff" style={{ marginRight: 6 }} />
      <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700', letterSpacing: 0.2 }}>
        Offline
      </Text>

      {hasRetry && (
        <TouchableOpacity
          onPress={handleRetry}
          disabled={retrying}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: 8,
            paddingLeft: 8,
            borderLeftWidth: 1,
            borderLeftColor: 'rgba(255, 255, 255, 0.3)',
            opacity: retrying ? 0.6 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel="Retry failed request"
        >
          <RefreshCw size={11} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>
            {retrying ? '...' : 'Retry'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
