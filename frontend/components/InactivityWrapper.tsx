import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

interface InactivityWrapperProps {
    children: React.ReactNode;
}

export const InactivityWrapper: React.FC<InactivityWrapperProps> = ({ children }) => {
    const { resetSessionTimer, session } = useAuth();

    // This will trigger on any touch start in the app
    const handleInteraction = useCallback(() => {
        if (session) {
            resetSessionTimer();
        }
        return false; // We don't want to capture the touch, just sense it
    }, [resetSessionTimer, session]);

    return (
        <View
            style={{ flex: 1 }}
            onStartShouldSetResponderCapture={handleInteraction}
        >
            {children}
        </View>
    );
};
