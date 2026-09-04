import React from 'react';
import { Stack } from 'expo-router';
import { NotFoundView } from '@/components/common/NotFoundView';

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Page Not Found',
                    headerShown: false,
                }}
            />
            <NotFoundView mode="route" />
        </>
    );
}
