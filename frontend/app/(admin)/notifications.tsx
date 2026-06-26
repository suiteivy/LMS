import { NotificationsHub } from '@/components/NotificationsHub';
import React from 'react';
import { View } from 'react-native';

export default function NotificationsScreen() {
    return (
        <View style={{ flex: 1, backgroundColor: '#161B22' }}>
            <NotificationsHub />
        </View>
    );
}
