import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { NotificationAPI } from '../services/NotificationService';
import { Notification } from '../types/types';
import { useAuth } from './AuthContext';
import { useRealtimeQuery } from '../hooks/useRealtimeQuery';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    refreshNotifications: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    showNotifications: boolean;
    setShowNotifications: (show: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const { session } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const fetchNotifications = async () => {
        if (!session) return;
        try {
            const data = await NotificationAPI.getUserNotifications();
            setNotifications(data);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };

    // Listen to realtime changes on the notifications table
    useRealtimeQuery('notifications', () => {
        fetchNotifications();
    });

    const lastToken = React.useRef<string | null>(null);

    useEffect(() => {
        const currentToken = session?.access_token || null;

        if (currentToken) {
            if (lastToken.current !== currentToken) {
                lastToken.current = currentToken;
                fetchNotifications();
            }
            // Simple polling every 60 seconds - only if token exists
            const interval = setInterval(() => {
                if (session?.access_token) fetchNotifications();
            }, 60000);
            return () => clearInterval(interval);
        } else {
            lastToken.current = null;
            setNotifications([]);
        }
    }, [session?.access_token]);

    const markAsRead = async (id: string) => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            await NotificationAPI.markAsRead(id);
        } catch (error) {
            console.error("Failed to mark as read:", error);
            fetchNotifications(); // Revert on error
        }
    };

    const markAllAsRead = async () => {
        try {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            await NotificationAPI.markAllAsRead();
        } catch (error) {
            console.error("Failed to mark all as read:", error);
            fetchNotifications();
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            refreshNotifications: fetchNotifications,
            markAsRead,
            markAllAsRead,
            showNotifications,
            setShowNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
