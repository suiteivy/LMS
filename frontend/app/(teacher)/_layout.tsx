import { Slot } from 'expo-router';
import { SchoolProvider } from '@/contexts/SchoolContext';
import { AuthGuard } from '@/components/AuthGuard';

export default function TeacherLayout() {
    return (
        <AuthGuard>
            <SchoolProvider>
                <Slot />
            </SchoolProvider>
        </AuthGuard>
    );
}
