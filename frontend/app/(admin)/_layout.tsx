import { SchoolProvider } from '@/contexts/SchoolContext';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SchoolProvider>
            {children}
        </SchoolProvider>
    );
}
