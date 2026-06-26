import { supabase } from '@/libs/supabase';

export function resolveAvatarUri(avatarUrl?: string | null): string | null {
  const raw = (avatarUrl || '').trim();
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const { data } = supabase.storage.from('avatars').getPublicUrl(raw);
  return data?.publicUrl || null;
}
