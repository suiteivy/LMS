import { useEffect } from 'react';
import { supabase } from '@/libs/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * A generic hook to subscribe to Supabase realtime changes for a specific table.
 * Ensure that Replication is enabled for the table in the Supabase Dashboard.
 *
 * @param tableName The name of the table to listen to (e.g., 'subjects', 'books')
 * @param onUpdate The callback function to trigger when a change happens (usually a fetch function to refresh data)
 * @param event The event type to listen to ('INSERT', 'UPDATE', 'DELETE', or '*' for all). Defaults to '*'
 */
export function useRealtimeQuery(
  tableName: string,
  onUpdate: () => void,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
) {
  useEffect(() => {
    let channel: RealtimeChannel;

    const setupSubscription = () => {
      channel = supabase
        .channel(`public:${tableName}-changes`)
        .on(
          'postgres_changes',
          { event, schema: 'public', table: tableName },
          (payload) => {
            console.log(`[Realtime] Received ${payload.eventType} event on ${tableName}`);
            onUpdate();
          }
        )
        .subscribe((status) => {
             if (status === 'SUBSCRIBED') {
                 console.log(`[Realtime] Successfully subscribed to ${tableName} changes`);
             } else if (status === 'CHANNEL_ERROR') {
                 console.error(`[Realtime] Error subscribing to ${tableName} changes`);
             }
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [tableName, onUpdate, event]);
}
