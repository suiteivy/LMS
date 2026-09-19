import { api } from './api';
import { PdfService } from './PdfService';

export interface FeeInvoiceItem {
  fee_component_name: string;
  original_amount: number;
  discount_amount: number;
  net_amount: number;
  due_date?: string | null;
}

export interface StudentFeeInvoice {
  id: string;
  institution_id: string;
  student_id: string;
  academic_year_id?: string | null;
  term_id?: string | null;
  fee_structure_id?: string | null;
  invoice_number: string;
  issue_date: string;
  due_date?: string | null;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
  paid_amount: number;
  balance_due: number;
  status: 'issued' | 'unpaid' | 'partial' | 'paid' | 'cleared' | 'void';
  itemized_breakdown?: FeeInvoiceItem[];
  notes?: string;
  created_at?: string;
  fee_structures?: {
    id: string;
    title: string;
    due_date?: string;
  };
}

export interface PaymentReceiptMetadata {
  id: string;
  receipt_number: string;
  payment_date: string;
  payment_method: string;
  amount: number;
  status: string;
  reference_number?: string;
  admin_notes?: string;
}

export const InvoiceReceiptService = {
  /**
   * Fetch all invoices for a given student (scoped access).
   */
  async getStudentInvoices(studentId: string): Promise<StudentFeeInvoice[]> {
    const res = await api.get(`/finance/invoices/${studentId}`);
    return res.data || [];
  },

  /**
   * Request base64 vector PDF for invoice preview modal.
   */
  async previewInvoicePdf(invoiceId: string): Promise<{ base64: string; filename: string }> {
    const res = await api.post(`/finance/invoices/item/${invoiceId}/compile-base64`);
    return {
      base64: res.data.base64,
      filename: res.data.filename,
    };
  },

  /**
   * Request base64 vector PDF for payment receipt preview modal.
   */
  async previewPaymentReceiptPdf(paymentId: string): Promise<{ base64: string; filename: string }> {
    const res = await api.post(`/finance/fees/${paymentId}/receipt-base64`);
    return {
      base64: res.data.base64,
      filename: res.data.filename,
    };
  },

  /**
   * Download or share fee invoice vector PDF.
   */
  async downloadInvoicePdf(invoiceId: string, invoiceNumber?: string): Promise<void> {
    const preview = await this.previewInvoicePdf(invoiceId);
    await PdfService.downloadCompiledPdf({
      documentType: 'fee_invoice',
      data: {},
      title: `Fee Invoice ${invoiceNumber || ''}`.trim(),
      fileName: preview.filename,
      pdfBase64: preview.base64,
    });
  },

  /**
   * Download or share payment receipt vector PDF.
   */
  async downloadPaymentReceiptPdf(paymentId: string, receiptNumber?: string): Promise<void> {
    const preview = await this.previewPaymentReceiptPdf(paymentId);
    await PdfService.downloadCompiledPdf({
      documentType: 'payment_receipt',
      data: {},
      title: `Payment Receipt ${receiptNumber || ''}`.trim(),
      fileName: preview.filename,
      pdfBase64: preview.base64,
    });
  },
};
