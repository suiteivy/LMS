import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/libs/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { AlertTriangle, Clock, LogOut, Rocket, X, Zap } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Modal,
    Platform,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const TOTAL_SECONDS = 15 * 60;

function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Banner bg/text shifts from amber → red as time runs out */
function getBannerStyle(timeLeft: number) {
    if (timeLeft <= 60) {
        return {
            bg: '#fef2f2',
            border: '#fecaca',
            iconColor: '#ef4444',
            text: '#7f1d1d',
            subText: '#991b1b',
            btnBg: '#1c1c1c',
            btnText: '#fff',
        };
    }
    if (timeLeft <= 120) {
        return {
            bg: '#fff7ed',
            border: '#fed7aa',
            iconColor: '#f97316',
            text: '#7c2d12',
            subText: '#9a3412',
            btnBg: '#1c1c1c',
            btnText: '#fff',
        };
    }
    // default amber
    return {
        bg: '#fffbeb',
        border: '#fde68a',
        iconColor: '#d97706',
        text: '#78350f',
        subText: '#92400e',
        btnBg: '#1c1c1c',
        btnText: '#fff',
    };
}

function getBannerMessage(timeLeft: number) {
    if (timeLeft <= 60) return 'Demo ending now — sign up to keep access to all features & your data.';
    if (timeLeft <= 120) return 'Less than 2 minutes left — create an account before your session expires.';
    return 'Demo mode — unlock full features, all dashboards & real institution data.';
}

export default function DemoBanner() {
    const { isDemo, logout, session, user, profile } = useAuth();
    const [expiryTime, setExpiryTime] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [showExpiredModal, setShowExpiredModal] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const router = useRouter();

    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!isDemo) return;
        Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }, [isDemo]);

    useEffect(() => {
        if (!isDemo) return;
        const loadTimer = async () => {
            try {
                const expiryStr = await AsyncStorage.getItem('demo_expiry');
                let expiry = expiryStr ? parseInt(expiryStr, 10) : Date.now() + TOTAL_SECONDS * 1000;
                if (!expiryStr) await AsyncStorage.setItem('demo_expiry', expiry.toString());
                setExpiryTime(expiry);
                setTimeLeft(Math.max(0, Math.floor((expiry - Date.now()) / 1000)));
            } catch (e) {
                console.error('Failed to load trial timer', e);
            }
        };
        loadTimer();
    }, [isDemo]);

    useEffect(() => {
        if (!expiryTime) return;
        const interval = setInterval(() => {
            const remaining = Math.floor((expiryTime - Date.now()) / 1000);
            if (remaining <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
                handleExpiry();
            } else {
                setTimeLeft(remaining);
                if (remaining === 120) setShowWarningModal(true);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [expiryTime]);

    const callCleanup = async () => {
        try {
            const institutionId = (profile as any)?.institution_id;
            const userId = user?.id;
            if (institutionId && userId) await authService.endDemoSession(institutionId, userId);
        } catch (e) {
            console.warn('Demo cleanup non-fatal:', e);
        }
    };

    const handleExpiry = async () => {
        if (isCleaning) return;
        setIsCleaning(true);
        try {
            await callCleanup();
            await AsyncStorage.removeItem('demo_expiry');
            setShowExpiredModal(true);
            await logout();
            router.replace('/(auth)/demo');
        } catch (e) {
            console.error('Expiry logout failed', e);
        } finally {
            setIsCleaning(false);
        }
    };

    const handleEndDemo = async () => {
        if (isCleaning) return;
        setIsCleaning(true);
        try {
            await callCleanup();
            await AsyncStorage.removeItem('demo_expiry');
            await logout();
            router.replace('/(auth)/demo');
        } catch (e) {
            console.error('Exit demo failed', e);
        } finally {
            setIsCleaning(false);
        }
    };

    if (!isDemo || !session) return null;

    const s = getBannerStyle(timeLeft);
    const msg = getBannerMessage(timeLeft);

    return (
        <>
            {/* ── Top Banner ─────────────────────────────────────────────── */}
            <Animated.View
                style={{
                    zIndex: 9999,
                    opacity,
                    paddingTop: Platform.OS === 'ios' ? 44 : 10,
                    backgroundColor: s.bg,
                    borderBottomWidth: 1,
                    borderBottomColor: s.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 14,
                    paddingBottom: 10,
                }}
            >
                {/* Left: icon + message */}
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8, marginRight: 10 }}>
                    <AlertTriangle size={16} color={s.iconColor} strokeWidth={2.5} />
                    <Text style={{ color: s.text, fontSize: 12.5, fontWeight: '500', flex: 1, lineHeight: 18 }} numberOfLines={1}>
                        <Text style={{ fontWeight: '700' }}>{formatTime(timeLeft)} left</Text>
                        {' '}on your demo —{' '}{msg.split('—')[1]?.trim()}
                    </Text>
                </View>

                {/* Right: CTA + close */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                        onPress={handleEndDemo}
                        activeOpacity={0.85}
                        disabled={isCleaning}
                        style={{
                            backgroundColor: s.btnBg,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                        }}
                    >
                        <Text style={{ color: "white", fontSize: 12, fontWeight: '700' }}> Exit </Text>
                        <X size={15} color="white" strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* ── 2-Min Warning Modal ─────────────────────────────────────── */}
            <Modal visible={showWarningModal} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
                    <View style={{
                        backgroundColor: '#0f172a', borderRadius: 24, padding: 28, width: '100%',
                        borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)',
                    }}>
                        <TouchableOpacity onPress={() => setShowWarningModal(false)} style={{ alignSelf: 'flex-end', marginBottom: 12 }}>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: 6 }}>
                                <X size={15} color="#94a3b8" />
                            </View>
                        </TouchableOpacity>

                        <View style={{ alignSelf: 'center', marginBottom: 18 }}>
                            <View style={{ width: 68, height: 68, borderRadius: 20, backgroundColor: 'rgba(249,115,22,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)' }}>
                                <Clock size={30} color="#f97316" />
                            </View>
                        </View>

                        {/* Live countdown badge */}
                        <View style={{ alignSelf: 'center', backgroundColor: 'rgba(249,115,22,0.12)', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(249,115,22,0.25)' }}>
                            <Text style={{ color: '#f97316', fontWeight: '800', fontSize: 13, fontVariant: ['tabular-nums'] }}>
                                ⏱ {formatTime(timeLeft)} remaining
                            </Text>
                        </View>

                        <Text style={{ color: '#f1f5f9', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
                            Almost Out of Time
                        </Text>
                        <Text style={{ color: '#94a3b8', fontSize: 13.5, textAlign: 'center', lineHeight: 22, marginBottom: 26 }}>
                            Your demo session ends in 2 minutes. Create an account to keep full access.
                        </Text>

                        <TouchableOpacity
                            style={{ backgroundColor: '#6366f1', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10, flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                            onPress={() => { setShowWarningModal(false); handleEndDemo(); }}
                        >
                            <Rocket size={17} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Create Free Account</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={{ paddingVertical: 12, alignItems: 'center' }} onPress={() => setShowWarningModal(false)}>
                            <Text style={{ color: '#475569', fontWeight: '600', fontSize: 13 }}>Continue Demo</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── Expired Modal ───────────────────────────────────────────── */}
            <Modal visible={showExpiredModal} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
                    <View style={{
                        backgroundColor: '#0f172a', borderRadius: 24, padding: 28, width: '100%',
                        borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
                    }}>
                        <View style={{ alignSelf: 'center', marginBottom: 18 }}>
                            <View style={{ width: 68, height: 68, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
                                <Zap size={30} color="#ef4444" />
                            </View>
                        </View>

                        <Text style={{ color: '#f1f5f9', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
                            Demo Ended
                        </Text>
                        <Text style={{ color: '#94a3b8', fontSize: 13.5, textAlign: 'center', lineHeight: 22, marginBottom: 26 }}>
                            Your 15-minute trial is up. Sign up to unlock the full Cloudora experience.
                        </Text>

                        <TouchableOpacity
                            style={{ backgroundColor: '#6366f1', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10, flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                            onPress={() => { setShowExpiredModal(false); router.replace('/(auth)/demo'); }}
                        >
                            <Rocket size={17} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Create Free Account</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ paddingVertical: 12, alignItems: 'center' }}
                            onPress={() => { setShowExpiredModal(false); router.replace('/(auth)/demo'); }}
                        >
                            <Text style={{ color: '#475569', fontWeight: '600', fontSize: 13 }}>Back to Demo Page</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}