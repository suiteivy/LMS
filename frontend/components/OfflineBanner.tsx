import React, { useEffect, useState } from 'react';
import { Text, View, Platform, TouchableOpacity } from 'react-native';
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
        top: Platform.OS === 'android' ? 52 : 10,
        left: 12,
        right: 12,
        zIndex: 99999,
        backgroundColor: '#7F1D1D',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
      }}
      accessibilityRole="alert"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.16)',
            marginRight: 10,
          }}
        >
          <WifiOff size={14} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800', letterSpacing: 0.2 }}>Offline mode</Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, marginTop: 1 }}>No internet connection</Text>
        </View>
      </View>

      {hasRetry ? (
        <TouchableOpacity
          onPress={handleRetry}
          disabled={retrying}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.28)',
            backgroundColor: 'rgba(255,255,255,0.12)',
            opacity: retrying ? 0.6 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel="Retry connection"
        >
          <RefreshCw size={13} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700', marginLeft: 6 }}>
            {retrying ? 'Retrying...' : 'Retry'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
