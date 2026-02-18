import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function BursaryIndex() {
    const { profile } = useAuth();

    // For now, bursary staff can use the finance section of the admin dashboard
    // or we can redirect to a specific management view.
    return <Redirect href="/(admin)/finance" />;
}
