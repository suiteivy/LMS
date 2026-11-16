import { useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/libs/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ActionPermission {
    granted: boolean;
    sources: string[];
}

export type DomainPermissions = Record<string, ActionPermission>;
export type EffectivePermissionsMap = Record<string, DomainPermissions>;

export interface DomainScope {
    scope_types: string[];
    values: any[];
    hidden_fields: string[];
}

export interface EffectiveScopesMap {
    is_unrestricted: boolean;
    domains: Record<string, DomainScope>;
}

export interface UsePermissionsResult {
    can: (domain: string, action: string) => boolean;
    canAny: (domain: string, actions: string[]) => boolean;
    isDomainVisible: (domain: string) => boolean;
    isFieldHidden: (domain: string, fieldName: string) => boolean;
    getScope: (domain: string) => DomainScope | null;
    getSources: (domain: string, action: string) => string[];
    permissions: EffectivePermissionsMap;
    scopes: EffectiveScopesMap;
    isUnrestricted: boolean;
    isLoading: boolean;
    permissionVersion: number;
    refreshPermissions: () => Promise<void>;
}

const DEFAULT_SCOPES: EffectiveScopesMap = {
    is_unrestricted: false,
    domains: {},
};

export function usePermissions(): UsePermissionsResult {
    const { user, profile, isMain, isPlatformAdmin } = useAuth();
    const [permissions, setPermissions] = useState<EffectivePermissionsMap>({});
    const [scopes, setScopes] = useState<EffectiveScopesMap>(DEFAULT_SCOPES);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [permissionVersion, setPermissionVersion] = useState<number>(1);
    const isMounted = useRef<boolean>(true);

    const institutionId = profile?.institution_id;
    const userId = user?.id;

    const cacheKey = userId && institutionId ? `lms_perms_${userId}_${institutionId}` : null;

    // Load from cache first to avoid content flashing
    const loadCached = useCallback(async () => {
        if (!cacheKey) return;
        try {
            const raw = await AsyncStorage.getItem(cacheKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (isMounted.current) {
                    if (parsed.permissions) setPermissions(parsed.permissions);
                    if (parsed.scopes) setScopes(parsed.scopes);
                    if (parsed.version) setPermissionVersion(parsed.version);
                    setIsLoading(false);
                }
            }
        } catch (e) {
            console.warn('[usePermissions] Cache load warning:', e);
        }
    }, [cacheKey]);

    // Fetch fresh effective permissions from the database
    const fetchPermissions = useCallback(async () => {
        if (!userId || !institutionId) {
            setIsLoading(false);
            return;
        }

        try {
            // Main Admin and Master Admin have unrestricted authority
            const isUnrestrictedAdmin = isPlatformAdmin || profile?.role === 'master_admin' || (isMain && profile?.role === 'admin');

            const [permsRes, scopesRes, verRes] = await Promise.all([
                supabase.rpc('get_my_effective_permissions', { p_institution_id: institutionId }),
                supabase.rpc('get_my_effective_scopes', { p_institution_id: institutionId }),
                supabase
                    .from('permission_versions')
                    .select('version')
                    .eq('user_id', userId)
                    .maybeSingle(),
            ]);

            const permsData: EffectivePermissionsMap = (permsRes.data as unknown as EffectivePermissionsMap) || {};
            const scopesData: EffectiveScopesMap = (scopesRes.data as unknown as EffectiveScopesMap) || (isUnrestrictedAdmin ? { is_unrestricted: true, domains: {} } : DEFAULT_SCOPES);
            const currentVersion = verRes.data?.version || 1;

            if (isMounted.current) {
                setPermissions(permsData);
                setScopes(scopesData);
                setPermissionVersion(currentVersion);
                setIsLoading(false);
            }

            // Write to local cache
            if (cacheKey) {
                AsyncStorage.setItem(
                    cacheKey,
                    JSON.stringify({
                        permissions: permsData,
                        scopes: scopesData,
                        version: currentVersion,
                        cachedAt: Date.now(),
                    })
                ).catch(() => {});
            }
        } catch (err) {
            console.warn('[usePermissions] Fetch error:', err);
            if (isMounted.current) setIsLoading(false);
        }
    }, [userId, institutionId, isPlatformAdmin, isMain, profile?.role, cacheKey]);

    useEffect(() => {
        isMounted.current = true;
        loadCached().then(() => {
            fetchPermissions();
        });

        return () => {
            isMounted.current = false;
        };
    }, [loadCached, fetchPermissions]);

    // Realtime listener for permission version bumps
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`user-permissions-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'permission_versions',
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    fetchPermissions();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, fetchPermissions]);

    // Stable permission checking helper
    const can = useCallback(
        (domain: string, action: string): boolean => {
            // Platform / Master Admin or unrestricted Main Admin has full access
            if (scopes.is_unrestricted || isPlatformAdmin || (isMain && profile?.role === 'admin')) {
                return true;
            }
            const domainPerms = permissions[domain];
            if (!domainPerms) return false;
            const actionPerm = domainPerms[action];
            return !!actionPerm?.granted;
        },
        [permissions, scopes.is_unrestricted, isPlatformAdmin, isMain, profile?.role]
    );

    const canAny = useCallback(
        (domain: string, actions: string[]): boolean => {
            return actions.some((act) => can(domain, act));
        },
        [can]
    );

    const isDomainVisible = useCallback(
        (domain: string): boolean => {
            return can(domain, 'view');
        },
        [can]
    );

    const isFieldHidden = useCallback(
        (domain: string, fieldName: string): boolean => {
            if (scopes.is_unrestricted || isPlatformAdmin || (isMain && profile?.role === 'admin')) {
                return false;
            }
            const domainScope = scopes.domains?.[domain];
            if (!domainScope || !domainScope.hidden_fields) return false;
            return domainScope.hidden_fields.includes(fieldName);
        },
        [scopes, isPlatformAdmin, isMain, profile?.role]
    );

    const getScope = useCallback(
        (domain: string): DomainScope | null => {
            return scopes.domains?.[domain] || null;
        },
        [scopes]
    );

    const getSources = useCallback(
        (domain: string, action: string): string[] => {
            if (scopes.is_unrestricted || isPlatformAdmin || (isMain && profile?.role === 'admin')) {
                return ['Main Administrator'];
            }
            return permissions[domain]?.[action]?.sources || [];
        },
        [permissions, scopes.is_unrestricted, isPlatformAdmin, isMain, profile?.role]
    );

    return {
        can,
        canAny,
        isDomainVisible,
        isFieldHidden,
        getScope,
        getSources,
        permissions,
        scopes,
        isUnrestricted: !!scopes.is_unrestricted || isPlatformAdmin || (isMain && profile?.role === 'admin'),
        isLoading,
        permissionVersion,
        refreshPermissions: fetchPermissions,
    };
}
