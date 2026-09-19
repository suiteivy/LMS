import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { BursaryService } from "@/services/BursaryService";
import { StudentService } from "@/services/StudentService";
import { showFetchError } from "@/utils/toast";
import { router } from "expo-router";
import {
    ArrowDownLeft,
    ArrowUpRight,
    Award,
    CreditCard,
    Download,
    Eye,
    FileText,
    Info,
    Receipt,
    Wallet
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { PdfPreviewModal } from "@/components/pdf/PdfPreviewModal";
import { InvoiceReceiptService } from "@/services/InvoiceReceiptService";

export default function StudentFinancePage() {
    const { studentId, isDemo } = useAuth();
    const { isDark } = useTheme();
    const { formatAmount } = useCurrency();
    const tier = useSubscriptionTier();
    const [loading, setLoading] = useState(true);
    const [financeData, setFinanceData] = useState<any>(null);
    const [bursaries, setBursaries] = useState<any[]>([]);
    const [bursaryLoading, setBursaryLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'fees' | 'bursaries'>('fees');
    const [previewPayload, setPreviewPayload] = useState<any | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const handlePreviewInvoice = async (invoiceId: string, invoiceNumber?: string) => {
        try {
            setActionLoadingId(`inv-prev-${invoiceId}`);
            const preview = await InvoiceReceiptService.previewInvoicePdf(invoiceId);
            setPreviewPayload({
                documentType: 'fee_invoice',
                data: {},
                title: `Fee Invoice ${invoiceNumber || ''}`.trim(),
                fileName: preview.filename,
                pdfBase64: preview.base64,
            });
        } catch (err: any) {
            console.error('Invoice preview error:', err);
            Alert.alert('Preview Error', err?.response?.data?.error || 'Failed to preview invoice PDF.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDownloadInvoice = async (invoiceId: string, invoiceNumber?: string) => {
        try {
            setActionLoadingId(`inv-dl-${invoiceId}`);
            await InvoiceReceiptService.downloadInvoicePdf(invoiceId, invoiceNumber);
        } catch (err: any) {
            console.error('Invoice download error:', err);
            Alert.alert('Download Error', err?.response?.data?.error || 'Failed to download invoice PDF.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handlePreviewReceipt = async (paymentId: string, refNumber?: string) => {
        try {
            setActionLoadingId(`rcp-prev-${paymentId}`);
            const preview = await InvoiceReceiptService.previewPaymentReceiptPdf(paymentId);
            setPreviewPayload({
                documentType: 'payment_receipt',
                data: {},
                title: `Payment Receipt ${refNumber || ''}`.trim(),
                fileName: preview.filename,
                pdfBase64: preview.base64,
            });
        } catch (err: any) {
            console.error('Receipt preview error:', err);
            Alert.alert('Preview Error', err?.response?.data?.error || 'Failed to preview payment receipt PDF.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDownloadReceipt = async (paymentId: string, refNumber?: string) => {
        try {
            setActionLoadingId(`rcp-dl-${paymentId}`);
            await InvoiceReceiptService.downloadPaymentReceiptPdf(paymentId, refNumber);
        } catch (err: any) {
            console.error('Receipt download error:', err);
            Alert.alert('Download Error', err?.response?.data?.error || 'Failed to download payment receipt PDF.');
        } finally {
            setActionLoadingId(null);
        }
    };

    useEffect(() => {
        fetchData();
    }, [isDemo]);

    const fetchData = async () => {
        try {
            setLoading(true);

            if (isDemo) {
                // High-quality mock data for Demo Mode
                setFinanceData({
                    balance: 450.00,
                    total_fees: 1650.00,
                    paid_amount: 1200.00,
                    transactions: [
                        { id: 'tx-1', type: 'fee_payment', direction: 'inflow', amount: 600.00, date: new Date().toISOString() },
                        { id: 'tx-2', type: 'tuition_charge', direction: 'outflow', amount: 1050.00, date: new Date(Date.now() - 30 * 86400000).toISOString() },
                        { id: 'tx-3', type: 'fee_payment', direction: 'inflow', amount: 600.00, date: new Date(Date.now() - 60 * 86400000).toISOString() }
                    ]
                });
                setBursaries([
                    {
                        id: 'b-1', status: 'approved', amount_awarded: 500.00, notes: 'Excellence award',
                        bursary: { title: 'Academic Excellence Bursary', description: 'For top-performing students', amount: 500, deadline: new Date(Date.now() + 90 * 86400000).toISOString(), status: 'open' }
                    }
                ]);
                setLoading(false);
                return;
            }

            const [data] = await Promise.all([
                StudentService.getFinance(),
            ]);
            setFinanceData(data);

        } catch (error) {
            console.error(error);
            showFetchError("financial records", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBursaries = async () => {
        if (bursaries.length > 0 || isDemo) return;
        try {
            setBursaryLoading(true);
            const data = await BursaryService.getMyApprovedBursaries();
            setBursaries(data);
        } catch (err) {
            console.error(err);
            showFetchError("bursary records", err);
        } finally {
            setBursaryLoading(false);
        }
    };

    const handleTabChange = (tab: 'fees' | 'bursaries') => {
        setActiveTab(tab);
        if (tab === 'bursaries') fetchBursaries();
    };

    const formatKES = (amount: number) => formatAmount(Number(amount || 0));

    if (loading) {
        return (
            <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] p-4 md:p-8">
                <ListItemSkeleton loading={loading} count={4} label="Loading finance records..." />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Finance"
                subtitle="Finances"
                role="Student"
                onBack={() => router.back()}
            />

            {/* Tab Selector */}
            <View className="flex-row mx-4 mt-4 mb-2 bg-[#FFFFFF] dark:bg-[#161B22] rounded-xl p-1 border border-[#D0D7DE] dark:border-[#21262D]">
                {([
                    { key: 'fees', label: 'Fees & Payments', icon: CreditCard },
                    { key: 'bursaries', label: 'Bursaries', icon: Award },
                ] as const).map(({ key, label, icon: Icon }) => (
                    <TouchableOpacity
                        key={key}
                        onPress={() => handleTabChange(key)}
                        className={`flex-1 flex-row items-center justify-center py-3 rounded-xl gap-1 ${activeTab === key ? 'bg-gray-900' : ''}`}
                    >
                        <Icon size={14} color={activeTab === key ? 'white' : '#9CA3AF'} />
                        <Text className={`text-[11px] font-bold ${activeTab === key ? 'text-white' : 'text-gray-400'}`}>{label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                <View className="p-4 md:p-8 bg-gray-50 dark:bg-[#161B22]">

                    {activeTab === 'fees' ? (
                        <>
                            {/* Balance Hero */}
                            <View className="flex-row items-center justify-between px-2 mb-3">
                                <Text className="text-gray-900 dark:text-white font-bold text-lg tracking-tight">Finance Overview</Text>
                                <HelpTooltip
                                    id="student.finance.overview"
                                    role="student"
                                    tier={tier}
                                    onLearnMore={(a) => router.push({ pathname: '/(student)/accessibility/settings', params: { manual: '1', anchor: a || 'student-workflow' } } as any)}
                                />
                            </View>
                            <View 
                                style={{
                                    boxShadow: [{
                                        offsetX: 0,
                                        offsetY: 15,
                                        blurRadius: 30,
                                        color: 'rgba(0, 0, 0, 0.3)',
                                    }],
                                    }}
                                className="bg-gray-900 p-8 rounded-xl mb-8"
                            >
                                <View className="flex-row justify-between items-center mb-6">
                                    <View>
                                        <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[3px] mb-2">Total Outstanding</Text>
                                        <Text className="text-white text-5xl font-black tracking-tighter">
                                            {formatKES(financeData?.balance || 0)}
                                        </Text>
                                        {financeData?.balance > 0 && (
                                            <View className="bg-[#FF6900]/20 self-start px-3 py-1 rounded-full mt-2">
                                                <Text className="text-[#FF6900] text-[10px] font-bold tracking-widest uppercase">
                                                    Due
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <View className="w-16 h-16 rounded-full bg-white/5 items-center justify-center border border-white/10">
                                        <Wallet size={32} color="white" />
                                    </View>
                                </View>

                                <View className="flex-row gap-4 pt-8 border-t border-white/10">
                                    <View className="flex-1">
                                        <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest mb-1">Fee Obligation</Text>
                                        <Text className="text-white font-bold text-base">{formatKES(financeData?.total_fees || 0)}</Text>
                                    </View>
                                    <View className="flex-1 border-l border-white/10 pl-4">
                                        <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest mb-1">Paid</Text>
                                        <Text className="text-emerald-400 font-bold text-base">{formatKES(financeData?.paid_amount || 0)}</Text>
                                    </View>
                                </View>
                            </View>

                            {(financeData?.fee_structures || []).length === 0 && (
                                <View className="bg-white dark:bg-[#161B22] p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 mb-8">
                                    <Text className="text-gray-500 dark:text-gray-400 text-sm font-semibold text-center">
                                        No fee structures for the active period.
                                    </Text>
                                </View>
                            )}

                            {(financeData?.fee_structures || []).length > 0 && (
                                <View className="mb-8">
                                    <Text className="text-gray-900 dark:text-white font-bold text-lg tracking-tight mb-4 px-2">Current Fee Structures</Text>
                                    {financeData.fee_structures.map((fee: any) => (
                                        <View
                                            key={fee.id}
                                            className="bg-[#FFFFFF] dark:bg-[#161B22] p-5 rounded-xl mb-3 border border-[#D0D7DE] dark:border-[#21262D]"
                                        >
                                            <View className="flex-row justify-between items-start">
                                                <View className="flex-1 mr-3">
                                                    <Text className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">{fee.title || 'Fee item'}</Text>
                                                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                                                        {fee.term || 'Term'} {fee.academic_year || ''}
                                                    </Text>
                                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-semibold mt-2">
                                                        Due: {fee.due_date ? new Date(fee.due_date).toLocaleDateString() : 'No deadline'}
                                                    </Text>
                                                </View>
                                                <Text className="text-gray-900 dark:text-white font-black text-base">{formatKES(fee.amount || 0)}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Official Invoices & Billing Statements */}
                            <View className="mb-8">
                                <View className="px-2 mb-3 flex-row items-center justify-between">
                                    <View className="flex-row items-center gap-2">
                                        <FileText size={18} color="#FF6900" />
                                        <Text className="text-gray-900 dark:text-white font-bold text-lg tracking-tight">Official Invoices</Text>
                                    </View>
                                    <Text className="text-gray-400 text-xs font-semibold">
                                        {(financeData?.invoices || []).length} Statement{((financeData?.invoices || []).length === 1) ? '' : 's'}
                                    </Text>
                                </View>

                                {(financeData?.invoices || []).length === 0 ? (
                                    <View className="bg-white dark:bg-[#161B22] p-6 rounded-xl border border-dashed border-[#D0D7DE] dark:border-[#21262D]">
                                        <Text className="text-gray-400 text-xs font-medium text-center">
                                            No billing statements have been issued for this account yet.
                                        </Text>
                                    </View>
                                ) : (
                                    financeData.invoices.map((inv: any) => {
                                        const isPartial = inv.status === 'partial';
                                        const isPaid = inv.status === 'paid' || inv.status === 'cleared';
                                        const statusBg = isPaid
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                            : isPartial
                                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                            : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';

                                        return (
                                            <View
                                                key={inv.id}
                                                className="bg-[#FFFFFF] dark:bg-[#161B22] p-5 rounded-xl mb-3 border border-[#D0D7DE] dark:border-[#21262D]"
                                            >
                                                <View className="flex-row justify-between items-start mb-3">
                                                    <View className="flex-1 mr-3">
                                                        <View className="flex-row items-center gap-2">
                                                            <Text className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">
                                                                {inv.invoice_number}
                                                            </Text>
                                                            <View className={`px-2 py-0.5 rounded-full border ${statusBg}`}>
                                                                <Text className="text-[10px] font-extrabold uppercase tracking-wider">
                                                                    {inv.status}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <Text className="text-gray-400 text-[10px] font-semibold mt-1">
                                                            Issued: {inv.issue_date || 'Current Session'} · Due: {inv.due_date || 'Term Due Date'}
                                                        </Text>
                                                    </View>
                                                    <Text className="text-gray-900 dark:text-white font-black text-base">
                                                        {formatKES(inv.net_amount || 0)}
                                                    </Text>
                                                </View>

                                                <View className="flex-row justify-between py-2 border-t border-b border-gray-100 dark:border-gray-800 my-2">
                                                    <View>
                                                        <Text className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">Gross</Text>
                                                        <Text className="text-gray-600 dark:text-gray-300 text-xs font-semibold">{formatKES(inv.gross_amount || 0)}</Text>
                                                    </View>
                                                    <View>
                                                        <Text className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">Discount</Text>
                                                        <Text className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">-{formatKES(inv.discount_amount || 0)}</Text>
                                                    </View>
                                                    <View>
                                                        <Text className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">Paid</Text>
                                                        <Text className="text-gray-600 dark:text-gray-300 text-xs font-semibold">{formatKES(inv.paid_amount || 0)}</Text>
                                                    </View>
                                                    <View>
                                                        <Text className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">Balance Due</Text>
                                                        <Text className="text-red-600 dark:text-red-400 text-xs font-bold">{formatKES(inv.balance_due || 0)}</Text>
                                                    </View>
                                                </View>

                                                <View className="flex-row justify-end gap-2 mt-3">
                                                    <TouchableOpacity
                                                        onPress={() => handlePreviewInvoice(inv.id, inv.invoice_number)}
                                                        disabled={actionLoadingId === `inv-prev-${inv.id}`}
                                                        className="flex-row items-center bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg gap-1.5 border border-gray-200 dark:border-gray-700"
                                                    >
                                                        {actionLoadingId === `inv-prev-${inv.id}` ? (
                                                            <ActivityIndicator size="small" color="#FF6900" />
                                                        ) : (
                                                            <Eye size={13} color="#FF6900" />
                                                        )}
                                                        <Text className="text-gray-800 dark:text-gray-200 text-xs font-bold">Preview</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        onPress={() => handleDownloadInvoice(inv.id, inv.invoice_number)}
                                                        disabled={actionLoadingId === `inv-dl-${inv.id}`}
                                                        className="flex-row items-center bg-[#FF6900] px-3 py-1.5 rounded-lg gap-1.5"
                                                    >
                                                        {actionLoadingId === `inv-dl-${inv.id}` ? (
                                                            <ActivityIndicator size="small" color="white" />
                                                        ) : (
                                                            <Download size={13} color="white" />
                                                        )}
                                                        <Text className="text-white text-xs font-bold">Download PDF</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })
                                )}
                            </View>

                            {/* Status Info */}
                             <View className={`p-6 rounded-xl mb-8 flex-row items-center border ${financeData?.balance > 0 ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900' : 'bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900'}`}>
                                 <View 
                                     style={{
                                         boxShadow: financeData?.balance > 0 ? [{
                                             offsetX: 0,
                                             offsetY: 1,
                                             blurRadius: 2,
                                             color: 'rgba(0, 0, 0, 0.1)',
                                         }] : [{
                                             offsetX: 0,
                                             offsetY: 8,
                                             blurRadius: 12,
                                             color: 'rgba(16, 185, 129, 0.3)',
                                         }],
                                         shadowColor: financeData?.balance > 0 ? "#000" : "#10B981",
                                         shadowOffset: financeData?.balance > 0 ? { width: 0, height: 1 } : { width: 0, height: 8 },
                                         shadowOpacity: financeData?.balance > 0 ? 0.1 : 0.3,
                                         shadowRadius: financeData?.balance > 0 ? 2 : 12,
                                         elevation: financeData?.balance > 0 ? 2 : 8,
                                     }}
                                     className={`w-10 h-10 rounded-xl items-center justify-center ${financeData?.balance > 0 ? 'bg-white' : 'bg-green-500'}`}
                                 >
                                     <Info size={20} color={financeData?.balance > 0 ? "#FF6900" : "white"} />
                                 </View>
                                <Text className={`flex-1 ml-4 text-sm font-medium leading-tight ${financeData?.balance > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-green-900 dark:text-green-200'}`}>
                                    {financeData?.balance > 0
                                        ? `A balance of ${formatKES(financeData?.balance)} is currently due.`
                                        : "Academic financial records are fully cleared for this term."}
                                </Text>
                            </View>

                            {/* Transaction History */}
                            <View className="px-2 flex-row justify-between items-center mb-6">
                                <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">Ledger Statements</Text>
                                <HelpTooltip
                                    id="student.finance.ledger"
                                    role="student"
                                    tier={tier}
                                    onLearnMore={(a) => router.push({ pathname: '/(student)/accessibility/settings', params: { manual: '1', anchor: a || 'student-workflow' } } as any)}
                                />
                                 <TouchableOpacity 
                                     style={{
                                         boxShadow: [{
                                             offsetX: 0,
                                             offsetY: 1,
                                             blurRadius: 2,
                                             color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.08)',
                                         }],
                                         shadowOpacity: isDark ? 0.4 : 0.08,
                                         }}
                                     className="flex-row items-center bg-[#FFFFFF] dark:bg-[#161B22] px-4 py-2 rounded-xl border border-[#D0D7DE] dark:border-[#21262D]"
                                 >
                                     <CreditCard size={14} color="#FF6900" />
                                     <Text className="text-gray-900 dark:text-white text-[10px] font-bold uppercase tracking-widest ml-2">Pay Fees</Text>
                                 </TouchableOpacity>
                            </View>

                            {financeData?.transactions?.length > 0 ? (
                                financeData.transactions.map((tx: any) => (
                                     <View 
                                         key={tx.id} 
                                         style={{
                                             boxShadow: [{
                                                 offsetX: 0,
                                                 offsetY: 1,
                                                 blurRadius: 2,
                                                 color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.08)',
                                             }],
                                             shadowOpacity: isDark ? 0.4 : 0.08,
                                             }}
                                         className="bg-[#FFFFFF] dark:bg-[#161B22] p-5 rounded-xl mb-4 border border-[#D0D7DE] dark:border-[#21262D]"
                                     >
                                        <View className="flex-row items-center">
                                            <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${tx.direction === 'inflow' ? 'bg-green-50 dark:bg-green-950/40' : 'bg-red-50 dark:bg-red-950/40'}`}>
                                                {tx.direction === 'inflow' ? <ArrowDownLeft size={20} color="#16a34a" /> : <ArrowUpRight size={20} color="#dc2626" />}
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">{tx.type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</Text>
                                                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">{new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                                                {tx.reference_number && (
                                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-mono mt-0.5">Ref: {tx.reference_number}</Text>
                                                )}
                                            </View>
                                            <View className="items-end">
                                                <Text className={`font-bold text-base ${tx.direction === 'inflow' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                                                    {tx.direction === 'inflow' ? '+' : '-'}{formatKES(tx.amount)}
                                                </Text>
                                            </View>
                                        </View>

                                        {tx.direction === 'inflow' && (
                                            <View className="flex-row justify-end gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                                <TouchableOpacity
                                                    onPress={() => handlePreviewReceipt(tx.id, tx.reference_number)}
                                                    disabled={actionLoadingId === `rcp-prev-${tx.id}`}
                                                    className="flex-row items-center bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg gap-1.5 border border-gray-200 dark:border-gray-700"
                                                >
                                                    {actionLoadingId === `rcp-prev-${tx.id}` ? (
                                                        <ActivityIndicator size="small" color="#10B981" />
                                                    ) : (
                                                        <Eye size={12} color="#10B981" />
                                                    )}
                                                    <Text className="text-gray-800 dark:text-gray-200 text-xs font-bold">Receipt</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => handleDownloadReceipt(tx.id, tx.reference_number)}
                                                    disabled={actionLoadingId === `rcp-dl-${tx.id}`}
                                                    className="flex-row items-center bg-emerald-600 px-3 py-1.5 rounded-lg gap-1.5"
                                                >
                                                    {actionLoadingId === `rcp-dl-${tx.id}` ? (
                                                        <ActivityIndicator size="small" color="white" />
                                                    ) : (
                                                        <Download size={12} color="white" />
                                                    )}
                                                    <Text className="text-white text-xs font-bold">PDF</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                ))
                            ) : (
                                <View className="bg-[#FFFFFF] dark:bg-[#161B22] p-20 rounded-xl items-center border border-[#D0D7DE] dark:border-[#21262D] border-dashed mt-4">
                                    <Receipt size={48} color="#E5E7EB" />
                                    <Text className="text-gray-400 font-bold text-center mt-6">Void Transaction Hub</Text>
                                </View>
                            )}
                        </>
                    ) : (
                        /* ── Bursaries Tab ── */
                        <>
                            <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight mb-6 px-2">My Approved Bursaries</Text>

                            {bursaryLoading ? (
                                <ListItemSkeleton loading={bursaryLoading} count={3} label="Loading bursaries..." />
                            ) : bursaries.length > 0 ? (
                                bursaries.map((item: any) => (
                                     <View 
                                         key={item.id} 
                                         style={{
                                             boxShadow: [{
                                                 offsetX: 0,
                                                 offsetY: 1,
                                                 blurRadius: 2,
                                                 color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.08)',
                                             }],
                                             shadowOpacity: isDark ? 0.4 : 0.08,
                                             }}
                                         className="bg-[#FFFFFF] dark:bg-[#161B22] rounded-xl mb-5 border border-[#D0D7DE] dark:border-[#21262D] overflow-hidden"
                                     >
                                        {/* Accent bar */}
                                        <View className="h-1.5 bg-emerald-500" />
                                        <View className="p-6">
                                            {/* Title row */}
                                            <View className="flex-row justify-between items-start mb-3">
                                                <Text className="text-gray-900 dark:text-white font-bold text-base flex-1 mr-3">{item.bursary?.title}</Text>
                                                <View className="bg-emerald-100 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                    <Text className="text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">Approved</Text>
                                                </View>
                                            </View>

                                            {/* Description */}
                                            {item.bursary?.description && (
                                                <Text className="text-gray-500 dark:text-gray-400 text-sm mb-4 leading-5">{item.bursary.description}</Text>
                                            )}

                                            {/* Award amount */}
                                            <View className="bg-gray-900 rounded-xl p-5 mb-4 flex-row justify-between items-center">
                                                <View>
                                                    <Text className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-1">Amount Awarded</Text>
                                                    <Text className="text-white text-3xl font-black">{formatKES(item.amount_awarded || item.bursary?.amount || 0)}</Text>
                                                </View>
                                                <View className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 items-center justify-center">
                                                    <Award size={26} color="#10B981" />
                                                </View>
                                            </View>

                                            {/* Meta info */}
                                            <View className="flex-row gap-3 flex-wrap">
                                                {item.bursary?.deadline && (
                                                    <View className="bg-gray-50 dark:bg-[#161B22] px-4 py-2 rounded-xl flex-row items-center gap-2">
                                                        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deadline:</Text>
                                                        <Text className="text-xs font-bold text-gray-900 dark:text-white">
                                                            {new Date(item.bursary.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </Text>
                                                    </View>
                                                )}
                                                {item.notes && (
                                                    <View className="bg-gray-100 dark:bg-[#161B22] px-4 py-2 rounded-xl flex-row items-center gap-2">
                                                        <Text className="text-xs text-gray-900 dark:text-gray-100 font-medium">{item.notes}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <View className="bg-[#FFFFFF] dark:bg-[#161B22] p-20 rounded-xl items-center border border-[#D0D7DE] dark:border-[#21262D] border-dashed mt-4">
                                    <Award size={48} color="#E5E7EB" />
                                    <Text className="text-gray-400 font-bold text-center mt-6">No approved bursaries yet</Text>
                                    <Text className="text-gray-400 text-sm text-center mt-2">Bursary approvals from your institution will appear here.</Text>
                                </View>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>

            <PdfPreviewModal
                visible={!!previewPayload}
                payload={previewPayload}
                onClose={() => setPreviewPayload(null)}
            />
        </View>
    );
}
