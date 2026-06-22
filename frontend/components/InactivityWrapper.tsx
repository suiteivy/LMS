import React, { useCallback, useEffect } from 'react';
import { View, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

interface InactivityWrapperProps {
    children: React.ReactNode;
}

export const InactivityWrapper: React.FC<InactivityWrapperProps> = ({ children }) => {
    const { resetSessionTimer, session } = useAuth();

    // Reset session timers (both local idle timer and throttled ping to backend)
    const handleInteraction = useCallback(() => {
        if (session) {
            resetSessionTimer();
        }
        return false; // We don't want to capture the touch, just sense it
    }, [resetSessionTimer, session]);

    // Handle web specific interaction events
    useEffect(() => {
        if (Platform.OS !== 'web' || !session) return;

        const events = ['mousemove', 'keypress', 'scroll', 'click', 'touchstart'];
        
        const resetTimer = () => {
            handleInteraction();
        };

        // Attach listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer, { passive: true });
        });

        // Initial setup
        resetTimer();

        return () => {
            // Cleanup listeners
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [session, handleInteraction]);

    return (
        <View
            style={{ flex: 1 }}
            onStartShouldSetResponderCapture={handleInteraction}
        >
            {children}
        </View>
    );
};
