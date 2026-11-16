import React from 'react';
import { View, Text, Platform, useWindowDimensions } from 'react-native';
import { Cpu, ShieldCheck, Zap, Server, Users, Activity } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal, CountUp } from '@/components/ui/Reveal';

export const TelemetryStrip: React.FC = () => {
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 680 && width < 1024;

  const stats = [
    {
      label: 'System Availability',
      val: 99.9,
      decimals: 1,
      suffix: '%',
      sub: 'Online 24/7 on phones & computers',
      accent: '#10B981',
      icon: <Server size={14} color="#10B981" />,
    },
    {
      label: 'Page Load Speed',
      val: 1,
      decimals: 0,
      prefix: '< ',
      suffix: 's',
      sub: 'Fast on mobile data & Wi-Fi',
      accent: '#FF8C40',
      icon: <Zap size={14} color="#FF8C40" />,
    },
    {
      label: 'Dedicated Portals',
      val: 4,
      decimals: 0,
      suffix: ' in 1',
      sub: 'Admin, Teachers, Students & Parents',
      accent: '#3B82F6',
      icon: <Users size={14} color="#3B82F6" />,
    },
    {
      label: 'Automated Backups',
      val: 100,
      decimals: 0,
      suffix: '%',
      sub: 'Daily protection for school records',
      accent: '#8B5CF6',
      icon: <ShieldCheck size={14} color="#8B5CF6" />,
    },
  ];

  const pillars = [
    {
      icon: <Server size={20} color="#FF8C40" />,
      title: 'Always Reliable',
      desc: 'Dependable cloud access ensuring teachers, students, and parents stay connected throughout the school term.',
      accent: '#FF6B00',
    },
    {
      icon: <Users size={20} color="#8B5CF6" />,
      title: 'Custom Staff Roles',
      desc: 'Give teachers, heads of department, librarians, and finance officers the exact tools and permissions they need.',
      accent: '#8B5CF6',
    },
    {
      icon: <ShieldCheck size={20} color="#10B981" />,
      title: 'Protected School Records',
      desc: 'Automatic account lockouts after failed logins and safe session protections keep student data secure.',
      accent: '#10B981',
    },
    {
      icon: <Zap size={20} color="#3B82F6" />,
      title: 'Instant Live Updates',
      desc: 'Daily attendance, fee receipts, and school notices reflect immediately across all phones and computers.',
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
      {/* 1. Live Performance Stats with CountUp */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 14,
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        {stats.map((s, idx) => (
          <Reveal
            key={idx}
            variant="cards"
            staggerIndex={idx}
            style={{
              width: isDesktop ? '23.5%' : isTablet ? '48%' : '100%',
              minWidth: 200,
            }}
          >
            <GlassCard
              variant="subtle"
              accentColor={s.accent}
              borderRadius={20}
              contentStyle={{
                paddingVertical: 18,
                paddingHorizontal: 20,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {s.label}
                </Text>
                {s.icon}
              </View>

              <CountUp
                targetValue={s.val}
                decimals={s.decimals}
                prefix={s.prefix}
                suffix={s.suffix}
                textStyle={{
                  color: '#FFFFFF',
                  fontSize: 26,
                  fontWeight: '900',
                  letterSpacing: -0.5,
                }}
              />

              <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 11.5, marginTop: 4 }}>
                {s.sub}
              </Text>
            </GlassCard>
          </Reveal>
        ))}
      </View>

      {/* 2. Enterprise Pillars Card */}
      <Reveal variant="wrapper">
        <GlassCard
          variant="standard"
          accentColor="#FF6B00"
          borderRadius={28}
          contentStyle={{
            paddingVertical: 32,
            paddingHorizontal: isDesktop ? 36 : 20,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 28,
              flexWrap: 'wrap',
              gap: 12,
              position: 'relative',
              zIndex: 3,
            }}
          >
            <Reveal variant="headline">
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
            </Reveal>
          </View>

          <View
            style={{
              flexDirection: isDesktop ? 'row' : 'column',
              gap: 20,
              position: 'relative',
              zIndex: 3,
            }}
          >
            {pillars.map((p, idx) => (
              <Reveal
                key={idx}
                variant="cards"
                staggerIndex={idx}
                style={{ flex: 1, display: 'flex' }}
              >
                <View
                  style={[
                    {
                      height: '100%',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 20,
                      padding: 20,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                      position: 'relative',
                      overflow: 'hidden',
                    },
                    isWeb ? ({
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(15, 11, 46, 0.5) 100%)',
                      boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)',
                    } as any) : {},
                  ]}
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
                  </View>

                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginBottom: 6 }}>
                    {p.title}
                  </Text>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: 12.5, lineHeight: 18 }}>
                    {p.desc}
                  </Text>
                </View>
              </Reveal>
            ))}
          </View>
        </GlassCard>
      </Reveal>
    </View>
  );
};

export default TelemetryStrip;
