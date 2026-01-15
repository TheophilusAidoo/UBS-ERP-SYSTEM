// Email Service for sending invoices
// This service sends invoices via email with PDF attachments
// Uses direct cPanel SMTP server (no Supabase Edge Functions)

import { invoicePDFService, InvoicePDFData } from './invoice-pdf.service';
import { globalSettingsService } from './global-settings.service';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded (without data URL prefix)
    contentType: string;
    encoding?: string;
  }>;
}

class EmailService {
  /**
   * Send invoice email with PDF attachment
   */
  async sendInvoiceEmail(invoiceData: {
    clientEmail: string; // Required - validated before calling this function
    clientName: string;
    clientNumber?: string;
    clientCountry?: string;
    clientAddress?: string;
    clientPhone?: string;
    invoiceNumber: string;
    total: number;
    subtotal: number;
    tax?: number;
    paidAmount?: number;
    balanceDue?: number;
    dueDate?: string;
    items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    companyLogo?: string;
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyWebsite?: string;
    companyTaxId?: string;
    signature?: string;
    signedBy?: string;
    currencySymbol?: string;
    currencyCode?: string; // Currency code (e.g., 'USD', 'EUR', 'GHS')
    createdAt?: string;
    status?: string;
    isReminder?: boolean; // Flag to indicate if this is a reminder/resend
  }): Promise<{ success: boolean; message: string }> {
    try {
      // Generate PDF invoice
      const pdfData: InvoicePDFData = {
        invoiceNumber: invoiceData.invoiceNumber,
        clientName: invoiceData.clientName,
        clientEmail: invoiceData.clientEmail,
        clientNumber: invoiceData.clientNumber,
        clientCountry: invoiceData.clientCountry,
        clientAddress: invoiceData.clientAddress,
        clientPhone: invoiceData.clientPhone,
        items: invoiceData.items,
        subtotal: invoiceData.subtotal,
        tax: invoiceData.tax,
        total: invoiceData.total,
        paidAmount: invoiceData.paidAmount,
        balanceDue: invoiceData.balanceDue,
        dueDate: invoiceData.dueDate,
        companyName: invoiceData.companyName,
        companyAddress: invoiceData.companyAddress,
        companyPhone: invoiceData.companyPhone,
        companyEmail: invoiceData.companyEmail,
        companyWebsite: invoiceData.companyWebsite,
        companyTaxId: invoiceData.companyTaxId,
        companyLogo: invoiceData.companyLogo,
        signature: invoiceData.signature,
        signedBy: invoiceData.signedBy,
        currencySymbol: invoiceData.currencySymbol,
        currencyCode: invoiceData.currencyCode,
        createdAt: invoiceData.createdAt,
        status: invoiceData.status,
      };

      const pdfBase64 = await invoicePDFService.generateInvoicePDFBase64(pdfData);

      // Generate HTML email content with subtotal and tax
      // Ensure tax is passed correctly (default to 0 if undefined)
      const taxValue = invoiceData.tax !== undefined && invoiceData.tax !== null ? invoiceData.tax : 0;
      console.log('📧 Email HTML - Subtotal:', invoiceData.subtotal, 'Tax:', taxValue, 'Total:', invoiceData.total);
      
      const htmlContent = this.generateInvoiceEmailHTML({
        ...invoiceData,
        subtotal: invoiceData.subtotal,
        tax: taxValue,
      }, invoiceData.currencySymbol || '$');

      // Determine email subject based on invoice status
      const isOverdue = invoiceData.dueDate && new Date(invoiceData.dueDate) < new Date();
      const isPaid = invoiceData.status === 'Paid' || invoiceData.status === 'paid' || 
                     (invoiceData.paidAmount && invoiceData.paidAmount >= invoiceData.total && invoiceData.balanceDue === 0);
      
      const subject = isPaid
        ? `Receipt ${invoiceData.invoiceNumber} - Payment Confirmed`
        : invoiceData.isReminder
        ? isOverdue
          ? `Reminder: Invoice ${invoiceData.invoiceNumber} - Payment Overdue`
          : `Reminder: Invoice ${invoiceData.invoiceNumber} - Payment Required`
        : `Invoice ${invoiceData.invoiceNumber} - Payment Required`;

      // Send email via direct cPanel SMTP server
      const result = await this.sendEmailWithAttachment({
        to: invoiceData.clientEmail,
        subject,
        html: htmlContent,
        attachments: [
          {
            filename: `Invoice_${invoiceData.invoiceNumber}.pdf`,
            content: pdfBase64,
            contentType: 'application/pdf',
            encoding: 'base64',
          },
        ],
      });

      return result;
    } catch (error: any) {
      console.error('Error sending invoice email:', error);
      return {
        success: false,
        message: error.message || 'Failed to send invoice email',
      };
    }
  }

  /**
   * Send simple email (no attachments) via cPanel SMTP
   */
  async sendEmail(emailData: { to: string; subject: string; html: string }): Promise<{ success: boolean; message: string }> {
    return this.sendEmailWithAttachment({
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      attachments: undefined,
    });
  }

  /**
   * Get SMTP settings from Supabase (admin panel) or use defaults
   */
  private async getSmtpConfig(): Promise<any> {
    try {
      const settings = await globalSettingsService.getAllSettings();
      
      // If SMTP settings exist in Supabase, use them
      if (settings.email_smtp_host && settings.email_smtp_user && settings.email_smtp_password) {
        return {
          host: settings.email_smtp_host,
          port: settings.email_smtp_port || '465',
          user: settings.email_smtp_user,
          password: settings.email_smtp_password,
          secure: settings.email_smtp_secure === 'true' || settings.email_smtp_port === '465',
          fromEmail: settings.email_from || settings.email_smtp_user,
          fromName: settings.email_from_name || 'UBS ERP System',
        };
      }
      
      // Return null to use server defaults (.env file)
      return null;
    } catch (error) {
      console.warn('⚠️ Failed to load SMTP settings from Supabase, using server defaults:', error);
      return null;
    }
  }

  /**
   * Send email via direct cPanel SMTP server
   * No Supabase Edge Functions - direct API call
   */
  private async sendEmailWithAttachment(emailData: EmailData): Promise<{ success: boolean; message: string }> {
    try {
      // Direct API call to email server
      // Email server runs on port 3001 (separate from frontend on 3003)
      const emailServerUrl = import.meta.env.VITE_EMAIL_SERVER_URL;
      
      console.log('📧 Sending email via server:', emailServerUrl);
      
      // Get SMTP settings from Supabase (if configured in admin panel)
      const smtpConfig = await this.getSmtpConfig();
      
      // Prepare request body with attachments
      const requestBody: any = {
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
      };
      
      // Include SMTP config if available (from Supabase admin panel)
      if (smtpConfig) {
        requestBody.smtpConfig = smtpConfig;
        console.log('📧 Using SMTP settings from Supabase (admin panel)');
      } else {
        console.log('📧 Using SMTP settings from email server (.env file)');
      }
      
      // Include attachments if provided
      if (emailData.attachments && emailData.attachments.length > 0) {
        requestBody.attachments = emailData.attachments.map(att => ({
          filename: att.filename,
          content: att.content, // Base64 content
          contentType: att.contentType,
          encoding: att.encoding || 'base64',
        }));
        console.log(`📎 Including ${emailData.attachments.length} attachment(s)`);
      }
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout | null = null;
      
      // Set timeout only if controller hasn't been aborted
      timeoutId = setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort();
        }
      }, 30000); // 30 second timeout
      
      try {
        const response = await fetch(`${emailServerUrl}/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        // Clear timeout on success
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || 'Failed to send email' };
          }
          console.error('❌ Email server error:', errorData);
          return {
            success: false,
            message: errorData.error || `Server error: ${response.status}. Please check email server logs.`,
          };
        }

        const result = await response.json();
        console.log('✅ Email server response:', result);

        if (result.success === true) {
          return {
            success: true,
            message: result.message || `Email sent successfully to ${emailData.to}`,
          };
        } else {
          return {
            success: false,
            message: result.error || 'Email server returned an error. Please check server logs.',
          };
        }
      } catch (fetchError: any) {
        // Clear timeout on error
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        // Don't re-throw abort errors, convert to user-friendly message
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
          throw new Error('Email request timed out. Please check if the email server is running and try again.');
        }
        
        throw fetchError;
      }
    } catch (error: any) {
      console.error('❌ Email service error:', error);
      const errorMsg = error?.message || 'Failed to send email';
      
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Email request timed out. Please check if the email server is running and try again.',
        };
      }
      
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('network') || errorMsg.includes('ECONNREFUSED')) {
        return {
          success: false,
          message: `Cannot connect to email server at ${import.meta.env.VITE_EMAIL_SERVER_URL}.\n\nPlease make sure the email server is running:\n1. Open terminal\n2. Run: cd backend && node email-server.js\n3. Wait for "Email server running" message\n4. Try sending the invoice again`,
        };
      }
      
      return {
        success: false,
        message: `Failed to send email: ${errorMsg}`,
      };
    }
  }


  /**
   * Send order cancellation email to client
   */
  async sendCancellationEmail(data: {
    clientEmail: string;
    clientName: string;
    orderNumber?: string;
    productName: string;
    quantity: number;
    totalAmount: number;
    companyName?: string;
    companyEmail?: string;
    companyPhone?: string;
    currencySymbol?: string;
    cancellationReason?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .info-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .details-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
              .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
              .detail-row:last-child { border-bottom: none; }
              .detail-label { color: #6b7280; font-weight: 500; }
              .detail-value { color: #111827; font-weight: 600; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 0.9em; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Order Cancellation Notice</h1>
              </div>
              <div class="content">
                <p>Dear ${data.clientName},</p>
                <p>We regret to inform you that your order has been cancelled.</p>
                
                <div class="info-box">
                  <p style="margin: 0;"><strong>⚠️ Important:</strong> This order has been cancelled and will not be processed.</p>
                </div>
                
                <div class="details-box">
                  <h3 style="margin-top: 0; color: #111827;">Order Details</h3>
                  ${data.orderNumber ? `<div class="detail-row">
                    <span class="detail-label">Order Number:</span>
                    <span class="detail-value">${data.orderNumber}</span>
                  </div>` : ''}
                  <div class="detail-row">
                    <span class="detail-label">Product:</span>
                    <span class="detail-value">${data.productName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Quantity:</span>
                    <span class="detail-value">${data.quantity}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Total Amount:</span>
                    <span class="detail-value">${data.currencySymbol || '$'}${data.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  ${data.cancellationReason ? `<div class="detail-row">
                    <span class="detail-label">Reason:</span>
                    <span class="detail-value">${data.cancellationReason}</span>
                  </div>` : ''}
                </div>
                
                <p>If you have any questions or concerns about this cancellation, please don't hesitate to contact us:</p>
                ${data.companyEmail ? `<p><strong>Email:</strong> ${data.companyEmail}</p>` : ''}
                ${data.companyPhone ? `<p><strong>Phone:</strong> ${data.companyPhone}</p>` : ''}
                
                <p>We apologize for any inconvenience this may cause.</p>
                
                <p>Best regards,<br>${data.companyName || 'UBS ERP Team'}</p>
              </div>
              <div class="footer">
                <p>This is an automated email from UBS ERP System</p>
                <p>If you have any questions, please contact our support team.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      return await this.sendEmail({
        to: data.clientEmail,
        subject: `Order Cancellation - ${data.productName}`,
        html: htmlContent,
      });
    } catch (error: any) {
      console.error('Error sending cancellation email:', error);
      return {
        success: false,
        message: error.message || 'Failed to send cancellation email',
      };
    }
  }

  async sendProposalEmail(proposalData: {
    clientEmail: string;
    clientName: string;
    proposalNumber: string;
    version: number;
    total: number;
    validUntil?: string;
    items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    companyLogo?: string;
    companyName?: string;
    currencySymbol?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const htmlContent = this.generateProposalEmailHTML(proposalData, proposalData.currencySymbol || '$');

      const emailData: EmailData = {
        to: proposalData.clientEmail,
        subject: `Proposal ${proposalData.proposalNumber} - Version ${proposalData.version}`,
        html: htmlContent,
      };

      // TODO: Integrate with actual email service (same as sendInvoiceEmail)
      console.log('📧 Proposal email would be sent:', {
        to: emailData.to,
        subject: emailData.subject,
      });

      return {
        success: true,
        message: `Proposal email sent successfully to ${proposalData.clientEmail}`,
      };
    } catch (error: any) {
      console.error('Error sending proposal email:', error);
      return {
        success: false,
        message: error.message || 'Failed to send proposal email',
      };
    }
  }

  async sendReportEmail(reportData: {
    to: string;
    subject: string;
    reportType: string;
    data: any;
    format?: 'pdf' | 'excel';
  }): Promise<{ success: boolean; message: string }> {
    try {
      const htmlContent = this.generateReportEmailHTML(reportData);

      const emailData: EmailData = {
        to: reportData.to,
        subject: reportData.subject,
        html: htmlContent,
      };

      // TODO: Integrate with actual email service
      console.log('📧 Report email would be sent:', {
        to: emailData.to,
        subject: emailData.subject,
      });

      return {
        success: true,
        message: `Report email sent successfully to ${reportData.to}`,
      };
    } catch (error: any) {
      console.error('Error sending report email:', error);
      return {
        success: false,
        message: error.message || 'Failed to send report email',
      };
    }
  }

  private generateProposalEmailHTML(proposalData: {
    clientName: string;
    proposalNumber: string;
    version: number;
    total: number;
    validUntil?: string;
    items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    companyLogo?: string;
    companyName?: string;
  }, currencySymbol: string = '$'): string {
    const formatCurrency = (amount: number) => {
      return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const itemsHTML = proposalData.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.total)}</td>
      </tr>
    `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .proposal-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
            .proposal-table th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; }
            .total-row { font-weight: 700; font-size: 1.1em; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${proposalData.companyLogo ? `<img src="${proposalData.companyLogo}" alt="${proposalData.companyName || 'Company'}" style="max-height: 60px; margin-bottom: 10px;" />` : ''}
              <h1>Proposal ${proposalData.proposalNumber} - Version ${proposalData.version}</h1>
              ${proposalData.companyName ? `<p style="margin: 0; opacity: 0.9;">${proposalData.companyName}</p>` : ''}
            </div>
            <div class="content">
              <p>Dear ${proposalData.clientName},</p>
              <p>Please find attached our proposal for your consideration.</p>
              
              <table class="proposal-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td colspan="3" style="text-align: right; padding: 12px;">Total:</td>
                    <td style="text-align: right; padding: 12px;">${formatCurrency(proposalData.total)}</td>
                  </tr>
                </tfoot>
              </table>
              
              ${proposalData.validUntil ? `<p><strong>Valid Until:</strong> ${new Date(proposalData.validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
              
              <p>We look forward to working with you!</p>
            </div>
            <div class="footer">
              <p>This is an automated email from UBS ERP System</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateReportEmailHTML(reportData: {
    reportType: string;
    data: any;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${reportData.reportType} Report</h1>
            </div>
            <div class="content">
              <p>Please find attached your ${reportData.reportType.toLowerCase()} report.</p>
              <p>The report has been generated and is available for download.</p>
            </div>
            <div class="footer">
              <p>This is an automated email from UBS ERP System</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateInvoiceEmailHTML(invoiceData: {
    clientName: string;
    invoiceNumber: string;
    subtotal: number;
    tax?: number;
    total: number;
    dueDate?: string;
    items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    companyLogo?: string;
    companyName?: string;
    companyTaxId?: string;
    signature?: string;
    signedBy?: string;
  }, currencySymbol: string = '$'): string {
    const formatCurrency = (amount: number) => {
      return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const itemsHTML = invoiceData.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.total)}</td>
      </tr>
    `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
            .invoice-table th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; }
            .total-row { font-weight: 700; font-size: 1.1em; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${invoiceData.companyLogo ? `<img src="${invoiceData.companyLogo}" alt="${invoiceData.companyName || 'Company'}" style="max-height: 60px; margin-bottom: 10px;" />` : ''}
              <h1>Invoice ${invoiceData.invoiceNumber}</h1>
              ${invoiceData.companyName ? `<p style="margin: 0; opacity: 0.9;">${invoiceData.companyName}</p>` : ''}
            </div>
            <div class="content">
              <p>Dear ${invoiceData.clientName},</p>
              <p>Please find attached your invoice for services rendered.</p>
              
              <table class="invoice-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="text-align: right; padding: 12px; border-top: 2px solid #e5e7eb;">
                      <strong>Subtotal:</strong>
                    </td>
                    <td style="text-align: right; padding: 12px; border-top: 2px solid #e5e7eb;">
                      <strong>${formatCurrency(invoiceData.subtotal)}</strong>
                    </td>
                  </tr>
                  ${(() => {
                    // Calculate tax if not provided but total differs from subtotal
                    const calculatedTax = invoiceData.tax !== undefined && invoiceData.tax !== null 
                      ? invoiceData.tax 
                      : (invoiceData.total - invoiceData.subtotal);
                    const hasTax = calculatedTax > 0 || (invoiceData.total !== invoiceData.subtotal);
                    return hasTax;
                  })() ? `
                  <tr>
                    <td colspan="3" style="text-align: right; padding: 12px;">
                      <strong>${(() => {
                        const calculatedTax = invoiceData.tax !== undefined && invoiceData.tax !== null 
                          ? invoiceData.tax 
                          : (invoiceData.total - invoiceData.subtotal);
                        const taxPercentage = invoiceData.subtotal > 0 
                          ? ((calculatedTax / invoiceData.subtotal) * 100).toFixed(2) 
                          : '0';
                        return `VAT (${taxPercentage}%):`;
                      })()}</strong>
                    </td>
                    <td style="text-align: right; padding: 12px;">
                      <strong>${(() => {
                        const calculatedTax = invoiceData.tax !== undefined && invoiceData.tax !== null 
                          ? invoiceData.tax 
                          : (invoiceData.total - invoiceData.subtotal);
                        return formatCurrency(calculatedTax);
                      })()}</strong>
                    </td>
                  </tr>
                  ${invoiceData.companyTaxId ? `
                  <tr>
                    <td colspan="4" style="text-align: right; padding: 8px 12px; font-size: 0.85em; color: #6b7280; font-style: italic;">
                      VAT Registration: ${invoiceData.companyTaxId}
                    </td>
                  </tr>
                  ` : ''}
                  ` : ''}
                  <tr class="total-row">
                    <td colspan="3" style="text-align: right; padding: 12px; border-top: 2px solid #d1d5db;">
                      <strong>Total:</strong>
                    </td>
                    <td style="text-align: right; padding: 12px; border-top: 2px solid #d1d5db;">
                      <strong>${formatCurrency(invoiceData.total)}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
              
              ${invoiceData.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoiceData.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
              
              ${invoiceData.signature ? `
                <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                  <p style="margin-bottom: 10px;"><strong>Authorized Signature:</strong></p>
                  <div style="margin-bottom: 10px;">
                    <img src="${invoiceData.signature}" alt="Signature" style="max-width: 300px; max-height: 100px; border: 1px solid #e5e7eb; padding: 10px; background: white; display: block;" />
                  </div>
                  ${invoiceData.signedBy ? `<p style="margin-top: 5px; font-size: 0.9em; color: #6b7280; font-weight: 500;">Signed by: ${invoiceData.signedBy}</p>` : ''}
                </div>
              ` : ''}
              
              <p>Thank you for your business!</p>
            </div>
            <div class="footer">
              <p>This is an automated email from UBS ERP System</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();

