import { useTheme } from '@/contexts/ThemeContext';
import { HelpCircle } from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';
import type { SubscriptionTierInfo } from '@/hooks/useSubscriptionTier';
import { hasFeatureAccess, type SettingsRole } from './access';
import { SETTINGS_TOOLTIPS, type TooltipTargetId } from './tooltips.config';

interface HelpTooltipProps {
  id: TooltipTargetId;
  role: SettingsRole;
  tier: SubscriptionTierInfo;
  onLearnMore?: (anchor?: string) => void;
}

export function isTooltipEnabled(id: TooltipTargetId, role: SettingsRole, tier: SubscriptionTierInfo): boolean {
  const entry = SETTINGS_TOOLTIPS[id];
  if (!entry) return false;
  if (entry.roles && !entry.roles.includes(role)) return false;
  return hasFeatureAccess(tier, entry.feature);
}

export function HelpTooltip({ id, role, tier, onLearnMore }: HelpTooltipProps) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const entry = SETTINGS_TOOLTIPS[id];
  const enabled = useMemo(() => isTooltipEnabled(id, role, tier), [id, role, tier]);

  if (!enabled || !entry) return null;

  const bg = isDark ? '#13103A' : '#FFFFFF';
  const text = isDark ? '#F9FAFB' : '#111827';
  const muted = isDark ? '#9CA3AF' : '#6B7280';
  const border = isDark ? 'rgba(255,255,255,0.12)' : '#E5E7EB';

  const clearHoverTimer = () => {
    if (hoverCloseTimer.current) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  };

  const openTooltip = () => {
    clearHoverTimer();
    setOpen(true);
  };

  const closeTooltipSoon = () => {
    clearHoverTimer();
    hoverCloseTimer.current = setTimeout(() => setOpen(false), 120);
  };

  const trigger = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.title} help`}
      accessibilityHint={entry.text}
      onHoverIn={Platform.OS === 'web' ? openTooltip : undefined}
      onHoverOut={Platform.OS === 'web' ? closeTooltipSoon : undefined}
      onFocus={openTooltip}
      onBlur={closeTooltipSoon}
      onPress={(e) => {
        const t = e.nativeEvent;
        setAnchor({ x: t.pageX, y: t.pageY, w: t.locationX, h: t.locationY });
        openTooltip();
      }}
      onLongPress={openTooltip}
      style={{ marginLeft: 6, padding: 2 }}
    >
      <HelpCircle size={14} color={muted} />
    </Pressable>
  );

  const popup = (
    <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }} onPress={() => setOpen(false)}>
        <View
          style={{
            position: 'absolute',
            top: Math.max(24, anchor.y - 96),
            left: 16,
            right: 16,
            backgroundColor: bg,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            padding: 12,
          }}
        >
          <Text style={{ color: text, fontWeight: '700', fontSize: 12, marginBottom: 4 }}>{entry.title}</Text>
          <Text style={{ color: muted, fontSize: 12, marginBottom: 8 }}>{entry.text}</Text>
          {entry.learnMoreAnchor ? (
            <TouchableOpacity
              onPress={() => {
                setOpen(false);
                onLearnMore?.(entry.learnMoreAnchor);
              }}
              accessibilityRole="button"
              accessibilityLabel="Learn more"
            >
              <Text style={{ color: '#FF6B00', fontSize: 12, fontWeight: '700' }}>Learn more →</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </Pressable>
    </Modal>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
        {trigger}
        {open ? (
          <View
            onTouchStart={clearHoverTimer}
            style={{
              position: 'absolute',
              top: 20,
              left: 24,
              minWidth: 240,
              maxWidth: 320,
              backgroundColor: bg,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: border,
              padding: 10,
              zIndex: 9999,
              boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 12, color: 'rgba(0,0,0,0.15)' }],
              elevation: 8,
            }}
          >
            <Text style={{ color: text, fontWeight: '700', fontSize: 12, marginBottom: 4 }}>{entry.title}</Text>
            <Text style={{ color: muted, fontSize: 12, marginBottom: 8 }}>{entry.text}</Text>
            {entry.learnMoreAnchor ? (
              <TouchableOpacity
                onPress={() => {
                  setOpen(false);
                  onLearnMore?.(entry.learnMoreAnchor);
                }}
                accessibilityRole="button"
                accessibilityLabel="Learn more"
              >
                <Text style={{ color: '#FF6B00', fontSize: 12, fontWeight: '700' }}>Learn more →</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {trigger}
      {popup}
    </View>
  );
}
