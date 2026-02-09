import { SchoolProvider } from '@/contexts/SchoolContext';

export default function TeacherLayout({
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
