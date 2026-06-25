import { useTheme } from '@/contexts/ThemeContext';
import { HelpCircle } from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, Modal, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';
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
  const [anchor, setAnchor] = useState({ x: 0, y: 0, w: 20, h: 20 });
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<View | null>(null);

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

  const updateAnchorFromTrigger = () => {
    const node = triggerRef.current as any;
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((x: number, y: number, w: number, h: number) => {
      if (Number.isFinite(x) && Number.isFinite(y)) {
        setAnchor({
          x: Math.max(0, x),
          y: Math.max(0, y),
          w: Math.max(1, w || 1),
          h: Math.max(1, h || 1),
        });
      }
    });
  };

  const openTooltip = () => {
    clearHoverTimer();
    updateAnchorFromTrigger();
    setOpen(true);
  };

  const closeTooltipSoon = () => {
    clearHoverTimer();
    hoverCloseTimer.current = setTimeout(() => setOpen(false), 120);
  };

  const trigger = (
    <Pressable
      ref={(node) => {
        triggerRef.current = node;
      }}
      accessibilityRole="button"
      accessibilityLabel={`${entry.title} help`}
      accessibilityHint={entry.text}
      onHoverIn={Platform.OS === 'web' ? openTooltip : undefined}
      onHoverOut={Platform.OS === 'web' ? closeTooltipSoon : undefined}
      onFocus={openTooltip}
      onBlur={closeTooltipSoon}
      onPress={openTooltip}
      onLongPress={openTooltip}
      style={{ marginLeft: 6, padding: 2 }}
    >
      <HelpCircle size={14} color={muted} />
    </Pressable>
  );

  const viewport = Dimensions.get('window');
  const cardWidth = Math.min(340, Math.max(240, viewport.width - 32));
  const preferredLeft = anchor.x + anchor.w + 10;
  const left = Math.max(12, Math.min(preferredLeft, viewport.width - cardWidth - 12));
  const top = Math.max(12, Math.min(anchor.y - 12, viewport.height - 180));

  const popup = (
    <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }} onPress={() => setOpen(false)}>
        <Pressable
          onHoverIn={Platform.OS === 'web' ? clearHoverTimer : undefined}
          onHoverOut={Platform.OS === 'web' ? closeTooltipSoon : undefined}
          onPress={() => {}}
          style={{
            position: 'absolute',
            top,
            left,
            width: cardWidth,
            backgroundColor: bg,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            padding: 12,
            zIndex: 99999,
            elevation: 16,
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
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {trigger}
      {popup}
    </View>
  );
}
