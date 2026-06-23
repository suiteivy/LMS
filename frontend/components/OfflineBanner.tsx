import React, { useEffect, useState } from 'react';
import { Text, View, Platform } from 'react-native';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { isOffline, onOfflineChange, retryLastRequest, getPendingRetry } from '@/services/api';

export function OfflineBanner() {
  const [offline, setOffline] = useState(isOffline());
  const [retrying, setRetrying] = useState(false);
  const [hasRetry, setHasRetry] = useState(!!getPendingRetry());

  useEffect(() => {
    const unsub = onOfflineChange((val) => {
      setOffline(val);
      setHasRetry(!!getPendingRetry());
    });
    return unsub;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHasRetry(!!getPendingRetry());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!offline) return null;

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
        top: Platform.OS === 'android' ? 48 : 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        backgroundColor: '#dc2626',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 10,
      }}
      accessibilityRole="alert"
    >
      <WifiOff size={16} color="#ffffff" />
      <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'center' }}>
        No internet connection
      </Text>
      {hasRetry && (
        <RefreshCw
          size={14}
          color="#ffffff"
          style={{ opacity: retrying ? 0.4 : 1 }}
        />
      )}
    </View>
  );
}
