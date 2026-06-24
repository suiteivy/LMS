import { useTheme } from '@/contexts/ThemeContext';
import type { SubscriptionTierInfo } from '@/hooks/useSubscriptionTier';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ReferenceManual } from './ReferenceManual';
import type { SettingsRole } from './access';

type SettingsTab = 'preferences' | 'manual';

interface SettingsWithManualProps {
  role: SettingsRole;
  tier: SubscriptionTierInfo;
  initialTab?: SettingsTab;
  initialManualAnchor?: string;
  settingsContent: React.ReactNode;
  onTabChange?: (tab: SettingsTab) => void;
}

export function SettingsWithManual({
  role,
  tier,
  initialTab = 'preferences',
  initialManualAnchor,
  settingsContent,
  onTabChange,
}: SettingsWithManualProps) {
  const { isDark } = useTheme();
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [manualAnchor, setManualAnchor] = useState<string | undefined>(initialManualAnchor);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    onTabChange?.(tab);
  }, [tab, onTabChange]);

  useEffect(() => {
    if (initialManualAnchor) setManualAnchor(initialManualAnchor);
  }, [initialManualAnchor]);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0F0B2E' : '#F9FAFB' }}>
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 12,
          marginBottom: 8,
          backgroundColor: isDark ? '#13103A' : '#FFFFFF',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E5E7EB',
          padding: 4,
          flexDirection: 'row',
        }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setTab('preferences')}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: tab === 'preferences' ? '#FF6B00' : 'transparent',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: tab === 'preferences' ? '#FFFFFF' : isDark ? '#E5E7EB' : '#111827', fontSize: 12, fontWeight: '700' }}>
            Settings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setTab('manual')}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: tab === 'manual' ? '#FF6B00' : 'transparent',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: tab === 'manual' ? '#FFFFFF' : isDark ? '#E5E7EB' : '#111827', fontSize: 12, fontWeight: '700' }}>
            Reference Manual
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'preferences' ? settingsContent : <ReferenceManual role={role} tier={tier} initialAnchor={manualAnchor} />}
      </View>
    </View>
  );
}
