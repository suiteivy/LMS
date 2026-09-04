import React from 'react';
import { View, Text, Platform, Dimensions } from 'react-native';
import { Cpu, ShieldCheck, Zap, Database, Server } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const TelemetryStrip: React.FC = () => {
  const isWeb = Platform.OS === 'web';
  const isDesktop = SCREEN_WIDTH >= 1024;

  const pillars = [
    {
      icon: <Server size={20} color="#FF8C40" />,
      title: 'Always Online',
      desc: 'Reliable cloud hosting ensuring zero downtime during classes and exam periods.',
      accent: '#FF6B00',
    },
    {
      icon: <Zap size={20} color="#10B981" />,
      title: 'Instant Live Updates',
      desc: 'Real-time notice alerts, rapid attendance records, and immediate parent updates.',
      accent: '#10B981',
    },
    {
      icon: <ShieldCheck size={20} color="#8B5CF6" />,
      title: 'Private & Secure Data',
      desc: 'Bank-grade encryption ensuring student records and school finances stay 100% safe.',
      accent: '#8B5CF6',
    },
    {
      icon: <Database size={20} color="#3B82F6" />,
      title: 'Built for Any School Size',
      desc: 'Easily handles thousands of students, teachers, and parents logged in at the same time.',
      accent: '#3B82F6',
    },
  ];

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 1240,
        alignSelf: 'center',
        paddingVertical: 48,
        paddingHorizontal: 20,
      }}
    >
      <View
        style={[
          {
            borderRadius: 28,
            backgroundColor: 'rgba(15, 11, 46, 0.45)',
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            paddingVertical: 32,
            paddingHorizontal: isDesktop ? 36 : 20,
            boxShadow: [{
              offsetX: 0,
              offsetY: 16,
              blurRadius: 36,
              color: 'rgba(0, 0, 0, 0.35)',
            }],
          },
          isWeb
            ? ({
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              } as any)
            : {},
        ]}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 28,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Cpu size={18} color="#FF8C40" />
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '900',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}
            >
              School Reliability & Data Security
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: isDesktop ? 'row' : 'column',
            gap: 20,
          }}
        >
          {pillars.map((p, idx) => (
            <View
              key={idx}
              style={{
                flex: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.025)',
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.06)',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    backgroundColor: `${p.accent}18`,
                    borderWidth: 1,
                    borderColor: `${p.accent}33`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {p.icon}
                </View>
                <Text
                  style={{
                    color: p.accent,
                    fontSize: 20,
                    fontWeight: '900',
                    letterSpacing: -0.5,
                    ...(isWeb ? ({ fontVariantNumeric: 'tabular-nums' } as any) : {}),
                  }}
                >
                </Text>
              </View>

              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginBottom: 6 }}>
                {p.title}
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12.5, lineHeight: 18 }}>
                {p.desc}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};
