import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { PdfService, PdfDocumentPayload } from '@/services/PdfService';

export interface PdfPreviewModalProps {
  visible: boolean;
  payload?: PdfDocumentPayload | null;
  onClose: () => void;
  documentType?: string;
  entityId?: string;
  pdfEndpoint?: string;
  title?: string;
  fileName?: string;
  data?: any;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  visible,
  payload,
  onClose,
  documentType,
  entityId,
  pdfEndpoint,
  title,
  fileName,
  data,
}) => {
  const { isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const [downloading, setDownloading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  const effectivePayload: PdfDocumentPayload | null = payload || (documentType ? {
    documentType: (documentType as any) || 'generic',
    data: data || { id: entityId },
    title: title || 'PDF Document',
    fileName: fileName || `${documentType}.pdf`,
    html: (payload as any)?.html || (data as any)?.html,
  } : null);

  if (!visible || !effectivePayload) return null;

  // On native mobile, bypass modal and immediately trigger native download/share
  if (Platform.OS !== 'web') {
    PdfService.downloadCompiledPdf(effectivePayload)
      .catch((err) => console.error('Mobile PDF download error:', err))
      .finally(onClose);
    return null;
  }

  const bg = isDark ? '#161B22' : '#FFFFFF';
  const headerBg = isDark ? '#0D1117' : '#F6F8FA';
  const border = isDark ? '#21262D' : '#D0D7DE';
  const textPrimary = isDark ? '#FFFFFF' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await PdfService.downloadCompiledPdf(effectivePayload);
    } catch (error) {
      console.error('Failed to download compiled PDF:', error);
      alert('Failed to compile and download PDF document. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (effectivePayload.html) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(effectivePayload.html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 300);
      }
    } else {
      handleDownload();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
          zIndex: 99999,
        }}
      >
        <View
          style={{
            width: Math.min(width * 0.95, 1000),
            height: Math.min(height * 0.92, 860),
            backgroundColor: bg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: border,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 14,
              backgroundColor: headerBg,
              borderBottomWidth: 1,
              borderBottomColor: border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="document-text" size={20} color="#FF6900" />
                <Text
                  style={{
                    color: textPrimary,
                    fontSize: 16,
                    fontWeight: '800',
                  }}
                  numberOfLines={1}
                >
                  {effectivePayload.title} — Document Preview
                </Text>
              </View>
              <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
                Official compiled document · Review layout and content before downloading
              </Text>
            </View>

            {/* Zoom Controls */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 16 }}>
              <TouchableOpacity
                onPress={() => setZoomLevel((z) => Math.max(z - 15, 60))}
                style={{
                  padding: 6,
                  borderRadius: 6,
                  backgroundColor: isDark ? '#21262D' : '#E5E7EB',
                }}
                accessibilityLabel="Zoom Out"
              >
                <Ionicons name="remove" size={16} color={textPrimary} />
              </TouchableOpacity>
              <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700', width: 44, textAlign: 'center' }}>
                {zoomLevel}%
              </Text>
              <TouchableOpacity
                onPress={() => setZoomLevel((z) => Math.min(z + 15, 150))}
                style={{
                  padding: 6,
                  borderRadius: 6,
                  backgroundColor: isDark ? '#21262D' : '#E5E7EB',
                }}
                accessibilityLabel="Zoom In"
              >
                <Ionicons name="add" size={16} color={textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Close Button */}
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Ionicons name="close" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Document Preview Pane */}
          <View
            style={{
              flex: 1,
              backgroundColor: isDark ? '#0F141C' : '#EAEEF2',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
              padding: 12,
            }}
          >
            {effectivePayload.html ? (
              <iframe
                srcDoc={effectivePayload.html}
                style={{
                  width: `${zoomLevel}%`,
                  height: '100%',
                  maxWidth: 820 * (zoomLevel / 100),
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  transition: 'width 0.15s ease, max-width 0.15s ease',
                }}
                title="PDF Preview"
              />
            ) : (
              <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <Ionicons name="document-text-outline" size={64} color={textSecondary} />
                <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 16, marginTop: 12 }}>
                  {effectivePayload.title}
                </Text>
                <Text style={{ color: textSecondary, fontSize: 12, marginTop: 4 }}>
                  Ready to compile high-fidelity vector PDF.
                </Text>
              </View>
            )}
          </View>

          {/* Footer Actions */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 14,
              backgroundColor: headerBg,
              borderTopWidth: 1,
              borderTopColor: border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: border,
              }}
            >
              <Text style={{ color: textSecondary, fontSize: 13, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={handlePrint}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: border,
                  backgroundColor: isDark ? '#21262D' : '#F6F8FA',
                }}
              >
                <Ionicons name="print-outline" size={16} color={textPrimary} />
                <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '700' }}>Print</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDownload}
                disabled={downloading}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: '#FF6900',
                  opacity: downloading ? 0.7 : 1,
                }}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                      Download PDF
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
