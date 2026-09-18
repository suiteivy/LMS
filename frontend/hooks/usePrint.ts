import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { PdfService, PdfDocumentPayload } from '@/services/PdfService';

export function usePrint() {
  const [previewPayload, setPreviewPayload] = useState<PdfDocumentPayload | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const printAsync = async ({ uri }: { uri: string }) => {
    if (Platform.OS === 'web') {
      const printWindow = window.open(uri, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } else {
      await Print.printAsync({ uri });
    }
  };

  const printHtml = async (html: string, options?: { title?: string; fileName?: string }) => {
    if (Platform.OS === 'web') {
      // Trigger Web Preview modal instead of screen dump
      setPreviewPayload({
        documentType: 'generic',
        data: {},
        title: options?.title || 'Document',
        fileName: options?.fileName,
        html,
      });
      setPreviewVisible(true);
    } else {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: options?.title || 'Print Document',
        });
      } else {
        await Print.printAsync({ uri });
      }
    }
  };

  const previewDocument = useCallback((payload: PdfDocumentPayload) => {
    if (Platform.OS === 'web') {
      setPreviewPayload(payload);
      setPreviewVisible(true);
    } else {
      PdfService.downloadCompiledPdf(payload).catch((err) => {
        console.error('Failed to download PDF on mobile:', err);
      });
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewVisible(false);
    setPreviewPayload(null);
  }, []);

  return {
    printAsync,
    printHtml,
    previewDocument,
    previewPayload,
    previewVisible,
    closePreview,
  };
}
