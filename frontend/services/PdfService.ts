import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { api } from '@/services/api';

export interface PdfDocumentPayload {
  documentType: 'clearance_confirmation' | 'violation_summary' | 'institutional_summary' | 'report_card' | 'timetable' | 'receipt' | 'fee_invoice' | 'payment_receipt' | 'academic_transcript' | 'generic';
  data: Record<string, any>;
  title: string;
  fileName?: string;
  html?: string;
  pdfBase64?: string;
}

export const PdfService = {
  /**
   * Request genuine vector PDF binary from backend compilation service.
   */
  async compileVectorPdf(documentType: string, data: Record<string, any>): Promise<Blob> {
    const response = await api.post(
      '/pdf/compile',
      { document_type: documentType, data },
      { responseType: 'blob' }
    );
    return response.data;
  },

  /**
   * Request base64-encoded PDF from backend compilation service.
   */
  async compileVectorPdfBase64(documentType: string, data: Record<string, any>): Promise<string> {
    const response = await api.post('/pdf/compile-base64', { document_type: documentType, data });
    return response.data?.data?.base64;
  },

  /**
   * Trigger direct browser download of a compiled PDF Blob.
   */
  downloadBlob(blob: Blob, fileName: string): void {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    }
  },

  /**
   * Universal download method: compiles genuine PDF on web, or uses native sharing on mobile.
   */
  async downloadCompiledPdf(payload: PdfDocumentPayload): Promise<void> {
    const rawName = payload.fileName || `${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}`;
    const fileName = rawName.endsWith('.pdf') ? rawName : `${rawName}.pdf`;

    if (Platform.OS === 'web') {
      try {
        if (payload.pdfBase64) {
          const byteCharacters = atob(payload.pdfBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          this.downloadBlob(blob, fileName);
          return;
        }

        // Try backend compilation first for high-fidelity vector PDF
        const blob = await this.compileVectorPdf(payload.documentType, payload.data);
        this.downloadBlob(blob, fileName);
        return;
      } catch (err) {
        console.warn('Backend vector PDF compilation failed, using HTML fallback:', err);
        if (payload.html) {
          // If HTML available, print or export
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(payload.html);
            printWindow.document.close();
            setTimeout(() => {
              printWindow.focus();
              printWindow.print();
            }, 300);
          }
          return;
        }
        throw err;
      }
    }

    // Native Mobile (iOS / Android)
    if (payload.html) {
      const { uri } = await Print.printToFileAsync({ html: payload.html });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        let shareUri = uri;
        try {
          const sourceFile = new File(uri);
          const targetFile = new File(Paths.cache, fileName);
          if (targetFile.exists) {
            targetFile.delete();
          }
          await sourceFile.copy(targetFile);
          shareUri = targetFile.uri;
        } catch (renameErr) {
          console.warn('Unable to rename PDF file before sharing:', renameErr);
        }

        await Sharing.shareAsync(shareUri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Download ${payload.title}`,
        });
      } else {
        await Print.printAsync({ uri });
      }
    } else {
      // Use existing base64 if available, or fetch from backend and share
      const b64 = payload.pdfBase64 || await this.compileVectorPdfBase64(payload.documentType, payload.data);
      const tempPath = `${Paths.cache.uri}/${fileName}`;
      const file = new File(tempPath);
      await file.write(b64);
      await Sharing.shareAsync(file.uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Download ${payload.title}`,
      });
    }
  },
};
