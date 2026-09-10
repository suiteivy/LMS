import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { formatCurrency, type CurrencyFormatInput } from '../utils/currency';
import { SettingsService, ExchangeRates } from '@/services/SettingsService';
import { useAuth } from './AuthContext';
import { CurrencyRecord, CurrencyService } from '@/services/CurrencyService';
import { supabase } from '@/libs/supabase';

interface CurrencyContextType {
    rates: ExchangeRates;
    currencies: CurrencyRecord[];
    defaultCurrency: CurrencyRecord | null;
    loading: boolean;
    convertUSDToKES: (amount: number) => number;
    convertAmount: (amount: number, fromCode: string, toCode: string) => number;
    formatAmount: (amount: number, currency?: CurrencyFormatInput) => string;
    formatKES: (amount: number) => string;
    formatUSD: (amount: number) => string;
    refreshRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { session, profile, refreshProfile } = useAuth();
    const refreshProfileRef = useRef(refreshProfile);
    const [rates, setRates] = useState<ExchangeRates>({ KES: 130.0, last_updated: null });
    const [currencies, setCurrencies] = useState<CurrencyRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRates = useCallback(async () => {
        try {
            // Only fetch if we have a valid session to avoid 401s
            if (!session) return;

            setLoading(true);
            const [legacyRates, currencyRows] = await Promise.all([
                SettingsService.getCurrencyRates(),
                CurrencyService.getPublicCurrencies(),
            ]);

            setRates(legacyRates);
            setCurrencies(currencyRows);
        } catch (error) {
            console.error('Failed to fetch rates:', error);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        if (session) {
            fetchRates();
        }
    }, [session, fetchRates]);

    useEffect(() => {
        refreshProfileRef.current = refreshProfile;
    }, [refreshProfile]);

    const institutionId = useMemo(() => {
        const institutionRaw = (profile as any)?.institutions;
        const institution = Array.isArray(institutionRaw) ? institutionRaw[0] : institutionRaw;
        return institution?.id || (profile as any)?.institution_id || null;
    }, [profile]);

    useEffect(() => {
        if (!session || !institutionId) return;

        const channel = supabase
            .channel(`institution-currency-${institutionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'institutions',
                    filter: `id=eq.${institutionId}`,
                },
                async (payload) => {
                    const previousCurrencyId = (payload.old as any)?.currency_id || null;
                    const nextCurrencyId = (payload.new as any)?.currency_id || null;
                    if (previousCurrencyId === nextCurrencyId) return;

                    await Promise.allSettled([
                        refreshProfileRef.current(),
                        fetchRates(),
                    ]);
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session, institutionId, fetchRates]);

    const convertUSDToKES = (amount: number) => {
        return convertAmount(amount, 'USD', 'KES');
    };

    const convertAmount = (amount: number, fromCode: string, toCode: string) => {
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount)) return 0;

        const from = currencies.find((c) => c.code === fromCode.toUpperCase());
        const to = currencies.find((c) => c.code === toCode.toUpperCase());

        const fromRate = Number(from?.usd_rate || (fromCode.toUpperCase() === 'KES' ? rates.KES : 1));
        const toRate = Number(to?.usd_rate || (toCode.toUpperCase() === 'KES' ? rates.KES : 1));

        if (!Number.isFinite(fromRate) || fromRate <= 0 || !Number.isFinite(toRate) || toRate <= 0) {
            return numericAmount;
        }

        const usdAmount = numericAmount / fromRate;
        return usdAmount * toRate;
    };

    const institutionCurrency = useMemo(() => {
        const institutionRaw = (profile as any)?.institutions;
        const institution = Array.isArray(institutionRaw) ? institutionRaw[0] : institutionRaw;
        if (!institution) return null;

        const joinedCurrency = institution.currency;
        if (joinedCurrency?.code) {
            return {
                code: String(joinedCurrency.code).toUpperCase(),
                symbol: joinedCurrency.symbol,
                decimal_places: joinedCurrency.decimal_places,
            };
        }

        const currencyId = institution.currency_id;
        if (currencyId) {
            const matched = currencies.find((c) => c.id === currencyId);
            if (matched?.code) {
                return {
                    code: String(matched.code).toUpperCase(),
                    symbol: matched.symbol,
                    decimal_places: matched.decimal_places,
                };
            }
        }

        return null;
    }, [profile, currencies]);

    const defaultCurrency = useMemo(
        () => currencies.find((c) => c.is_default) || null,
        [currencies]
    );

    const formatAmount = (amount: number, currencyInput?: CurrencyFormatInput) => {
        if (currencyInput) {
            if (typeof currencyInput === 'string') {
                const code = String(currencyInput).toUpperCase();
                const currency = currencies.find((c) => String(c.code || '').toUpperCase() === code);
                return formatCurrency(amount, currency || code);
            }

            const code = String(currencyInput.code || '').toUpperCase();
            if (code) {
                const currency = currencies.find((c) => String(c.code || '').toUpperCase() === code);
                return formatCurrency(amount, currency || { ...currencyInput, code });
            }

            return formatCurrency(amount, currencyInput);
        }

        return formatCurrency(amount, institutionCurrency || defaultCurrency || 'KES');
    };

    const formatKES = (amount: number) => {
        return formatAmount(amount, 'KES');
    };

    const formatUSD = (amount: number) => {
        return formatAmount(amount, 'USD');
    };

    const refreshRates = async () => {
        if (session) {
            await fetchRates();
        }
    };

    return (
        <CurrencyContext.Provider value={{
            rates,
            currencies,
            defaultCurrency,
            loading,
            convertUSDToKES,
            convertAmount,
            formatAmount,
            formatKES,
            formatUSD,
            refreshRates
        }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};
