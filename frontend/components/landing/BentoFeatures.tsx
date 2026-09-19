import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  BookOpen,
  Library,
  CreditCard,
  BarChart2,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Search,
  Calendar,
  ShieldCheck,
  Clock,
  Check,
} from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassCard';

type PersonaFilter = 'all' | 'academics' | 'operations' | 'finance' | 'families';

interface FilterOption {
  id: PersonaFilter;
  label: string;
}

const FILTERS: FilterOption[] = [
  { id: 'all', label: 'All Capabilities' },
  { id: 'academics', label: 'For Teachers' },
  { id: 'operations', label: 'For School Leadership' },
  { id: 'finance', label: 'For Finance & Library' },
  { id: 'families', label: 'For Parents & Students' },
];

export const BentoFeatures: React.FC = () => {
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const [activeFilter, setActiveFilter] = useState<PersonaFilter>('all');

  const matchesFilter = (categories: PersonaFilter[]) => {
    if (activeFilter === 'all') return true;
    return categories.includes(activeFilter);
  };

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 1240,
        alignSelf: 'center',
        paddingVertical: 72,
        paddingHorizontal: 20,
      }}
    >
      {/* Section Header */}
      <View style={{ alignItems: 'center', marginBottom: 38 }}>
        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              paddingHorizontal: 16,
              paddingVertical: 7,
              borderRadius: 30,
              backgroundColor: 'rgba(139, 92, 246, 0.12)',
              borderWidth: 1,
              borderColor: 'rgba(139, 92, 246, 0.35)',
              marginBottom: 18,
              boxShadow: [{
                offsetX: 0,
                offsetY: 4,
                blurRadius: 16,
                color: 'rgba(139, 92, 246, 0.2)',
              }],
            },
            isWeb
              ? ({
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(24, 15, 52, 0.6) 100%)',
                } as any)
              : {},
          ]}
        >
          <Sparkles size={13} color="#A78BFA" />
          <Text
            style={{
              color: '#A78BFA',
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            EVERYTHING YOUR SCHOOL NEEDS
          </Text>
        </View>

        <Text
          style={{
            color: '#FFFFFF',
            fontSize: isDesktop ? 40 : 30,
            fontWeight: '900',
            textAlign: 'center',
            letterSpacing: -0.8,
            marginBottom: 14,
            ...(isWeb ? ({ textWrap: 'balance' } as any) : {}),
          }}
        >
          Complete School Management,{' '}
          <Text style={{ color: '#FF8C40' }}>Built for Simplicity</Text>
        </Text>

        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.55)',
            fontSize: 16,
            textAlign: 'center',
            maxWidth: 620,
            lineHeight: 25,
            ...(isWeb ? ({ textWrap: 'pretty' } as any) : {}),
          }}
        >
          From lesson tracking and conflict-free timetables to multi-tier fee collection and official transcripts—manage your entire institution with clarity and ease.
        </Text>
      </View>

      {/* Audience / Persona Filter Tabs */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
          marginBottom: 44,
        }}
      >
        {FILTERS.map((f) => {
          const isSelected = activeFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setActiveFilter(f.id)}
              activeOpacity={0.8}
              style={[
                {
                  paddingVertical: 9,
                  paddingHorizontal: 18,
                  borderRadius: 20,
                  backgroundColor: isSelected ? 'rgba(255, 107, 0, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  borderWidth: 1.5,
                  borderColor: isSelected ? '#FF6B00' : 'rgba(255, 255, 255, 0.08)',
                },
                isWeb
                  ? ({
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? '0 0 16px rgba(255, 107, 0, 0.25)' : 'none',
                    } as any)
                  : {},
              ]}
            >
              <Text
                style={{
                  color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                  fontSize: 13,
                  fontWeight: isSelected ? '800' : '600',
                }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Asymmetric Bento Grid */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 20,
          justifyContent: 'center',
        }}
      >
        {/* TILE 1: Curriculum Planning & Record of Work (Hero Tile - 64% on Desktop) */}
        {matchesFilter(['academics', 'operations']) && (
          <GlassCard
            variant="interactive"
            hoverable
            accentColor="#FF6B00"
            borderRadius={28}
            style={{
              width: isDesktop ? '64%' : '100%',
              minHeight: 340,
            }}
            contentStyle={{
              padding: isDesktop ? 34 : 24,
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 180,
                height: 180,
                borderRadius: 90,
                backgroundColor: 'rgba(255, 107, 0, 0.12)',
                ...(isWeb ? ({ filter: 'blur(60px)' } as any) : {}),
              }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255, 107, 0, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 107, 0, 0.35)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BookOpen size={22} color="#FF8C40" />
              </View>
              <View>
                <Text
                  style={{
                    color: '#FF8C40',
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                  }}
                >
                  CURRICULUM & LESSON PLANNING
                </Text>
                <Text style={{ color: '#FFFFFF', fontSize: 21, fontWeight: '800' }}>
                  Lesson Coverage & Record of Work
                </Text>
              </View>
            </View>

            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 14.5,
                lineHeight: 22,
                marginBottom: 24,
                maxWidth: 540,
              }}
            >
              Organize any curriculum into clear subjects, topics, and subtopics. Teachers track lesson progress in the live Coverage Planner and record official Records of Work in minutes.
            </Text>

            {/* Interactive Syllabus Node Visualizer */}
            <View
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)',
                gap: 10,
              }}
            >
              {[
                {
                  unit: 'Topic 01',
                  title: 'Living Things & Environment',
                  type: 'Lesson Notes & Demonstration',
                  progress: 'Completed',
                  done: true,
                },
                {
                  unit: 'Topic 02',
                  title: 'Matter, Energy & Simple Machines',
                  type: 'Practical Class Activity',
                  progress: '85% (In Progress)',
                  done: false,
                },
                {
                  unit: 'Topic 03',
                  title: 'Earth, Weather & Atmosphere',
                  type: 'Continuous Assessment Task',
                  progress: 'Next Milestone',
                  done: false,
                },
              ].map((node, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: node.done ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {node.done ? (
                        <CheckCircle2 size={13} color="#10B981" />
                      ) : (
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' }}>
                          {i + 1}
                        </Text>
                      )}
                    </View>
                    <View>
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                        {node.title}
                      </Text>
                      <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 11 }}>
                        {node.unit} • {node.type}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      color: node.done ? '#10B981' : '#FF8C40',
                      fontSize: 12,
                      fontWeight: '800',
                    }}
                  >
                    {node.progress}
                  </Text>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        {/* TILE 2: Conflict-Free Timetable Builder (32.5% on Desktop) */}
        {matchesFilter(['operations', 'academics']) && (
          <GlassCard
            variant="interactive"
            hoverable
            accentColor="#8B5CF6"
            borderRadius={28}
            style={{
              width: isDesktop ? (matchesFilter(['academics', 'operations']) ? '32.5%' : '48%') : '100%',
              minHeight: 340,
            }}
            contentStyle={{
              padding: 26,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                borderWidth: 1,
                borderColor: 'rgba(139, 92, 246, 0.35)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Calendar size={22} color="#A78BFA" />
            </View>

            <Text
              style={{
                color: '#A78BFA',
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              SMART SCHEDULING
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 12 }}>
              Conflict-Free Timetable Builder
            </Text>

            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 13.5,
                lineHeight: 20,
                marginBottom: 20,
              }}
            >
              Build balanced weekly timetables with live checks that prevent teacher double-booking, room clashes, and class overlaps. Export clear PDF schedules with one click.
            </Text>

            {/* Live Conflict Engine Badge */}
            <View
              style={{
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                padding: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: 'rgba(139, 92, 246, 0.25)',
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
                  Live Schedule Status
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Check size={13} color="#10B981" strokeWidth={3} />
                  <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800' }}>Clean</Text>
                </View>
              </View>
              <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 11.5 }}>
                0 Teacher Double-Bookings • 0 Room Clashes
              </Text>
            </View>
          </GlassCard>
        )}

        {/* TILE 3: Flexible Grading & Transcripts (32.5% on Desktop) */}
        {matchesFilter(['academics', 'families']) && (
          <GlassCard
            variant="interactive"
            hoverable
            accentColor="#3B82F6"
            borderRadius={28}
            style={{
              width: isDesktop ? '32.5%' : isTablet ? '48%' : '100%',
              minHeight: 280,
            }}
            contentStyle={{
              padding: 26,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                borderWidth: 1,
                borderColor: 'rgba(59, 130, 246, 0.35)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <BarChart2 size={22} color="#60A5FA" />
            </View>

            <Text
              style={{
                color: '#60A5FA',
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              ASSESSMENTS & TRANSCRIPTS
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '800', marginBottom: 10 }}>
              Flexible Grading & Report Cards
            </Text>
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 13,
                lineHeight: 20,
                marginBottom: 16,
              }}
            >
              Support both descriptor ratings (Exceeding, Meeting, Approaching) and traditional numerical marks. Produce official term report cards and cumulative academic transcripts.
            </Text>

            <View
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(59, 130, 246, 0.2)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                Academic Transcript
              </Text>
              <Text style={{ color: '#60A5FA', fontSize: 13, fontWeight: '900' }}>
                Official PDF Ready
              </Text>
            </View>
          </GlassCard>
        )}

        {/* TILE 4: Multi-Tier Fee Billing & Receipts (32.5% on Desktop) */}
        {matchesFilter(['finance', 'operations']) && (
          <GlassCard
            variant="interactive"
            hoverable
            accentColor="#10B981"
            borderRadius={28}
            style={{
              width: isDesktop ? '32.5%' : isTablet ? '48%' : '100%',
              minHeight: 280,
            }}
            contentStyle={{
              padding: 26,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderWidth: 1,
                borderColor: 'rgba(16, 185, 129, 0.35)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <CreditCard size={22} color="#10B981" />
            </View>

            <Text
              style={{
                color: '#10B981',
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              FEES & INVOICING
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '800', marginBottom: 10 }}>
              Multi-Tier Fees & Direct Receipts
            </Text>
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 13,
                lineHeight: 20,
                marginBottom: 16,
              }}
            >
              Set fee schedules for the whole school, by class level, or per student. Manage bursaries, record payments, and give parents instant downloadable PDF receipts.
            </Text>

            <View
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(16, 185, 129, 0.2)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                Fee Structures
              </Text>
              <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '900' }}>
                Class & Student Rates
              </Text>
            </View>
          </GlassCard>
        )}

        {/* TILE 5: Physical Library & Academic Vault (31% on Desktop) */}
        {matchesFilter(['finance', 'academics', 'families']) && (
          <GlassCard
            variant="interactive"
            hoverable
            accentColor="#EC4899"
            borderRadius={28}
            style={{
              width: isDesktop ? '31%' : '100%',
              minHeight: 280,
            }}
            contentStyle={{
              padding: 26,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: 'rgba(236, 72, 153, 0.15)',
                borderWidth: 1,
                borderColor: 'rgba(236, 72, 153, 0.35)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Library size={22} color="#F472B6" />
            </View>

            <Text
              style={{
                color: '#F472B6',
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              LIBRARY & DIGITAL VAULT
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '800', marginBottom: 10 }}>
              Physical Books & Digital Vault
            </Text>
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 13,
                lineHeight: 20,
                marginBottom: 16,
              }}
            >
              Librarians issue and return physical books with circulation audit trails, while students access digital revision notes, past papers, and study guides anytime.
            </Text>

            <View
              style={{
                backgroundColor: 'rgba(236, 72, 153, 0.08)',
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(236, 72, 153, 0.2)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                Book Loans & Vault
              </Text>
              <Text style={{ color: '#F472B6', fontSize: 13, fontWeight: '900' }}>
                Audited & Active
              </Text>
            </View>
          </GlassCard>
        )}

        {/* TILE 6: Student Lifecycle, Clearance & Messaging (Full row or 100% on Desktop) */}
        {matchesFilter(['operations', 'families']) && (
          <GlassCard
            variant="interactive"
            hoverable
            accentColor="#F59E0B"
            borderRadius={28}
            style={{
              width: '100%',
              minHeight: 220,
            }}
            contentStyle={{
              padding: isDesktop ? 32 : 24,
              flexDirection: isDesktop ? 'row' : 'column',
              alignItems: isDesktop ? 'center' : 'stretch',
              justifyContent: 'space-between',
              gap: 24,
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(245, 158, 11, 0.35)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck size={20} color="#F59E0B" />
                </View>
                <Text
                  style={{
                    color: '#F59E0B',
                    fontSize: 10.5,
                    fontWeight: '800',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                  }}
                >
                  STUDENT LIFECYCLE & CAMPUS COMMUNITY
                </Text>
              </View>

              <Text style={{ color: '#FFFFFF', fontSize: 21, fontWeight: '800', marginBottom: 10 }}>
                Step-Gated Clearance, Conduct Records & Direct Messaging
              </Text>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.65)',
                  fontSize: 14,
                  lineHeight: 22,
                  maxWidth: 700,
                }}
              >
                Seamlessly guide students through enrollment, promotions, and graduation. Process student leaving with multi-department sign-offs (finance, library, sports), record student conduct logs, and stay connected through direct two-way messaging and a shared school calendar.
              </Text>
            </View>

            {/* Clearance Process Badges */}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 10,
                alignSelf: isDesktop ? 'center' : 'flex-start',
              }}
            >
              {[
                { label: 'Fee Clearance', ok: true },
                { label: 'Library Books', ok: true },
                { label: 'Conduct Records', ok: true },
                { label: 'Admin Sign-off', ok: true },
              ].map((step, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(245, 158, 11, 0.25)',
                  }}
                >
                  <CheckCircle2 size={14} color="#10B981" />
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
          </GlassCard>
        )}
      </View>
    </View>
  );
};
