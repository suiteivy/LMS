import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/libs/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface HelpContentItem {
  key: string;
  title: string;
  body: string;
  example?: string;
  language?: string;
}

const CACHE_PREFIX = 'lms_help_content_';

export function useHelpContent() {
  const { profile } = useAuth();
  const [contentMap, setContentMap] = useState<Record<string, HelpContentItem>>({});
  const institutionId = profile?.institution_id;

  const loadContent = useCallback(async () => {
    try {
      const cacheKey = `${CACHE_PREFIX}${institutionId || 'global'}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        setContentMap(JSON.parse(cached));
      }

      // Fetch dynamic content overrides from Supabase
      let query = supabase.from('help_content').select('key, title, body, example, language');
      if (institutionId) {
        query = query.or(`institution_id.eq.${institutionId},institution_id.is.null`);
      } else {
        query = query.is('institution_id', null);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const mapped: Record<string, HelpContentItem> = {};
        for (const item of data) {
          mapped[item.key] = {
            key: item.key,
            title: item.title,
            body: item.body,
            example: item.example,
            language: item.language,
          };
        }
        setContentMap(mapped);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(mapped));
      }
    } catch {
      // Graceful fallback to cached or static tooltips
    }
  }, [institutionId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const getContent = useCallback(
    (key: string): HelpContentItem | undefined => {
      return contentMap[key];
    },
    [contentMap]
  );

  return {
    contentMap,
    getContent,
    reload: loadContent,
  };
}
