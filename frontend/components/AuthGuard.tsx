import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface AuthGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    requireAuth?: boolean;
    allowedRoles?: string[];
}

const normalizeRole = (r: string) => {
    const val = String(r || '').trim().toLowerCase();
    if (val === 'bursar' || val === 'bursary' || val === 'finance_admin' || val === 'finance_administrator') {
        return 'finance_administrator';
    }
    if (val === 'school_admin' || val === 'super_admin') {
        return 'admin';
    }
    if (val === 'platform_admin') {
        return 'master_admin';
    }
    return val;
};

const expandRoles = (r: string): Set<string> => {
    const norm = normalizeRole(r);
    const set = new Set<string>([norm]);
    if (norm === 'admin') {
        set.add('school_admin');
        set.add('super_admin');
    }
    if (norm === 'master_admin') {
        set.add('admin');
        set.add('platform_admin');
    }
    if (norm === 'finance_administrator') {
        set.add('finance_admin');
        set.add('bursary');
        set.add('bursar');
    }
    return set;
};

export const AuthGuard: React.FC<AuthGuardProps> = ({
    children,
    fallback = null,
    requireAuth = true,
    allowedRoles,
}) => {
    const {
        user,
        profile,
        isInitializing,
        getRoleRedirect,
        isPlatformAdmin,
        activeRole,
        availableRoles,
    } = useAuth();
    const { isDark } = useTheme();
    const hasBeenInitialized = React.useRef(false);

    // Guard against redirect loops
    const redirectCount = React.useRef(0);
    const lastRedirectTarget = React.useRef<string | null>(null);

    useEffect(() => {
        if (!isInitializing) {
            hasBeenInitialized.current = true;
        }
    }, [isInitializing]);

    useEffect(() => {
        if (!isInitializing && requireAuth) {
            if (!user) {
                // Not authenticated — handled by router or parent guard
            } else if (allowedRoles && profile) {
                const normalizedAllowedRoles = new Set<string>();
                allowedRoles.forEach((role) => {
                    expandRoles(role).forEach((r) => normalizedAllowedRoles.add(r));
                });

                const currentRole = activeRole || profile.role || '';
                const currentRoleExpanded = expandRoles(currentRole);

                // Check if current active role satisfies requirements
                let isAllowed = Array.from(currentRoleExpanded).some((r) => normalizedAllowedRoles.has(r));

                // If activeRole is NOT explicitly selected, allow fallback to availableRoles
                if (!isAllowed && !activeRole && availableRoles && availableRoles.length > 0) {
                    const availableExpanded = availableRoles.flatMap((r) => Array.from(expandRoles(r)));
                    isAllowed = availableExpanded.some((r) => normalizedAllowedRoles.has(r));
                }

                // Master admins / platform admins inherit admin permissions
                if (!isAllowed && (isPlatformAdmin || profile.role === 'master_admin')) {
                    if (normalizedAllowedRoles.has('admin')) {
                        isAllowed = true;
                    }
                }

                if (!isAllowed) {
                    const redirectPath =
                        getRoleRedirect(profile, isPlatformAdmin, activeRole || undefined) || '/(auth)/signIn';

                    // Loop prevention
                    if (lastRedirectTarget.current === redirectPath) {
                        redirectCount.current++;
                        if (redirectCount.current > 5) {
                            console.error('AuthGuard: REDIRECT LOOP DETECTED. Aborting.');
                            return;
                        }
                    } else {
                        redirectCount.current = 0;
                        lastRedirectTarget.current = redirectPath;
                    }

                    router.replace(redirectPath as any);
                }
            }
        }
    }, [
        isInitializing,
        user,
        profile,
        requireAuth,
        allowedRoles,
        getRoleRedirect,
        isPlatformAdmin,
        activeRole,
        availableRoles,
    ]);

    const isLoggedOut = requireAuth && !user && !isInitializing;

    if (isInitializing && !hasBeenInitialized.current) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#0F0B2E',
                }}
            >
                <ActivityIndicator size="large" color="#FF6900" />
                <Text style={{ marginTop: 8, color: 'rgba(255,255,255,0.7)' }}>
                    Verifying access...
                </Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            {children}
            {isInitializing && hasBeenInitialized.current && (
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    }}
                >
                    <ActivityIndicator size="small" color="#1ABC9C" />
                </View>
            )}

            {/* Logout Blocker: instantly hide content when session is gone */}
            {isLoggedOut && (
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: isDark ? '#0F0B2E' : '#ffffff',
                        zIndex: 9999,
                    }}
                />
            )}
        </View>
    );
};
