import React, { createContext, useContext, useState, useEffect } from 'react';
import { SettingsService, ExchangeRates } from '@/services/SettingsService';

interface CurrencyContextType {
    rates: ExchangeRates;
    loading: boolean;
    convertUSDToKES: (amount: number) => number;
    formatKES: (amount: number) => string;
    formatUSD: (amount: number) => string;
    refreshRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [rates, setRates] = useState<ExchangeRates>({ KES: 130.0, last_updated: null });
    const [loading, setLoading] = useState(true);

    const fetchRates = async () => {
        try {
            setLoading(true);
            const data = await SettingsService.getCurrencyRates();
            setRates(data);
        } catch (error) {
            console.error('Failed to fetch rates:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRates();
    }, []);

    const convertUSDToKES = (amount: number) => {
        return amount * rates.KES;
    };

    const formatKES = (amount: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount).replace('KES', 'KSh');
    };

    const formatUSD = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const refreshRates = async () => {
        await fetchRates();
    };

    return (
        <CurrencyContext.Provider value={{
            rates,
            loading,
            convertUSDToKES,
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
