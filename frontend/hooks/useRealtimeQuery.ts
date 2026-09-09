import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/libs/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const POLL_INTERVAL_MS = 60000;
const __DEV__ = process.env.NODE_ENV !== 'production';

/**
 * A generic hook to subscribe to Supabase realtime changes for a specific table.
 * - Waits for auth session before subscribing
 * - Retries with exponential backoff on CHANNEL_ERROR
 * - Falls back to polling if realtime exhausted retries
 * - Provides `realtimeUnavailable` state for UI
 */
export function useRealtimeQuery(
  tableName: string,
  onUpdate: () => void,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
) {
  const [realtimeUnavailable, setRealtimeUnavailable] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retriesRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const onUpdateRef = useRef(onUpdate);

  // Keep callback ref fresh without re-subscribing
  onUpdateRef.current = onUpdate;

  // Stable callback that always calls latest onUpdate
  const handleUpdate = useCallback(() => {
    onUpdateRef.current();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let channel: RealtimeChannel;
    let authUnsub: { unsubscribe: () => void } | null = null;

    const cleanup = () => {
      if (channel) {
        supabase.removeChannel(channel);
        channelRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    const startPolling = () => {
      if (pollingRef.current || !mountedRef.current) return;
      setRealtimeUnavailable(true);
      pollingRef.current = setInterval(async () => {
        if (!mountedRef.current) return;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session || (session.expires_at && session.expires_at * 1000 <= Date.now())) return;
          handleUpdate();
        } catch {
          // ignore
        }
      }, POLL_INTERVAL_MS);
    };

    const setupSubscription = async () => {
      // Auth readiness guard: wait for a valid session.
      // Do NOT start polling just because auth isn't ready yet.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !mountedRef.current) {
          return;
        }
        if (session.expires_at && session.expires_at * 1000 <= Date.now()) {
          return;
        }
      } catch {
        return;
      }

      channel = supabase
        .channel(`public:${tableName}-changes-${Date.now()}`)
        .on(
          'postgres_changes',
          { event, schema: 'public', table: tableName },
          () => { handleUpdate(); }
        )
        .subscribe((status) => {
          if (!mountedRef.current) return;

          if (status === 'SUBSCRIBED') {
            retriesRef.current = 0;
            setRealtimeUnavailable(false);
          } else if (status === 'CHANNEL_ERROR') {
            retriesRef.current++;
            if (retriesRef.current > MAX_RETRIES) {
              cleanup();
              startPolling();
              return;
            }
            const delay = Math.min(INITIAL_BACKOFF_MS * Math.pow(2, retriesRef.current - 1), MAX_BACKOFF_MS);
            // Remove failed channel and retry after delay
            supabase.removeChannel(channel);
            if (mountedRef.current) {
              setTimeout(() => {
                if (mountedRef.current) setupSubscription();
              }, delay);
            }
          }
        });

      channelRef.current = channel;
    };

    setupSubscription();

    // Re-attempt subscription when auth session becomes available.
    const authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return;

      if (session?.access_token) {
        if (!channelRef.current) {
          setupSubscription();
        }
      } else {
        cleanup();
      }
    });

    authUnsub = authSubscription.data.subscription;

    return () => {
      cleanup();
      if (authUnsub) authUnsub.unsubscribe();
    };
  }, [tableName, event, handleUpdate]);

  return { realtimeUnavailable };
}
