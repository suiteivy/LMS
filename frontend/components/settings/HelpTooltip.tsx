import React from 'react';
import { View, StyleSheet } from 'react-native';
import { HelpCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionTier, type SubscriptionTierInfo } from '@/hooks/useSubscriptionTier';
import { hasFeatureAccess, type SettingsRole } from './access';
import { SETTINGS_TOOLTIPS, type TooltipTargetId } from './tooltips.config';
import { Tooltip } from '@/components/common/Tooltip';

export interface HelpTooltipProps {
  id?: TooltipTargetId;
  targetId?: TooltipTargetId;
  role?: SettingsRole;
  tier?: SubscriptionTierInfo;
  size?: number;
  onLearnMore?: (anchor?: string) => void;
  style?: any;
}

export function isTooltipEnabled(id: TooltipTargetId, role: SettingsRole, tier: SubscriptionTierInfo): boolean {
  const entry = SETTINGS_TOOLTIPS[id];
  if (!entry) return false;
  if (entry.roles && !entry.roles.includes(role)) return false;
  return hasFeatureAccess(tier, entry.feature);
}

export function HelpTooltip({
  id,
  targetId,
  role: propRole,
  tier: propTier,
  size = 14,
  onLearnMore,
  style,
}: HelpTooltipProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const subTier = useSubscriptionTier();

  const tooltipId = (targetId || id) as TooltipTargetId;
  const role = propRole || (user?.role as SettingsRole) || 'admin';
  const tier = propTier || subTier;

  const entry = tooltipId ? SETTINGS_TOOLTIPS[tooltipId] : undefined;
  const enabled = isTooltipEnabled(tooltipId, role, tier);

  if (!enabled || !entry) return null;

  const muted = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <View style={[styles.inlineWrapper, style]}>
      <Tooltip
        id={tooltipId}
        targetId={tooltipId}
        title={entry.title}
        text={entry.text}
        learnMoreAnchor={entry.learnMoreAnchor}
        onLearnMore={onLearnMore}
        position="top"
      >
        <View style={styles.iconContainer}>
          <HelpCircle size={size} color={muted} />
        </View>
      </Tooltip>
    </View>
  );
}

const styles = StyleSheet.create({
  inlineWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  iconContainer: {
    padding: 3,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 24,
    minHeight: 24,
  },
});

export default HelpTooltip;
