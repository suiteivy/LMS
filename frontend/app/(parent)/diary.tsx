import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { DiaryAPI, DiaryEntry } from "@/services/DiaryService";
import { ParentAPI } from "@/services/ParentService";
import { router } from "expo-router";
import { BookOpen, Calendar, CheckCircle2, ChevronDown, Circle, User } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Printer } from 'lucide-react-native';

const DiaryCard = ({ entry, onSign }: { entry: DiaryEntry; onSign: (id: string) => void }) => {
    const [signing, setSigning] = useState(false);

    const handleSign = async () => {
        setSigning(true);
        try {
            await onSign(entry.id);
        } finally {
            setSigning(false);
        }
    };

    const isSigned = entry.is_signed;

    return (
        <View className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-4 shadow-sm">
            <View className="flex-row items-start mb-4">
                <View className="bg-orange-100 dark:bg-orange-950/20 p-2.5 rounded-2xl mr-4">
                    <BookOpen size={20} color="#FF6900" />
                </View>
                <View className="flex-1">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg leading-tight">{entry.title}</Text>
                    <View className="flex-row items-center mt-1">
                        <Calendar size={12} color="#9CA3AF" />
                        <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest ml-1">
                            {new Date(entry.entry_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                        </Text>
                    </View>
                </View>

                {/* Signed badge */}
                {isSigned && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                        <CheckCircle2 size={12} color="#16a34a" />
                        <Text style={{ color: '#16a34a', fontSize: 11, fontWeight: 'bold', marginLeft: 4 }}>Signed</Text>
                    </View>
                )}
            </View>

            <Text className="text-gray-600 dark:text-gray-400 text-sm leading-5">
                {entry.content}
            </Text>

            <View className="flex-row justify-between items-center pt-4 mt-4 border-t border-gray-50 dark:border-gray-800">
                <Text className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-widest">
                    Teacher: {entry.teacher?.users?.full_name || "School Office"}
                </Text>

                {/* Sign button — only shown if not yet signed */}
                {!isSigned && (
                    <TouchableOpacity
                        onPress={handleSign}
                        disabled={signing}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: signing ? '#f3f4f6' : '#FF6900',
                            paddingHorizontal: 14,
                            paddingVertical: 7,
                            borderRadius: 999,
                            opacity: signing ? 0.7 : 1,
                        }}
                    >
                        {signing
                            ? <ActivityIndicator size="small" color="#FF6900" />
                            : <>
                                <Circle size={12} color="white" />
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12, marginLeft: 6 }}>Sign</Text>
                            </>
                        }
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default function ParentDiaryPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [showStudentDropdown, setShowStudentDropdown] = useState(false);

    useEffect(() => {
        fetchLinkedStudents();
    }, []);

    useEffect(() => {
        if (selectedStudentId) {
            fetchEntries();
        }
    }, [selectedStudentId]);

    const fetchLinkedStudents = async () => {
        try {
            const data = await ParentAPI.getLinkedStudents();
            setStudents(data);
            if (data && data.length > 0) {
                setSelectedStudentId(data[0].student_id || data[0].students?.id);
            }
        } catch (error) {
            console.error("Error fetching linked students:", error);
        }
    };

    const fetchEntries = async () => {
        if (!selectedStudentId) return;
        setLoading(true);
        try {
            const data = await DiaryAPI.getEntries(undefined, selectedStudentId);
            setEntries(data);
        } catch (error) {
            console.error("Error fetching diary entries:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSign = async (entryId: string) => {
        try {
            const updated = await DiaryAPI.signEntry(entryId);
            setEntries(prev => prev.map(e => e.id === entryId ? { ...e, is_signed: true } : e));
        } catch (error) {
            Alert.alert("Error", "Could not sign this diary entry. Please try again.");
        }
    };

    const selectedStudentName = students.find(s => s.student_id === selectedStudentId || s.students?.id === selectedStudentId)?.students?.users?.full_name || "Select Student";

    const handlePrint = async () => {
        if (!selectedStudentId || entries.length === 0) {
            Alert.alert("No Data", "There are no entries to print for this student.");
            return;
        }

        try {
            const html = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
                            body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #334155; line-height: 1.5; }
                            .brand { color: #FF6900; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px; }
                            .header { margin-bottom: 50px; }
                            .header h1 { font-size: 36px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -1px; }
                            .header p { font-size: 18px; color: #64748b; margin: 5px 0 0; }
                            .report-info { display: flex; gap: 40px; margin-bottom: 40px; padding: 20px; background: #f8fafc; border-radius: 20px; border: 1px solid #f1f5f9; }
                            .info-item { display: flex; flex-direction: column; }
                            .info-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
                            .info-value { font-size: 14px; font-weight: 600; color: #1e293b; }
                            .entry-list { display: flex; flex-direction: column; gap: 30px; }
                            .entry { border-bottom: 1px solid #f1f5f9; padding-bottom: 30px; page-break-inside: avoid; }
                            .entry-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
                            .entry-title { font-size: 18px; font-weight: 700; color: #0f172a; }
                            .entry-date { font-size: 12px; font-weight: 600; color: #FF6900; }
                            .entry-content { font-size: 14px; color: #475569; background: #fff; padding: 0; }
                            .entry-footer { margin-top: 15px; font-size: 11px; color: #94a3b8; font-weight: 600; }
                            .footer { margin-top: 80px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #f1f5f9; padding-top: 30px; }
                            @media print {
                                body { padding: 20px; }
                                .report-info { background: #fafafa; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="brand">LMS Platform</div>
                        <div class="header">
                            <h1>Student Diary Report</h1>
                            <p>Academic Journey & Daily Progress</p>
                        </div>
                        
                        <div class="report-info">
                            <div class="info-item">
                                <span class="info-label">Student Name</span>
                                <span class="info-value">${selectedStudentName}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Report Date</span>
                                <span class="info-value">${new Date().toLocaleDateString()}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Total Logs</span>
                                <span class="info-value">${entries.length}</span>
                            </div>
                        </div>

                        <div class="entry-list">
                            ${entries.map(e => `
                                <div class="entry">
                                    <div class="entry-header">
                                        <div class="entry-title">${e.title}</div>
                                        <div class="entry-date">${new Date(e.entry_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                    </div>
                                    <div class="entry-content">${e.content}</div>
                                    <div class="entry-footer">
                                        Reported by Teacher: ${e.teacher?.users?.full_name || "School Authority"} • ${e.is_signed ? 'Acknowleged by Parent' : 'Pending Acknowledgement'}
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                        <div class="footer">
                            <p>This is a generated student progress report. For inquiries, please contact the school administration.</p>
                            <p>© ${new Date().getFullYear()} LMS Educational Systems</p>
                        </div>
                    </body>
                </html>
            `;

            if (Platform.OS === 'web') {
                const printWindow = window.open('', '_blank');
                printWindow?.document.write(html);
                printWindow?.document.close();
                printWindow?.print();
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }
        } catch (error) {
            console.error('Print error:', error);
            Alert.alert("Print Error", "Failed to generate diary report.");
        }
    };

    return (
        <View className="flex-1 bg-gray-50 dark:bg-navy">
            <UnifiedHeader
                title="Class Diary"
                subtitle="Daily Activities"
                role="Parent"
                onBack={() => router.push("/(parent)")}
            />

            <View className="p-4 md:p-8 flex-1">
                {/* Student Selection */}
                {students.length > 1 && (
                    <View className="mb-6 relative z-10">
                        <TouchableOpacity
                            className="bg-white dark:bg-[#1a1a1a] rounded-3xl px-6 py-4 border border-gray-100 dark:border-gray-800 flex-row items-center justify-between shadow-sm"
                            onPress={() => setShowStudentDropdown(!showStudentDropdown)}
                        >
                            <View className="flex-row items-center">
                                <User size={18} color="#FF6900" className="mr-3" />
                                <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">{selectedStudentName}</Text>
                            </View>
                            <ChevronDown size={18} color="#6B7280" />
                        </TouchableOpacity>

                        {showStudentDropdown && (
                            <View className="absolute top-16 left-0 right-0 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-[32px] shadow-2xl z-20 overflow-hidden">
                                {students.map(s => (
                                    <TouchableOpacity
                                        key={s.student_id || s.students?.id}
                                        className="px-6 py-4 border-b border-gray-50 dark:border-gray-900 active:bg-gray-50 dark:active:bg-gray-900"
                                        onPress={() => {
                                            setSelectedStudentId(s.student_id || s.students?.id);
                                            setShowStudentDropdown(false);
                                        }}
                                    >
                                        <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">{s.students?.users?.full_name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* List */}
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    <View className="flex-row justify-between items-center mb-6 px-2">
                        <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                            {entries.length} Entries found
                        </Text>
                        <TouchableOpacity
                            className="flex-row items-center bg-white dark:bg-[#1a1a1a] px-4 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-800 active:bg-gray-50 shadow-sm"
                            onPress={handlePrint}
                        >
                            <Printer size={16} color={Platform.OS === 'web' ? '#6B7280' : '#FF6900'} />
                            <Text className="text-gray-600 dark:text-gray-400 font-bold text-[10px] ml-2 uppercase tracking-widest">Print Report</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : entries.length === 0 ? (
                        <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed">
                            <BookOpen size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6 tracking-tight">No diary entries for this student.</Text>
                        </View>
                    ) : (
                        entries.map((entry) => (
                            <DiaryCard key={entry.id} entry={entry} onSign={handleSign} />
                        ))
                    )}
                </ScrollView>
            </View>
        </View>
    );
}
