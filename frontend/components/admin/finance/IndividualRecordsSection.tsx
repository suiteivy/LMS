import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { FinanceService } from '@/services/FinanceService';
import { supabase } from '@/libs/supabase';
import { showError, showSuccess } from '@/utils/toast';
import {
  Search,
  User,
  Users,
  Briefcase,
  DollarSign,
  FileText,
  Printer,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CreditCard,
  Building2,
} from 'lucide-react-native';
import * as Print from 'expo-print';

type PersonType = 'student' | 'staff';

interface PersonOption {
  id: string;
  name: string;
  display_id?: string;
  email?: string;
  status?: string;
  lifecycle_status?: string;
}

export const IndividualRecordsSection: React.FC = () => {
  const { isDark } = useTheme();
  const { formatAmount: formatMoney } = useCurrency();

  const [personType, setPersonType] = useState<PersonType>('student');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PersonOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null);

  // Financial record state
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [recordData, setRecordData] = useState<any>(null);

  // Balance adjustment modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim() || searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        if (personType === 'student') {
          const { data, error } = await supabase
            .from('students')
            .select('id, admission_number, lifecycle_status, users(id, full_name, email)')
            .or(`admission_number.ilike.%${searchQuery.trim()}%,users.full_name.ilike.%${searchQuery.trim()}%`)
            .limit(10);

          if (!error && data) {
            const formatted = data.map((item: any) => ({
              id: item.id,
              name: item.users?.full_name || 'Student',
              display_id: item.admission_number || '',
              email: item.users?.email || '',
              lifecycle_status: item.lifecycle_status || 'active',
            }));
            setSearchResults(formatted);
          }
        } else {
          const { data, error } = await supabase
            .from('teachers')
            .select('id, employee_id, lifecycle_status, users(id, full_name, email)')
            .or(`employee_id.ilike.%${searchQuery.trim()}%,users.full_name.ilike.%${searchQuery.trim()}%`)
            .limit(10);

          if (!error && data) {
            const formatted = data.map((item: any) => ({
              id: item.id,
              name: item.users?.full_name || 'Staff Member',
              display_id: item.employee_id || '',
              email: item.users?.email || '',
              lifecycle_status: item.lifecycle_status || 'active',
            }));
            setSearchResults(formatted);
          }
        }
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, personType]);

  const loadFinancialRecord = useCallback(async (person: PersonOption) => {
    setLoadingRecord(true);
    try {
      const data = await FinanceService.getIndividualFinancialRecord(personType, person.id);
      setRecordData(data);
    } catch (err: any) {
      showError('Failed to load record', err?.message || 'Could not fetch financial details');
      setRecordData(null);
    } finally {
      setLoadingRecord(false);
    }
  }, [personType]);

  const handleSelectPerson = (person: PersonOption) => {
    setSelectedPerson(person);
    setSearchResults([]);
    setSearchQuery('');
    loadFinancialRecord(person);
  };

  const handleAdjustBalance = async () => {
    if (!selectedPerson) return;
    const numAmount = parseFloat(adjustAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showError('Invalid Amount', 'Please enter a valid positive adjustment amount.');
      return;
    }
    if (!adjustReason.trim()) {
      showError('Reason Required', 'Please enter a mandatory explanation for this balance adjustment.');
      return;
    }

    try {
      setAdjusting(true);
      await FinanceService.adjustIndividualBalance(
        selectedPerson.id,
        numAmount,
        adjustType,
        adjustReason.trim()
      );
      showSuccess('Balance Adjusted', `Successfully recorded ${adjustType} adjustment of ${formatMoney(numAmount)}.`);
      setShowAdjustModal(false);
      setAdjustAmount('');
      setAdjustReason('');
      await loadFinancialRecord(selectedPerson);
    } catch (err: any) {
      showError('Adjustment Failed', err?.message || 'Could not update balance');
    } finally {
      setAdjusting(false);
    }
  };

  const handlePrintStatement = async () => {
    if (!selectedPerson || !recordData) return;

    try {
      const isStudent = personType === 'student';
      const paymentsRows = (recordData.payments || [])
        .map(
          (p: any) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date(p.payment_date).toLocaleDateString()}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${p.receipt_number || p.reference_number || 'N/A'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-transform: capitalize;">${p.payment_method || 'Cash'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${formatMoney(p.amount)}</td>
          </tr>`
        )
        .join('');

      const feeRows = (recordData.fee_structures || [])
        .map(
          (f: any) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${f.name || f.academic_year || 'Tuition'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${formatMoney(f.amount || f.base_fee)}</td>
          </tr>`
        )
        .join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #111; }
            .header { border-bottom: 2px solid #FF6900; padding-bottom: 16px; margin-bottom: 24px; }
            .title { font-size: 24px; font-weight: bold; color: #111; }
            .subtitle { font-size: 14px; color: #666; margin-top: 4px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 24px; }
            .summary-box { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { text-align: left; padding: 8px; background: #f1f3f5; font-size: 12px; text-transform: uppercase; color: #495057; }
            .footer { font-size: 11px; color: #888; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Official Financial Statement</div>
            <div class="subtitle">Generated on ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="meta">
            <div>
              <strong>${isStudent ? 'Student Details' : 'Staff Details'}:</strong><br />
              Name: ${selectedPerson.name}<br />
              ID: ${selectedPerson.display_id || 'N/A'}<br />
              Email: ${selectedPerson.email || 'N/A'}<br />
              Status: <span style="text-transform: capitalize;">${selectedPerson.lifecycle_status || 'Active'}</span>
            </div>
            <div style="text-align: right;">
              <div class="summary-box">
                ${
                  isStudent
                    ? `
                  <div>Total Assessed: <strong>${formatMoney(recordData.total_assessed || 0)}</strong></div>
                  <div>Total Paid: <strong>${formatMoney(recordData.total_paid || 0)}</strong></div>
                  <div style="font-size: 18px; margin-top: 8px; color: ${(recordData.net_balance || 0) > 0 ? '#d9534f' : '#5cb85c'};">
                    Net Balance: <strong>${formatMoney(recordData.net_balance || 0)}</strong>
                  </div>`
                    : `
                  <div>Total Payouts: <strong>${formatMoney(recordData.total_payouts || 0)}</strong></div>
                  <div>Pending Payouts: <strong>${formatMoney(recordData.pending_payouts || 0)}</strong></div>`
                }
              </div>
            </div>
          </div>

          ${
            isStudent
              ? `
            <h3>Fee Structures Applied</h3>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${feeRows || '<tr><td colspan="2" style="padding: 8px;">No specific fee structures recorded.</td></tr>'}
              </tbody>
            </table>

            <h3>Payment History</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Receipt / Ref</th>
                  <th>Method</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${paymentsRows || '<tr><td colspan="4" style="padding: 8px;">No payment records found.</td></tr>'}
              </tbody>
            </table>`
              : `
            <h3>Payout History</h3>
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Status</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(recordData.payouts || [])
                  .map(
                    (p: any) => `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${p.period || p.notes || 'Salary/Payout'}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-transform: capitalize;">${p.status}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${formatMoney(p.amount)}</td>
                  </tr>`
                  )
                  .join('') || '<tr><td colspan="3" style="padding: 8px;">No payout records found.</td></tr>'}
              </tbody>
            </table>`
          }

          <div class="footer">
            This is an authentic system-generated institutional financial document. Verified by LMS Audit Subsystem.
          </div>
        </body>
        </html>
      `;

      await Print.printAsync({ html });
    } catch (err: any) {
      showError('Print Failed', err?.message || 'Could not generate printable statement');
    }
  };

  const cardBg = isDark ? '#161B22' : '#FFFFFF';
  const borderCol = isDark ? '#30363D' : '#E1E4E8';
  const textMuted = isDark ? '#8B949E' : '#586069';

  return (
    <View style={{ flex: 1 }}>
      {/* Selector: Students vs Staff */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={() => {
            setPersonType('student');
            setSelectedPerson(null);
            setRecordData(null);
          }}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 12,
            borderRadius: 14,
            backgroundColor: personType === 'student' ? '#FF6900' : isDark ? '#21262D' : '#F0F2F5',
          }}
        >
          <Users size={18} color={personType === 'student' ? '#FFF' : textMuted} />
          <Text style={{ fontWeight: '700', fontSize: 14, color: personType === 'student' ? '#FFF' : textMuted }}>
            Student Ledgers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setPersonType('staff');
            setSelectedPerson(null);
            setRecordData(null);
          }}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 12,
            borderRadius: 14,
            backgroundColor: personType === 'staff' ? '#FF6900' : isDark ? '#21262D' : '#F0F2F5',
          }}
        >
          <Briefcase size={18} color={personType === 'staff' ? '#FFF' : textMuted} />
          <Text style={{ fontWeight: '700', fontSize: 14, color: personType === 'staff' ? '#FFF' : textMuted }}>
            Staff Accounts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Person Search Box */}
      <View style={{ position: 'relative', zIndex: 10, marginBottom: 20 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: borderCol,
            borderRadius: 12,
            paddingHorizontal: 12,
          }}
        >
          <Search size={18} color={textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={
              personType === 'student'
                ? 'Search student by name or admission number...'
                : 'Search teacher or staff by name or employee ID...'
            }
            placeholderTextColor={textMuted}
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 10,
              color: isDark ? '#FFF' : '#111',
              fontSize: 14,
            }}
          />
          {searching && <ActivityIndicator size="small" color="#FF6900" />}
        </View>

        {/* Dropdown Suggestions */}
        {searchResults.length > 0 && (
          <View
            style={{
              position: 'absolute',
              top: 50,
              left: 0,
              right: 0,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: borderCol,
              borderRadius: 12,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 6,
              maxHeight: 240,
              overflow: 'hidden',
            }}
          >
            <ScrollView nestedScrollEnabled>
              {searchResults.map((person) => (
                <TouchableOpacity
                  key={person.id}
                  onPress={() => handleSelectPerson(person)}
                  style={{
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: borderCol,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: isDark ? '#FFF' : '#111' }}>
                      {person.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: textMuted }}>
                      {person.display_id ? `ID: ${person.display_id} • ` : ''}
                      {person.email}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor:
                        person.lifecycle_status === 'active'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: person.lifecycle_status === 'active' ? '#10B981' : '#EF4444',
                        textTransform: 'capitalize',
                      }}
                    >
                      {person.lifecycle_status || 'active'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Selected Person Financial Detail View */}
      {selectedPerson ? (
        loadingRecord ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#FF6900" />
            <Text style={{ marginTop: 12, color: textMuted, fontSize: 13 }}>
              Loading financial ledger for {selectedPerson.name}...
            </Text>
          </View>
        ) : recordData ? (
          <View>
            {/* Person Header Card */}
            <View
              style={{
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: borderCol,
                borderRadius: 16,
                padding: 18,
                marginBottom: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <View style={{ flex: 1, minWidth: 200 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#FFF' : '#111' }}>
                    {selectedPerson.name}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor:
                        selectedPerson.lifecycle_status === 'active'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: selectedPerson.lifecycle_status === 'active' ? '#10B981' : '#EF4444',
                        textTransform: 'capitalize',
                      }}
                    >
                      {selectedPerson.lifecycle_status || 'active'}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: textMuted, fontSize: 13, marginTop: 4 }}>
                  {selectedPerson.display_id ? `ID: ${selectedPerson.display_id} • ` : ''}
                  {selectedPerson.email}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={handlePrintStatement}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 10,
                    backgroundColor: isDark ? '#21262D' : '#F0F2F5',
                  }}
                >
                  <Printer size={15} color={isDark ? '#FFF' : '#111'} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#FFF' : '#111' }}>
                    Print Statement
                  </Text>
                </TouchableOpacity>

                {personType === 'student' && (
                  <TouchableOpacity
                    onPress={() => setShowAdjustModal(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      backgroundColor: '#FF6900',
                    }}
                  >
                    <PlusCircle size={15} color="#FFF" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>
                      Adjust Balance
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* KPI Metric Summary Cards */}
            {personType === 'student' ? (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: borderCol,
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: textMuted, textTransform: 'uppercase' }}>
                    Total Assessed
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#FFF' : '#111', marginTop: 4 }}>
                    {formatMoney(recordData.total_assessed || 0)}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: borderCol,
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: textMuted, textTransform: 'uppercase' }}>
                    Total Paid
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#10B981', marginTop: 4 }}>
                    {formatMoney(recordData.total_paid || 0)}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: borderCol,
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: textMuted, textTransform: 'uppercase' }}>
                    Net Balance
                  </Text>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '800',
                      color: (recordData.net_balance || 0) > 0 ? '#EF4444' : '#10B981',
                      marginTop: 4,
                    }}
                  >
                    {formatMoney(recordData.net_balance || 0)}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: borderCol,
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: textMuted, textTransform: 'uppercase' }}>
                    Total Disbursed
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#10B981', marginTop: 4 }}>
                    {formatMoney(recordData.total_payouts || 0)}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: borderCol,
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: textMuted, textTransform: 'uppercase' }}>
                    Pending Payouts
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#F59E0B', marginTop: 4 }}>
                    {formatMoney(recordData.pending_payouts || 0)}
                  </Text>
                </View>
              </View>
            )}

            {/* Student: Fee structures & Payments tables */}
            {personType === 'student' ? (
              <View style={{ gap: 16 }}>
                {/* Applied Fees */}
                <View
                  style={{
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: borderCol,
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#FFF' : '#111', marginBottom: 12 }}>
                    Applied Fee Structures
                  </Text>
                  {(!recordData.fee_structures || recordData.fee_structures.length === 0) ? (
                    <Text style={{ color: textMuted, fontSize: 13 }}>No fee structures assigned yet.</Text>
                  ) : (
                    recordData.fee_structures.map((fee: any, idx: number) => (
                      <View
                        key={fee.id || idx}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingVertical: 8,
                          borderBottomWidth: idx < recordData.fee_structures.length - 1 ? 1 : 0,
                          borderBottomColor: borderCol,
                        }}
                      >
                        <View>
                          <Text style={{ fontWeight: '600', color: isDark ? '#FFF' : '#111', fontSize: 13 }}>
                            {fee.name || fee.academic_year || 'Tuition Fee'}
                          </Text>
                          <Text style={{ color: textMuted, fontSize: 11 }}>
                            Base: {formatMoney(fee.base_fee || 0)}
                            {fee.registration_fee ? ` • Reg: ${formatMoney(fee.registration_fee)}` : ''}
                            {fee.material_fee ? ` • Mat: ${formatMoney(fee.material_fee)}` : ''}
                          </Text>
                        </View>
                        <Text style={{ fontWeight: '700', color: isDark ? '#FFF' : '#111', fontSize: 13 }}>
                          {formatMoney(fee.amount || fee.base_fee || 0)}
                        </Text>
                      </View>
                    ))
                  )}
                </View>

                {/* Payments Table */}
                <View
                  style={{
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: borderCol,
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#FFF' : '#111', marginBottom: 12 }}>
                    Payments & Transactions Ledger
                  </Text>
                  {(!recordData.payments || recordData.payments.length === 0) ? (
                    <Text style={{ color: textMuted, fontSize: 13 }}>No payments recorded for this student.</Text>
                  ) : (
                    recordData.payments.map((p: any, idx: number) => (
                      <View
                        key={p.id || idx}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: 10,
                          borderBottomWidth: idx < recordData.payments.length - 1 ? 1 : 0,
                          borderBottomColor: borderCol,
                        }}
                      >
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontWeight: '600', color: isDark ? '#FFF' : '#111', fontSize: 13 }}>
                              {p.receipt_number || p.reference_number || 'Transaction'}
                            </Text>
                            <View
                              style={{
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                                borderRadius: 4,
                                backgroundColor: p.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: '700',
                                  color: p.status === 'completed' ? '#10B981' : '#F59E0B',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {p.status}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ color: textMuted, fontSize: 11, marginTop: 2 }}>
                            {new Date(p.payment_date).toLocaleDateString()} • {p.payment_method || 'Cash'}
                          </Text>
                        </View>
                        <Text style={{ fontWeight: '800', color: '#10B981', fontSize: 14 }}>
                          +{formatMoney(p.amount)}
                        </Text>
                      </View>
                    ))
                  )}
                </View>

                {/* Approved Bursaries */}
                {recordData.bursaries && recordData.bursaries.length > 0 && (
                  <View
                    style={{
                      backgroundColor: cardBg,
                      borderWidth: 1,
                      borderColor: borderCol,
                      borderRadius: 14,
                      padding: 16,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#FFF' : '#111', marginBottom: 12 }}>
                      Scholarships & Bursaries
                    </Text>
                    {recordData.bursaries.map((b: any, idx: number) => (
                      <View
                        key={b.id || idx}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingVertical: 8,
                        }}
                      >
                        <View>
                          <Text style={{ fontWeight: '600', color: isDark ? '#FFF' : '#111', fontSize: 13 }}>
                            {b.bursary_schemes?.name || b.title || 'Institutional Bursary'}
                          </Text>
                          <Text style={{ color: textMuted, fontSize: 11 }}>
                            Approved: {b.approval_status || 'Approved'}
                          </Text>
                        </View>
                        <Text style={{ fontWeight: '700', color: '#10B981', fontSize: 13 }}>
                          {formatMoney(b.awarded_amount || b.amount || 0)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              /* Staff: Payouts & Expenses */
              <View style={{ gap: 16 }}>
                <View
                  style={{
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: borderCol,
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#FFF' : '#111', marginBottom: 12 }}>
                    Disbursed Payouts
                  </Text>
                  {(!recordData.payouts || recordData.payouts.length === 0) ? (
                    <Text style={{ color: textMuted, fontSize: 13 }}>No payouts recorded for this staff member.</Text>
                  ) : (
                    recordData.payouts.map((p: any, idx: number) => (
                      <View
                        key={p.id || idx}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: 10,
                          borderBottomWidth: idx < recordData.payouts.length - 1 ? 1 : 0,
                          borderBottomColor: borderCol,
                        }}
                      >
                        <View>
                          <Text style={{ fontWeight: '600', color: isDark ? '#FFF' : '#111', fontSize: 13 }}>
                            {p.period || p.notes || 'Faculty Disbursement'}
                          </Text>
                          <Text style={{ color: textMuted, fontSize: 11, marginTop: 2 }}>
                            {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : 'Pending'} • {p.status}
                          </Text>
                        </View>
                        <Text style={{ fontWeight: '800', color: isDark ? '#FFF' : '#111', fontSize: 14 }}>
                          {formatMoney(p.amount)}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}
          </View>
        ) : null
      ) : (
        /* Empty prompt */
        <View style={{ paddingVertical: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Building2 size={44} color={textMuted} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#FFF' : '#111', marginTop: 12 }}>
            Search a Student or Staff Member
          </Text>
          <Text style={{ fontSize: 13, color: textMuted, marginTop: 4, textAlign: 'center', maxWidth: 360 }}>
            Enter a name or admission/employee ID above to retrieve real-time financial statements, payment histories, and
            fee balances.
          </Text>
        </View>
      )}

      {/* Balance Adjustment Modal */}
      <Modal
        visible={showAdjustModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdjustModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: isDark ? '#161B22' : '#FFFFFF',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: borderCol,
              maxWidth: 480,
              width: '100%',
              padding: 22,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#FFF' : '#111', marginBottom: 4 }}>
              Adjust Student Balance
            </Text>
            <Text style={{ fontSize: 13, color: textMuted, marginBottom: 16 }}>
              Apply a manual debit or credit adjustment to {selectedPerson?.name} with forensic audit tracking.
            </Text>

            {/* Adjustment Type Switcher */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => setAdjustType('credit')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 10,
                  backgroundColor: adjustType === 'credit' ? '#10B981' : isDark ? '#21262D' : '#F0F2F5',
                }}
              >
                <Text style={{ fontWeight: '700', fontSize: 13, color: adjustType === 'credit' ? '#FFF' : textMuted }}>
                  Credit (Reduce Balance)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setAdjustType('debit')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 10,
                  backgroundColor: adjustType === 'debit' ? '#EF4444' : isDark ? '#21262D' : '#F0F2F5',
                }}
              >
                <Text style={{ fontWeight: '700', fontSize: 13, color: adjustType === 'debit' ? '#FFF' : textMuted }}>
                  Debit (Add Charge)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <Text style={{ fontWeight: '700', fontSize: 12, color: isDark ? '#FFF' : '#111', marginBottom: 6 }}>
              Adjustment Amount *
            </Text>
            <TextInput
              value={adjustAmount}
              onChangeText={setAdjustAmount}
              placeholder="0.00"
              placeholderTextColor={textMuted}
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                borderColor: borderCol,
                borderRadius: 10,
                padding: 10,
                color: isDark ? '#FFF' : '#111',
                backgroundColor: isDark ? '#0D1117' : '#F6F8FA',
                fontSize: 14,
                marginBottom: 14,
              }}
            />

            {/* Mandatory Reason */}
            <Text style={{ fontWeight: '700', fontSize: 12, color: isDark ? '#FFF' : '#111', marginBottom: 6 }}>
              Mandatory Explanation / Audit Note *
            </Text>
            <TextInput
              value={adjustReason}
              onChangeText={setAdjustReason}
              placeholder="e.g. Sibling discount retroactive credit approved by principal"
              placeholderTextColor={textMuted}
              multiline
              numberOfLines={3}
              style={{
                borderWidth: 1,
                borderColor: borderCol,
                borderRadius: 10,
                padding: 10,
                color: isDark ? '#FFF' : '#111',
                backgroundColor: isDark ? '#0D1117' : '#F6F8FA',
                fontSize: 13,
                textAlignVertical: 'top',
                minHeight: 65,
                marginBottom: 18,
              }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowAdjustModal(false)}
                disabled={adjusting}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  backgroundColor: isDark ? '#21262D' : '#EAECEF',
                }}
              >
                <Text style={{ fontWeight: '600', color: isDark ? '#FFF' : '#111', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAdjustBalance}
                disabled={adjusting}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderRadius: 10,
                  backgroundColor: '#FF6900',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 110,
                }}
              >
                {adjusting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{ fontWeight: '700', color: '#FFF', fontSize: 13 }}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
