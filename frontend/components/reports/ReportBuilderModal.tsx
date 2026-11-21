import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import SmartReportsService, {
  CatalogResponse,
  ReportDataset,
  ReportField,
  QuerySpec,
  QueryFilter,
  QueryPeriod,
  PreviewResponse,
} from '@/services/SmartReportsService';
import { PdfPreviewModal } from '@/components/common/PdfPreviewModal';
import { showError, showSuccess } from '@/utils/toast';

export interface ReportBuilderModalProps {
  visible: boolean;
  onClose: () => void;
  sectionContext?: string; // e.g. 'finance', 'results', 'students', 'management'
  initialSpec?: QuerySpec | null;
}

export const ReportBuilderModal: React.FC<ReportBuilderModalProps> = ({
  visible,
  onClose,
  sectionContext = 'management',
  initialSpec,
}) => {
  const { isDark } = useTheme();

  // Wizard Steps: 1: Dataset, 2: Filters, 3: Period, 4: Columns, 5: Preview
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);

  // Form State
  const [selectedDataset, setSelectedDataset] = useState<string>('students');
  const [reportTitle, setReportTitle] = useState<string>('');
  const [filters, setFilters] = useState<QueryFilter[]>([]);
  const [filterField, setFilterField] = useState<string>('');
  const [filterOp, setFilterOp] = useState<any>('eq');
  const [filterVal, setFilterVal] = useState<string>('');

  // Ambiguity Resolvers
  const [isTransportOnly, setIsTransportOnly] = useState(false);
  const [gradeMeaning, setGradeMeaning] = useState<'class_level' | 'score_grade'>('score_grade');
  const [nameMatchMode, setNameMatchMode] = useState<'starts_with' | 'contains'>('contains');

  // Period State
  const [periodType, setPeriodType] = useState<'active' | 'single' | 'multi' | 'range' | 'all'>('active');
  const [singleYear, setSingleYear] = useState<string>('2025');
  const [multiYears, setMultiYears] = useState<string>('2023, 2025');
  const [rangeStart, setRangeStart] = useState<string>('2022');
  const [rangeEnd, setRangeEnd] = useState<string>('2025');

  // Columns & Order State
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>('');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('ASC');

  // Preview & PDF State
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [compilingPdf, setCompilingPdf] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string>('Custom Report');

  // Load Catalog on open
  useEffect(() => {
    if (!visible) return;
    setCurrentStep(1);
    setLoadingCatalog(true);
    SmartReportsService.getCatalog(sectionContext)
      .then((cat) => {
        setCatalog(cat);
        if (cat.datasets.length > 0) {
          const defDs = cat.datasets[0].code;
          setSelectedDataset(defDs);
          // Set default columns
          const dsFields = cat.fields.filter((f) => f.datasetCode === defDs && f.isSelectable);
          setSelectedColumns(dsFields.slice(0, 4).map((f) => f.fieldName));
          if (dsFields.length > 0) {
            setFilterField(dsFields[0].fieldName);
            setSortField(dsFields[0].fieldName);
          }
        }
      })
      .catch((err) => {
        showError(err.message || 'Failed to load report catalog');
      })
      .finally(() => setLoadingCatalog(false));
  }, [visible, sectionContext]);

  // Update selected dataset and reset fields
  const handleDatasetChange = (code: string) => {
    setSelectedDataset(code);
    if (!catalog) return;
    const dsFields = catalog.fields.filter((f) => f.datasetCode === code && f.isSelectable);
    setSelectedColumns(dsFields.slice(0, 4).map((f) => f.fieldName));
    if (dsFields.length > 0) {
      setFilterField(dsFields[0].fieldName);
      setSortField(dsFields[0].fieldName);
    }
    setFilters([]);
  };

  const handleAddFilter = () => {
    if (!filterField || !filterVal.trim()) return;
    setFilters([...filters, { field: filterField, operator: filterOp, value: filterVal.trim() }]);
    setFilterVal('');
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const toggleColumn = (fieldName: string) => {
    if (selectedColumns.includes(fieldName)) {
      if (selectedColumns.length > 1) {
        setSelectedColumns(selectedColumns.filter((c) => c !== fieldName));
      }
    } else {
      setSelectedColumns([...selectedColumns, fieldName]);
    }
  };

  // Build the complete query specification
  const buildCurrentSpec = (): QuerySpec => {
    const period: QueryPeriod = { type: periodType };
    if (periodType === 'single') period.year = singleYear.trim();
    if (periodType === 'multi') {
      period.years = multiYears.split(',').map((y) => y.trim()).filter(Boolean);
    }
    if (periodType === 'range') {
      period.startYear = rangeStart.trim();
      period.endYear = rangeEnd.trim();
    }

    const spec: QuerySpec = {
      dataset: selectedDataset,
      title: reportTitle.trim() || `${selectedDataset.toUpperCase()} CUSTOM REPORT`,
      columns: selectedColumns,
      filters,
      period,
      orderBy: sortField ? [{ field: sortField, direction: sortDir }] : undefined,
      logicModifier: isTransportOnly ? 'only_transport' : undefined,
    };

    return spec;
  };

  // Run preview
  const handleRunPreview = async () => {
    setLoadingPreview(true);
    try {
      const spec = buildCurrentSpec();
      const res = await SmartReportsService.previewReport(spec, sectionContext);
      setPreviewData(res);
      setCurrentStep(5);
    } catch (err: any) {
      showError(err.message || 'Report preview failed');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Compile PDF
  const handleExportPdf = async () => {
    setCompilingPdf(true);
    try {
      const spec = buildCurrentSpec();
      const res = await SmartReportsService.generateReport(spec, sectionContext);
      setPdfBase64(res.base64Pdf);
      setPdfTitle(spec.title || 'Report Summary');
      setPdfModalVisible(true);
      showSuccess('Vector PDF compiled with official metadata');
    } catch (err: any) {
      showError(err.message || 'Failed to export PDF');
    } finally {
      setCompilingPdf(false);
    }
  };

  if (!visible) return null;

  const bgModal = isDark ? '#161B22' : '#FFFFFF';
  const textTitle = isDark ? '#F0F6FC' : '#1F2937';
  const textSub = isDark ? '#8B949E' : '#6B7280';
  const borderColor = isDark ? '#30363D' : '#E5E7EB';
  const inputBg = isDark ? '#0D1117' : '#F9FAFB';

  const datasetFields = catalog?.fields.filter((f) => f.datasetCode === selectedDataset) || [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View style={{ width: '100%', maxWidth: 760, maxHeight: '92%', backgroundColor: bgModal, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: borderColor }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: textTitle }}>Create Custom Report</Text>
              <Text style={{ fontSize: 12, color: textSub, marginTop: 2 }}>
                Section: <Text style={{ fontWeight: '600', color: '#FF6900' }}>{sectionContext.toUpperCase()}</Text> | Step {currentStep} of 5
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 6, borderRadius: 8 }}>
              <Ionicons name="close" size={22} color={textSub} />
            </TouchableOpacity>
          </View>

          {/* Stepper Wizard Bar */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: borderColor, backgroundColor: inputBg }}>
            {[
              { num: 1, label: 'Dataset' },
              { num: 2, label: 'Filters' },
              { num: 3, label: 'Period' },
              { num: 4, label: 'Columns' },
              { num: 5, label: 'Preview' },
            ].map((s) => {
              const active = currentStep === s.num;
              return (
                <TouchableOpacity
                  key={s.num}
                  onPress={() => setCurrentStep(s.num)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    alignItems: 'center',
                    borderBottomWidth: 2,
                    borderBottomColor: active ? '#FF6900' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: active ? '700' : '500', color: active ? '#FF6900' : textSub }}>
                    {s.num}. {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Body */}
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {loadingCatalog ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#FF6900" />
                <Text style={{ color: textSub, marginTop: 12, fontSize: 13 }}>Loading Data Catalog & Permissions...</Text>
              </View>
            ) : (
              <>
                {/* STEP 1: DATASET SELECTOR */}
                {currentStep === 1 && (
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: textTitle, marginBottom: 6 }}>1. Select Allowed Dataset</Text>
                    <Text style={{ fontSize: 12, color: textSub, marginBottom: 14 }}>
                      Only datasets registered and permitted for the <Text style={{ fontWeight: '600' }}>{sectionContext}</Text> section are shown.
                    </Text>
                    <View style={{ gap: 8 }}>
                      {catalog?.datasets.map((ds) => {
                        const selected = selectedDataset === ds.code;
                        return (
                          <TouchableOpacity
                            key={ds.code}
                            onPress={() => handleDatasetChange(ds.code)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: 14,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: selected ? '#FF6900' : borderColor,
                              backgroundColor: selected ? (isDark ? '#2D1B00' : '#FFF7ED') : inputBg,
                            }}
                          >
                            <View style={{ flex: 1, paddingRight: 10 }}>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: selected ? '#FF6900' : textTitle }}>
                                {ds.label}
                              </Text>
                              <Text style={{ fontSize: 11, color: textSub, marginTop: 2 }}>{ds.description}</Text>
                              <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>Grain: {ds.grain}</Text>
                            </View>
                            {selected && <Ionicons name="checkmark-circle" size={20} color="#FF6900" />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Presets shortcut */}
                    {catalog && catalog.presets.length > 0 && (
                      <View style={{ marginTop: 20 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: textTitle, marginBottom: 8 }}>Or pick a Starter Preset:</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {catalog.presets.map((p) => (
                            <TouchableOpacity
                              key={p.code}
                              onPress={() => {
                                setReportTitle(p.title);
                                setSelectedDataset(p.querySpec.dataset || 'students');
                                if (p.querySpec.columns) setSelectedColumns(p.querySpec.columns);
                                if (p.querySpec.filters) setFilters(p.querySpec.filters);
                                if (p.querySpec.logicModifier === 'only_transport') setIsTransportOnly(true);
                                setCurrentStep(2);
                              }}
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 8,
                                backgroundColor: isDark ? '#21262D' : '#F3F4F6',
                                borderWidth: 1,
                                borderColor,
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#FF6900' }}>⚡ {p.title}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* STEP 2: FILTERS & AMBIGUITY RESOLVERS */}
                {currentStep === 2 && (
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: textTitle, marginBottom: 6 }}>2. Add Filters</Text>
                    <Text style={{ fontSize: 12, color: textSub, marginBottom: 14 }}>
                      Specify conditions. Hidden or sensitive fields are excluded server-side to prevent indirect data leaks.
                    </Text>

                    {/* Active Filter Chips */}
                    {filters.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                        {filters.map((f, idx) => (
                          <View
                            key={idx}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: isDark ? '#21262D' : '#EFF6FF',
                              borderWidth: 1,
                              borderColor: isDark ? '#3B82F6' : '#BFDBFE',
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 16,
                            }}
                          >
                            <Text style={{ fontSize: 11, color: isDark ? '#93C5FD' : '#1D4ED8', marginRight: 6 }}>
                              {f.field} {f.operator} '{f.value}'
                            </Text>
                            <TouchableOpacity onPress={() => handleRemoveFilter(idx)}>
                              <Ionicons name="close-circle" size={16} color={isDark ? '#93C5FD' : '#1D4ED8'} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Filter Builder Input Row */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                      {/* Field selection */}
                      <View style={{ flex: 2 }}>
                        <Text style={{ fontSize: 11, color: textSub, marginBottom: 4 }}>Field</Text>
                        <ScrollView horizontal style={{ maxHeight: 40 }}>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {datasetFields.filter((f) => f.isFilterable).map((f) => (
                              <TouchableOpacity
                                key={f.fieldName}
                                onPress={() => setFilterField(f.fieldName)}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 6,
                                  backgroundColor: filterField === f.fieldName ? '#FF6900' : inputBg,
                                  borderWidth: 1,
                                  borderColor,
                                }}
                              >
                                <Text style={{ fontSize: 11, color: filterField === f.fieldName ? '#FFF' : textTitle }}>
                                  {f.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>
                      </View>

                      {/* Operator selection */}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: textSub, marginBottom: 4 }}>Operator</Text>
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          {['eq', 'contains', 'gt', 'lt'].map((op) => (
                            <TouchableOpacity
                              key={op}
                              onPress={() => setFilterOp(op)}
                              style={{
                                paddingHorizontal: 6,
                                paddingVertical: 6,
                                borderRadius: 6,
                                backgroundColor: filterOp === op ? '#FF6900' : inputBg,
                                borderWidth: 1,
                                borderColor,
                              }}
                            >
                              <Text style={{ fontSize: 11, color: filterOp === op ? '#FFF' : textTitle }}>{op}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Value Input */}
                      <View style={{ flex: 2 }}>
                        <Text style={{ fontSize: 11, color: textSub, marginBottom: 4 }}>Value</Text>
                        <TextInput
                          value={filterVal}
                          onChangeText={setFilterVal}
                          placeholder="e.g. active, 75, transport"
                          placeholderTextColor="#9CA3AF"
                          style={{
                            height: 36,
                            backgroundColor: inputBg,
                            borderWidth: 1,
                            borderColor,
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            fontSize: 12,
                            color: textTitle,
                          }}
                        />
                      </View>

                      <TouchableOpacity
                        onPress={handleAddFilter}
                        style={{
                          alignSelf: 'flex-end',
                          height: 36,
                          paddingHorizontal: 12,
                          backgroundColor: '#FF6900',
                          borderRadius: 6,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 12 }}>+ Add</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Ambiguity Resolution Cards (Per Ground Rules Section 5.2) */}
                    <View style={{ backgroundColor: inputBg, padding: 14, borderRadius: 10, borderWidth: 1, borderColor, gap: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: textTitle }}>Plain-Language Ambiguity Clarification</Text>
                      
                      {/* Transport only toggle */}
                      {selectedDataset === 'fees_ledger' && (
                        <TouchableOpacity
                          onPress={() => setIsTransportOnly(!isTransportOnly)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                        >
                          <Ionicons name={isTransportOnly ? 'checkbox' : 'square-outline'} size={18} color="#FF6900" />
                          <Text style={{ fontSize: 12, color: textTitle }}>
                            Enforce "Transport Only" logic (student paid for transport and has NO payment for other items)
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Grade Meaning */}
                      {selectedDataset === 'results' && (
                        <View>
                          <Text style={{ fontSize: 11, color: textSub, marginBottom: 4 }}>"Grade" Interpretation:</Text>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              onPress={() => setGradeMeaning('score_grade')}
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 4,
                                backgroundColor: gradeMeaning === 'score_grade' ? '#FF6900' : 'transparent',
                              }}
                            >
                              <Text style={{ fontSize: 11, color: gradeMeaning === 'score_grade' ? '#FFF' : textSub }}>
                                Performance Level (e.g. EE, ME)
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setGradeMeaning('class_level')}
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 4,
                                backgroundColor: gradeMeaning === 'class_level' ? '#FF6900' : 'transparent',
                              }}
                            >
                              <Text style={{ fontSize: 11, color: gradeMeaning === 'class_level' ? '#FFF' : textSub }}>
                                Classroom Grade (e.g. Grade 7)
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* STEP 3: PERIOD SELECTOR */}
                {currentStep === 3 && (
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: textTitle, marginBottom: 6 }}>3. Period Selection & Snapshot</Text>
                    <Text style={{ fontSize: 12, color: textSub, marginBottom: 14 }}>
                      Choose academic periods. Multi-year combining (e.g. 2013 and 2016) and historical as-of queries are supported.
                    </Text>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                      {[
                        { id: 'active', label: 'Active Year (Current)' },
                        { id: 'single', label: 'Single Specific Year' },
                        { id: 'multi', label: 'Multiple Years (e.g. 2013 + 2016)' },
                        { id: 'range', label: 'Year Range (e.g. 2011 to 2020)' },
                        { id: 'all', label: 'All Retained History' },
                      ].map((p) => {
                        const sel = periodType === p.id;
                        return (
                          <TouchableOpacity
                            key={p.id}
                            onPress={() => setPeriodType(p.id as any)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 8,
                              backgroundColor: sel ? '#FF6900' : inputBg,
                              borderWidth: 1,
                              borderColor: sel ? '#FF6900' : borderColor,
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '600', color: sel ? '#FFF' : textTitle }}>{p.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {periodType === 'single' && (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 11, color: textSub, marginBottom: 4 }}>Academic Year</Text>
                        <TextInput
                          value={singleYear}
                          onChangeText={setSingleYear}
                          placeholder="2025"
                          placeholderTextColor="#9CA3AF"
                          style={{
                            height: 38,
                            backgroundColor: inputBg,
                            borderWidth: 1,
                            borderColor,
                            borderRadius: 6,
                            paddingHorizontal: 10,
                            color: textTitle,
                          }}
                        />
                      </View>
                    )}

                    {periodType === 'multi' && (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 11, color: textSub, marginBottom: 4 }}>Comma-separated Years (e.g. 2013, 2016)</Text>
                        <TextInput
                          value={multiYears}
                          onChangeText={setMultiYears}
                          placeholder="2013, 2016"
                          placeholderTextColor="#9CA3AF"
                          style={{
                            height: 38,
                            backgroundColor: inputBg,
                            borderWidth: 1,
                            borderColor,
                            borderRadius: 6,
                            paddingHorizontal: 10,
                            color: textTitle,
                          }}
                        />
                      </View>
                    )}

                    {periodType === 'range' && (
                      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: textSub, marginBottom: 4 }}>From Year</Text>
                          <TextInput
                            value={rangeStart}
                            onChangeText={setRangeStart}
                            placeholder="2020"
                            placeholderTextColor="#9CA3AF"
                            style={{
                              height: 38,
                              backgroundColor: inputBg,
                              borderWidth: 1,
                              borderColor,
                              borderRadius: 6,
                              paddingHorizontal: 10,
                              color: textTitle,
                            }}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: textSub, marginBottom: 4 }}>To Year</Text>
                          <TextInput
                            value={rangeEnd}
                            onChangeText={setRangeEnd}
                            placeholder="2025"
                            placeholderTextColor="#9CA3AF"
                            style={{
                              height: 38,
                              backgroundColor: inputBg,
                              borderWidth: 1,
                              borderColor,
                              borderRadius: 6,
                              paddingHorizontal: 10,
                              color: textTitle,
                            }}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* STEP 4: COLUMNS & SORTING */}
                {currentStep === 4 && (
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: textTitle, marginBottom: 6 }}>4. Columns & Ordering</Text>
                    <Text style={{ fontSize: 12, color: textSub, marginBottom: 14 }}>
                      Select which fields appear as columns in preview and compiled PDF.
                    </Text>

                    <Text style={{ fontSize: 12, fontWeight: '600', color: textTitle, marginBottom: 8 }}>Included Columns (click to toggle):</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                      {datasetFields.filter((f) => f.isSelectable).map((f) => {
                        const sel = selectedColumns.includes(f.fieldName);
                        return (
                          <TouchableOpacity
                            key={f.fieldName}
                            onPress={() => toggleColumn(f.fieldName)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 6,
                              backgroundColor: sel ? (isDark ? '#2D1B00' : '#FFF7ED') : inputBg,
                              borderWidth: 1,
                              borderColor: sel ? '#FF6900' : borderColor,
                            }}
                          >
                            <Ionicons name={sel ? 'checkbox' : 'square-outline'} size={16} color={sel ? '#FF6900' : textSub} />
                            <Text style={{ fontSize: 12, color: sel ? '#FF6900' : textTitle }}>{f.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={{ fontSize: 12, fontWeight: '600', color: textTitle, marginBottom: 8 }}>Sort By:</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <ScrollView horizontal style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {datasetFields.filter((f) => f.isSortable).map((f) => (
                            <TouchableOpacity
                              key={f.fieldName}
                              onPress={() => setSortField(f.fieldName)}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 6,
                                backgroundColor: sortField === f.fieldName ? '#FF6900' : inputBg,
                                borderWidth: 1,
                                borderColor,
                              }}
                            >
                              <Text style={{ fontSize: 11, color: sortField === f.fieldName ? '#FFF' : textTitle }}>
                                {f.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                      <TouchableOpacity
                        onPress={() => setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC')}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 6,
                          backgroundColor: inputBg,
                          borderWidth: 1,
                          borderColor,
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF6900' }}>{sortDir}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* STEP 5: PREVIEW & EXPORT */}
                {currentStep === 5 && (
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: textTitle, marginBottom: 6 }}>5. Live Preview & Verification</Text>
                    {previewData ? (
                      <View>
                        {/* Control Totals Card */}
                        <View style={{ backgroundColor: inputBg, padding: 12, borderRadius: 8, borderWidth: 1, borderColor, marginBottom: 14 }}>
                          <Text style={{ fontSize: 12, color: textSub }}>
                            Total Records: <Text style={{ fontWeight: '700', color: '#FF6900' }}>{previewData.totalCount}</Text> | Sample Size: <Text style={{ fontWeight: '600', color: textTitle }}>{previewData.rows.length}</Text>
                          </Text>
                          <Text style={{ fontSize: 11, color: textSub, marginTop: 4 }}>
                            Snapshot: {new Date(previewData.snapshotTimestamp).toLocaleString()}
                          </Text>
                          <Text style={{ fontSize: 11, color: textSub, marginTop: 2, fontStyle: 'italic' }}>
                            Criteria: {previewData.filterSummary}
                          </Text>
                        </View>

                        {/* Sample Rows Table */}
                        <ScrollView horizontal style={{ marginBottom: 14 }}>
                          <View>
                            <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#21262D' : '#F3F4F6', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: borderColor }}>
                              {previewData.columns.map((col) => (
                                <Text key={col} style={{ width: 140, fontWeight: '700', fontSize: 11, color: textTitle }}>
                                  {col.toUpperCase()}
                                </Text>
                              ))}
                            </View>
                            {previewData.rows.length > 0 ? (
                              previewData.rows.map((row, rIdx) => (
                                <View key={rIdx} style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: borderColor }}>
                                  {previewData.columns.map((col) => (
                                    <Text key={col} style={{ width: 140, fontSize: 11, color: textTitle }} numberOfLines={1}>
                                      {row[col] !== undefined && row[col] !== null ? String(row[col]) : '—'}
                                    </Text>
                                  ))}
                                </View>
                              ))
                            ) : (
                              <View style={{ padding: 20 }}>
                                <Text style={{ color: textSub, fontSize: 12 }}>No records found matching criteria in this institution.</Text>
                              </View>
                            )}
                          </View>
                        </ScrollView>
                      </View>
                    ) : (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Text style={{ color: textSub, fontSize: 12 }}>Click 'Run Preview' below to execute the live count and snapshot query.</Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer Controls */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderTopColor: borderColor, backgroundColor: inputBg }}>
            {currentStep > 1 ? (
              <TouchableOpacity
                onPress={() => setCurrentStep(currentStep - 1)}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: textTitle }}>Back</Text>
              </TouchableOpacity>
            ) : <View />}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {currentStep < 5 ? (
                <>
                  <TouchableOpacity
                    onPress={() => setCurrentStep(currentStep + 1)}
                    style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FF6900' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFF' }}>Next Step</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleRunPreview}
                    disabled={loadingPreview}
                    style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#10B981' }}
                  >
                    {loadingPreview ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFF' }}>⚡ Quick Preview</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={handleRunPreview}
                    disabled={loadingPreview}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: textTitle }}>Re-run Count</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleExportPdf}
                    disabled={compilingPdf}
                    style={{ paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FF6900' }}
                  >
                    {compilingPdf ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFF' }}>📄 Export Vector PDF</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Standard In-App PDF Preview Modal */}
      <PdfPreviewModal
        visible={pdfModalVisible}
        onClose={() => setPdfModalVisible(false)}
        documentType="custom_report_summary"
        title={pdfTitle}
        fileName="report_summary.pdf"
        data={{ pdfBase64: pdfBase64 || '' }}
      />
    </Modal>
  );
};
