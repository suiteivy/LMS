import { useTheme } from '@/contexts/ThemeContext';
import type { SubscriptionTierInfo } from '@/hooks/useSubscriptionTier';
import { Search, ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { hasFeatureAccess, type AccessFeatureKey, type SettingsRole } from './access';
import { SETTINGS_TOOLTIPS, type TooltipTargetId } from './tooltips.config';

type ManualSectionId =
  | 'promotion-engine'
  | 'grading-ops'
  | 'attendance-ops'
  | 'reports-ops'
  | 'billing-ops';

interface ManualSection {
  id: ManualSectionId;
  title: string;
  feature?: AccessFeatureKey;
  roles?: SettingsRole[];
  shortBlurb: string;
  whatItDoes: string;
  whatChanges: string;
  crossLinks: string[];
  deepDive?: {
    title: string;
    steps: string[];
    workedExample: string[];
    edgeCases: string[];
  };
}

const MODULES: ManualSection[] = [
  {
    id: 'promotion-engine',
    title: 'Promotion Engine',
    feature: 'promotion',
    roles: ['admin', 'teacher'],
    shortBlurb: SETTINGS_TOOLTIPS['promotion.preview'].text,
    whatItDoes:
      'Automates class progression by evaluating average performance and attendance against cycle thresholds, then records auditable decisions.',
    whatChanges:
      'Changing thresholds or source/target classes immediately changes who is retained or promoted when you preview/execute a cycle.',
    crossLinks: ['Results → Promotions', 'Settings → Notifications', 'Management → Subjects'],
    deepDive: {
      title: 'Decision logic walkthrough',
      steps: [
        '1) Build candidate pool from the selected From Class and Term scope.',
        '2) Evaluate score gate: average >= minimum average threshold.',
        '3) Evaluate attendance gate: attendance >= minimum attendance threshold.',
        '4) Resolve eligibility: both gates pass => eligible, otherwise retained.',
        '5) Apply overrides (if configured in cycle workflow) before final status persist.',
        '6) Preview writes decision rows; Execute moves eligible students and marks final statuses.',
      ],
      workedExample: [
        'Cycle: Grade 7 → Grade 8, Min Avg 50, Min Attendance 75.',
        'Student A: Avg 63, Attendance 82 => Eligible (promoted on execute).',
        'Student B: Avg 71, Attendance 69 => Retained unless explicitly overridden.',
        'Student C: Avg 48, Attendance 90 => Retained due to score gate failure.',
      ],
      edgeCases: [
        'Locked term blocks execution by policy; preview may still be inspectable.',
        'From/To class cannot be identical.',
        'Missing grades or attendance are treated as failing relevant gate unless policy override exists.',
      ],
    },
  },
  {
    id: 'grading-ops',
    title: 'Grading',
    feature: 'grading',
    roles: ['admin', 'teacher'],
    shortBlurb: 'Controls score capture, weighted assessment rules, and final term outcomes.',
    whatItDoes: 'Defines how raw scores become reportable grades and term-level outputs.',
    whatChanges: 'Assessment weights and scales directly alter reported averages and ranks.',
    crossLinks: ['Management → Subjects', 'Results → Report Cards'],
  },
  {
    id: 'attendance-ops',
    title: 'Attendance',
    feature: 'attendance',
    roles: ['admin', 'teacher'],
    shortBlurb: 'Tracks daily presence and lateness signals used in progression and risk monitoring.',
    whatItDoes: 'Stores attendance records per student/teacher and exposes trend summaries.',
    whatChanges: 'Attendance thresholds influence promotions and engagement indicators.',
    crossLinks: ['Attendance → Students', 'Analytics → Student Performance Overview'],
  },
  {
    id: 'reports-ops',
    title: 'Reports',
    feature: 'reports',
    roles: ['admin', 'teacher'],
    shortBlurb: 'Aggregates institution and classroom outputs for operational and academic review.',
    whatItDoes: 'Provides printable/exportable snapshots of grades, attendance, and status.',
    whatChanges: 'Date range, term scope, and filters alter who appears in generated reports.',
    crossLinks: ['Results → Report Cards', 'Management → Analytics'],
  },
  {
    id: 'billing-ops',
    title: 'Finance',
    feature: 'billing',
    roles: ['admin'],
    shortBlurb: 'Manages fee payments, financial visibility, and billing-related controls.',
    whatItDoes: 'Tracks inflows/outstanding balances and powers finance dashboards.',
    whatChanges: 'Payment and ledger updates immediately affect financial cards and reports.',
    crossLinks: ['Finance → Funds', 'Finance → Reports'],
  },
];

interface ReferenceManualProps {
  role: SettingsRole;
  tier: SubscriptionTierInfo;
  initialAnchor?: string;
}

export function ReferenceManual({ role, tier, initialAnchor }: ReferenceManualProps) {
  const { isDark } = useTheme();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({ [initialAnchor || 'promotion-engine']: true });
  const [anchorY, setAnchorY] = useState<Record<string, number>>({});
  const [scrollRef, setScrollRef] = useState<ScrollView | null>(null);

  const openAndScrollToAnchor = (anchor?: string) => {
    if (!anchor) return;
    setOpen((prev) => ({ ...prev, [anchor]: true }));
    const y = anchorY[anchor];
    if (scrollRef && typeof y === 'number') {
      setTimeout(() => {
        scrollRef.scrollTo({ y: Math.max(0, y - 12), animated: true });
      }, 120);
    }
  };

  React.useEffect(() => {
    if (initialAnchor) {
      openAndScrollToAnchor(initialAnchor);
    }
  }, [initialAnchor, scrollRef, anchorY]);

  const bg = isDark ? '#0D1117' : '#F9FAFB';
  const card = isDark ? '#10161f' : '#FFFFFF';
  const text = isDark ? '#F9FAFB' : '#111827';
  const muted = isDark ? '#9CA3AF' : '#6B7280';
  const border = isDark ? '#30363d' : '#E5E7EB';

  const visibleModules = useMemo(
    () =>
      MODULES.filter((m) => (!m.roles || m.roles.includes(role)) && hasFeatureAccess(tier, m.feature))
        .filter((m) => {
          if (!query.trim()) return true;
          const hay = `${m.title} ${m.shortBlurb} ${m.whatItDoes} ${m.whatChanges} ${m.crossLinks.join(' ')}`.toLowerCase();
          return hay.includes(query.toLowerCase());
        }),
    [role, tier, query],
  );

  return (
    <ScrollView
      ref={(r) => setScrollRef(r)}
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
    >
      <View style={{ backgroundColor: card, borderColor: border, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
        <Search size={16} color={muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search modules, logic, and settings..."
          placeholderTextColor={muted}
          style={{ marginLeft: 8, color: text, flex: 1, fontSize: 13 }}
        />
      </View>

      {visibleModules.map((m) => {
        const isOpen = !!open[m.id];
        return (
          <View
            key={m.id}
            onLayout={(e: LayoutChangeEvent) => {
              const y = e.nativeEvent.layout.y;
              setAnchorY((prev) => (prev[m.id] === y ? prev : { ...prev, [m.id]: y }));
            }}
            style={{ backgroundColor: card, borderColor: border, borderWidth: 1, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}
          >
            <TouchableOpacity
              onPress={() => setOpen((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
              style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              accessibilityRole="button"
              accessibilityLabel={`${m.title} section`}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ color: text, fontWeight: '800', fontSize: 14 }}>{m.title}</Text>
                <Text style={{ color: muted, fontSize: 12, marginTop: 2 }}>{m.shortBlurb}</Text>
              </View>
              {isOpen ? <ChevronUp size={16} color={muted} /> : <ChevronDown size={16} color={muted} />}
            </TouchableOpacity>

            {isOpen ? (
              <View style={{ borderTopColor: border, borderTopWidth: 1, padding: 12 }}>
                <Text style={{ color: text, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>What it does</Text>
                <Text style={{ color: muted, fontSize: 12, marginBottom: 10 }}>{m.whatItDoes}</Text>

                <Text style={{ color: text, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>What changes when you touch it</Text>
                <Text style={{ color: muted, fontSize: 12, marginBottom: 10 }}>{m.whatChanges}</Text>

                <Text style={{ color: text, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>Related settings</Text>
                {m.crossLinks.map((l) => (
                  <Text key={l} style={{ color: '#FF6B00', fontSize: 12, marginBottom: 2 }}>• {l}</Text>
                ))}

                {m.deepDive ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ color: text, fontSize: 13, fontWeight: '800', marginBottom: 6 }}>{m.deepDive.title}</Text>
                    {m.deepDive.steps.map((s) => (
                      <Text key={s} style={{ color: muted, fontSize: 12, marginBottom: 4 }}>{s}</Text>
                    ))}
                    <Text style={{ color: text, fontSize: 13, fontWeight: '700', marginTop: 6, marginBottom: 4 }}>Worked example</Text>
                    {m.deepDive.workedExample.map((s) => (
                      <Text key={s} style={{ color: muted, fontSize: 12, marginBottom: 4 }}>{s}</Text>
                    ))}
                    <Text style={{ color: text, fontSize: 13, fontWeight: '700', marginTop: 6, marginBottom: 4 }}>Edge cases</Text>
                    {m.deepDive.edgeCases.map((s) => (
                      <Text key={s} style={{ color: muted, fontSize: 12, marginBottom: 4 }}>{s}</Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      {visibleModules.length === 0 ? (
        <View style={{ backgroundColor: card, borderColor: border, borderWidth: 1, borderRadius: 14, padding: 14 }}>
          <Text style={{ color: muted, fontSize: 12 }}>No manual sections available for your current role/tier or search.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

export function getManualAnchorFromTooltip(id: TooltipTargetId): string | undefined {
  return SETTINGS_TOOLTIPS[id]?.learnMoreAnchor;
}
