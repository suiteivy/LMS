import React, { useState } from 'react';
import {
  View,
  Text,
  Platform,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  BookOpen,
  Library,
  CreditCard,
  BarChart2,
  Users,
  MessageSquare,
  Sparkles,
  MoveRight,
  CheckCircle2,
  FileText,
  Video,
  Database,
  Cpu,
  ShieldCheck,
  Search,
  BellRing
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const BentoFeatures: React.FC = () => {
  const isWeb = Platform.OS === 'web';
  const isDesktop = SCREEN_WIDTH >= 1024;
  const isTablet = SCREEN_WIDTH >= 768 && SCREEN_WIDTH < 1024;

  const [hoveredTile, setHoveredTile] = useState<number | null>(null);

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
      <View style={{ alignItems: 'center', marginBottom: 54 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 30,
            backgroundColor: 'rgba(139, 92, 246, 0.12)',
            borderWidth: 1,
            borderColor: 'rgba(139, 92, 246, 0.3)',
            marginBottom: 18,
          }}
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
            CORE SCHOOL FEATURES
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
          Everything Your School Needs to{' '}
          <Text style={{ color: '#FF8C40' }}>Run Smoothly</Text>
        </Text>

        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.55)',
            fontSize: 16,
            textAlign: 'center',
            maxWidth: 580,
            lineHeight: 24,
            ...(isWeb ? ({ textWrap: 'pretty' } as any) : {}),
          }}
        >
          From lesson notes and digital books to fee collection and parent updates—manage
          everything from one simple, secure dashboard.
        </Text>
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
        {/* TILE 1: Course Studio & Interactive Syllabus (Hero Tile - 2 Columns on Desktop) */}
        <View
          style={[
            {
              width: isDesktop ? '64%' : '100%',
              minHeight: 340,
              backgroundColor: 'rgba(15, 11, 46, 0.55)',
              borderRadius: 28,
              borderWidth: 1.5,
              borderColor: hoveredTile === 1 ? 'rgba(255, 107, 0, 0.45)' : 'rgba(255, 255, 255, 0.1)',
              padding: isDesktop ? 34 : 24,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: [{
                offsetX: 0,
                offsetY: 16,
                blurRadius: 36,
                color: hoveredTile === 1 ? 'rgba(255, 107, 0, 0.12)' : 'rgba(0, 0, 0, 0.3)',
              }],
            },
            isWeb
              ? ({
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  transition: 'border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease',
                  transform: hoveredTile === 1 ? [{ translateY: -4 }] : [{ translateY: 0 }],
                } as any)
              : {},
          ]}
          //@ts-ignore
          onPointerEnter={() => setHoveredTile(1)}
          onPointerLeave={() => setHoveredTile(null)}
        >
          {/* Subtle accent glow blob */}
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
                CLASSES & LESSONS
              </Text>
              <Text style={{ color: '#FFFFFF', fontSize: 21, fontWeight: '800' }}>
                Lesson Plans & Class Management
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: 14.5,
              lineHeight: 22,
              marginBottom: 24,
              maxWidth: 520,
            }}
          >
            Organize subjects, upload lesson notes, share video lectures, and create short quizzes.
            Teachers can easily track student progress and mark assignments in minutes.
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
                unit: 'Unit 01',
                title: 'Forces and Motion',
                type: 'Video Lesson & Notes',
                progress: 'Completed',
                done: true,
              },
              {
                unit: 'Unit 02',
                title: 'Energy & Simple Machines',
                type: 'Interactive Class Quiz',
                progress: '84% (In Progress)',
                done: false,
              },
              {
                unit: 'Unit 03',
                title: 'Heat and Temperature',
                type: 'Homework Worksheet',
                progress: 'Next Week',
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
        </View>

        {/* TILE 2: Digital Resource Vault & Library (Single Column) */}
        <View
          style={[
            {
              width: isDesktop ? '32.5%' : '100%',
              minHeight: 340,
              backgroundColor: 'rgba(15, 11, 46, 0.55)',
              borderRadius: 28,
              borderWidth: 1.5,
              borderColor: hoveredTile === 2 ? 'rgba(139, 92, 246, 0.45)' : 'rgba(255, 255, 255, 0.1)',
              padding: 26,
              overflow: 'hidden',
              boxShadow: [{
                offsetX: 0,
                offsetY: 16,
                blurRadius: 36,
                color: hoveredTile === 2 ? 'rgba(139, 92, 246, 0.12)' : 'rgba(0, 0, 0, 0.3)',
              }],
            },
            isWeb
              ? ({
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  transition: 'border-color 0.3s ease, transform 0.3s ease',
                  transform: hoveredTile === 2 ? [{ translateY: -4 }] : [{ translateY: 0 }],
                } as any)
              : {},
          ]}
          //@ts-ignore
          onPointerEnter={() => setHoveredTile(2)}
          onPointerLeave={() => setHoveredTile(null)}
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
            <Library size={22} color="#A78BFA" />
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
            DIGITAL LIBRARY
          </Text>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 12 }}>
            Digital Books & Study Guides
          </Text>

          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: 13.5,
              lineHeight: 20,
              marginBottom: 20,
            }}
          >
            Give teachers and students 24/7 access to curriculum textbooks, revision guides,
            past exam papers, and class notes on phone or computer.
          </Text>

          {/* Search bar simulation */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              gap: 8,
              marginBottom: 14,
            }}
          >
            <Search size={14} color="rgba(255,255,255,0.4)" />
            <Text style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: 12 }}>
              Search textbooks, past papers, notes...
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {['Math Textbooks', 'Science Notes', 'Past Exam Papers', 'Story Books'].map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: 'rgba(139, 92, 246, 0.12)',
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderWidth: 0.5,
                  borderColor: 'rgba(139, 92, 246, 0.25)',
                }}
              >
                <Text style={{ color: '#A78BFA', fontSize: 11, fontWeight: '600' }}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* TILE 3: Automated Financial & Bursary Engine */}
        <View
          style={[
            {
              width: isDesktop ? '32.5%' : isTablet ? '48%' : '100%',
              minHeight: 280,
              backgroundColor: 'rgba(15, 11, 46, 0.55)',
              borderRadius: 28,
              borderWidth: 1.5,
              borderColor: hoveredTile === 3 ? 'rgba(16, 185, 129, 0.45)' : 'rgba(255, 255, 255, 0.1)',
              padding: 26,
              boxShadow: [{
                offsetX: 0,
                offsetY: 16,
                blurRadius: 36,
                color: hoveredTile === 3 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 0, 0, 0.3)',
              }],
            },
            isWeb
              ? ({
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  transition: 'border-color 0.3s ease, transform 0.3s ease',
                  transform: hoveredTile === 3 ? [{ translateY: -4 }] : [{ translateY: 0 }],
                } as any)
              : {},
          ]}
          //@ts-ignore
          onPointerEnter={() => setHoveredTile(3)}
          onPointerLeave={() => setHoveredTile(null)}
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
            FEES & PAYMENTS
          </Text>
          <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '800', marginBottom: 10 }}>
            School Fees & Invoicing
          </Text>
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: 13,
              lineHeight: 20,
              marginBottom: 16,
            }}
          >
            Send term fee invoices to parents, track who has paid, and accept direct M-Pesa
            and bank payments with instant digital receipts.
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
              Term Fees Collected
            </Text>
            <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '900' }}>
              98.2% Paid
            </Text>
          </View>
        </View>

        {/* TILE 4: Real-time Telemetry & Grade Analytics */}
        <View
          style={[
            {
              width: isDesktop ? '32.5%' : isTablet ? '48%' : '100%',
              minHeight: 280,
              backgroundColor: 'rgba(15, 11, 46, 0.55)',
              borderRadius: 28,
              borderWidth: 1.5,
              borderColor: hoveredTile === 4 ? 'rgba(59, 130, 246, 0.45)' : 'rgba(255, 255, 255, 0.1)',
              padding: 26,
              boxShadow: [{
                offsetX: 0,
                offsetY: 16,
                blurRadius: 36,
                color: hoveredTile === 4 ? 'rgba(59, 130, 246, 0.12)' : 'rgba(0, 0, 0, 0.3)',
              }],
            },
            isWeb
              ? ({
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  transition: 'border-color 0.3s ease, transform 0.3s ease',
                  transform: hoveredTile === 4 ? [{ translateY: -4 }] : [{ translateY: 0 }],
                } as any)
              : {},
          ]}
          //@ts-ignore
          onPointerEnter={() => setHoveredTile(4)}
          onPointerLeave={() => setHoveredTile(null)}
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
            GRADES & REPORT CARDS
          </Text>
          <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '800', marginBottom: 10 }}>
            Student Grades & Report Cards
          </Text>
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: 13,
              lineHeight: 20,
              marginBottom: 16,
            }}
          >
            Record test marks, spot students who need extra help early, and generate clear,
            printable report cards with one click.
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
              Class Average Score
            </Text>
            <Text style={{ color: '#60A5FA', fontSize: 13, fontWeight: '900' }}>
              B+ (Improving)
            </Text>
          </View>
        </View>

        {/* TILE 5: Synchronized Messaging & Virtual Diary */}
        <View
          style={[
            {
              width: isDesktop ? '31%' : '100%',
              minHeight: 280,
              backgroundColor: 'rgba(15, 11, 46, 0.55)',
              borderRadius: 28,
              borderWidth: 1.5,
              borderColor: hoveredTile === 5 ? 'rgba(245, 158, 11, 0.45)' : 'rgba(255, 255, 255, 0.1)',
              padding: 26,
              boxShadow: [{
                offsetX: 0,
                offsetY: 16,
                blurRadius: 36,
                color: hoveredTile === 5 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 0, 0, 0.3)',
              }],
            },
            isWeb
              ? ({
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  transition: 'border-color 0.3s ease, transform 0.3s ease',
                  transform: hoveredTile === 5 ? [{ translateY: -4 }] : [{ translateY: 0 }],
                } as any)
              : {},
          ]}
          //@ts-ignore
          onPointerEnter={() => setHoveredTile(5)}
          onPointerLeave={() => setHoveredTile(null)}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.35)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <MessageSquare size={22} color="#F59E0B" />
          </View>

          <Text
            style={{
              color: '#F59E0B',
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            PARENT COMMUNICATION
          </Text>
          <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '800', marginBottom: 10 }}>
            Daily Diary & School Notices
          </Text>
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: 13,
              lineHeight: 20,
              marginBottom: 16,
            }}
          >
            Send homework reminders, urgent announcements, and teacher notes directly to
            parents' phones with zero hassle.
          </Text>

          <View
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.2)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
              Notice Delivery Rate
            </Text>
            <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '900' }}>
              99.1% Delivered
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
