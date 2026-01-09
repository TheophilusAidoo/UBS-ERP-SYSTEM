// Invoice PDF Generation Service
// Generates modern, professional PDF invoices

// Dynamic import for jsPDF to handle type issues
let jsPDF: any;

export interface InvoicePDFData {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientNumber?: string;
  clientCountry?: string;
  clientAddress?: string;
  clientPhone?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  paidAmount?: number;
  balanceDue?: number;
  dueDate?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyTaxId?: string;
  companyLogo?: string; // Base64 or URL
  signature?: string; // Base64 data URL
  signedBy?: string;
  currencySymbol?: string;
  currencyCode?: string; // Currency code (e.g., 'USD', 'EUR', 'GHS')
  createdAt?: string;
  status?: string;
}

class InvoicePDFService {
  /**
   * Convert image (base64 or URL) to base64 data URL
   */
  private async loadImageAsBase64(src: string): Promise<string | null> {
    try {
      if (!src || typeof src !== 'string') {
        return null;
      }

      if (src.startsWith('data:')) {
        return src;
      }

      if (src.startsWith('http://') || src.startsWith('https://')) {
        try {
          const response = await fetch(src, {
            mode: 'cors',
            cache: 'default',
          });
          
          if (!response.ok) {
            console.warn(`Failed to load image: ${response.status} ${response.statusText}`);
            return null;
          }
          
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => {
              console.warn('FileReader error loading image');
              resolve(null);
            };
            reader.readAsDataURL(blob);
          });
        } catch (fetchError: any) {
          // Handle CORS, network, or other fetch errors gracefully
          console.warn('Error fetching image:', fetchError.message || fetchError);
          return null;
        }
      }

      if (src.startsWith('/9j/') || src.startsWith('iVBORw0KGgo')) {
        const mimeType = src.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
        return `data:${mimeType};base64,${src}`;
      }

      return src;
    } catch (error: any) {
      console.warn('Error loading image:', error.message || error);
      return null;
    }
  }

  /**
   * Generate modern PDF invoice
   */
  async generateInvoicePDF(data: InvoicePDFData): Promise<Blob> {
    if (!jsPDF) {
      jsPDF = (await import('jspdf')).default;
    }
    
    const doc = new jsPDF();
    // Set default font encoding to ensure proper character rendering
    doc.setLanguage('en-US');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Get currency display - prefer currency code for PDF compatibility
    // jsPDF's default font doesn't support all Unicode currency symbols well
    const getCurrencyDisplay = (): string => {
      // If currency code is provided, use it (most reliable)
      if (data.currencyCode) {
        return data.currencyCode;
      }
      
      // Map currency symbols to safe currency codes
      // Some Unicode symbols don't render well in jsPDF's default font
      const symbolToCode: Record<string, string> = {
        '$': 'USD',
        '€': 'EUR',
        '£': 'GBP',
        '¥': 'JPY',
        'د.إ': 'AED',
        '₵': 'GHS',
        'FCFA': 'XAF',
        'SAR': 'SAR',
        '﷼': 'SAR',
        'E£': 'EGP',
        'CNY': 'CNY',
        'XAF': 'XAF',
      };
      
      const symbol = data.currencySymbol || '$';
      
      // Check Unicode character codes
      if (symbol.charCodeAt(0) === 0x20AC) return 'EUR';      // €
      if (symbol.charCodeAt(0) === 0x00A3) return 'GBP';      // £
      if (symbol.charCodeAt(0) === 0x00A5) return 'JPY';      // ¥
      if (symbol.charCodeAt(0) === 0x20B5) return 'GHS';      // ₵
      if (symbol.charCodeAt(0) === 0xFDFC) return 'SAR';      // ﷼
      
      // Check symbol map
      if (symbolToCode[symbol]) {
        return symbolToCode[symbol];
      }
      
      // If symbol is already a currency code (3 letters), use it
      if (/^[A-Z]{3}$/.test(symbol)) {
        return symbol;
      }
      
      // If symbol is simple ASCII like $, use it
      if (/^[A-Z0-9$]+$/.test(symbol) && symbol.length <= 4) {
        return symbol;
      }
      
      // Default fallback
      return 'USD';
    };
    
    const currencyDisplay = getCurrencyDisplay();
    const formatCurrency = (amount: number) => {
      // Format number with proper decimal places
      const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      // Use currency code/symbol with space
      return `${currencyDisplay} ${formatted}`;
    };

    // Clean minimalist color palette - Black and White
    const colors = {
      black: [0, 0, 0],
      dark: [30, 30, 30],
      gray: [128, 128, 128],
      lightGray: [240, 240, 240],
      border: [200, 200, 200],
      white: [255, 255, 255],
    };

    // Load company logo
    let logoData: string | null = null;
    let logoWidth = 0;
    let logoHeight = 0;
    if (data.companyLogo) {
      try {
        logoData = await this.loadImageAsBase64(data.companyLogo);
        if (logoData) {
          try {
            const img = new Image();
            img.src = logoData;
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Image load timeout'));
              }, 5000); // 5 second timeout
              
              img.onload = () => {
                clearTimeout(timeout);
                resolve(null);
              };
              img.onerror = (err) => {
                clearTimeout(timeout);
                reject(err);
              };
            });
            const maxHeight = 30;
            logoHeight = Math.min(maxHeight, img.height);
            logoWidth = (img.width / img.height) * logoHeight;
          } catch (error: any) {
            console.warn('Error processing logo image:', error.message || error);
            logoData = null; // Continue without logo if it fails to load
          }
        }
      } catch (error: any) {
        console.warn('Error loading logo:', error.message || error);
        logoData = null; // Continue without logo if it fails to load
      }
    }

    // ========== HEADER - Logo and INVOICE on same line ==========
    // Calculate vertical center for logo and INVOICE text alignment
    const headerLineY = yPosition + 15; // Vertical position for logo and INVOICE
    
    // Logo (left side)
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', margin, yPosition, logoWidth, logoHeight);
      } catch (error) {
        console.error('Error adding logo:', error);
      }
    }

    // Large INVOICE text (right side, same line as logo)
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.black);
    // Align INVOICE text to the right, vertically centered with logo
    const invoiceTextY = logoData ? yPosition + (logoHeight / 2) + 5 : yPosition + 10;
    doc.text('INVOICE', pageWidth - margin, invoiceTextY, { align: 'right' });
    
    // Invoice Number (right side, below INVOICE text)
    const invoiceNumberY = invoiceTextY + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.black);
    doc.text(`NO. ${data.invoiceNumber}`, pageWidth - margin, invoiceNumberY, { align: 'right' });

    // Date (left side, below logo)
    yPosition += logoData ? logoHeight + 10 : 20;
    if (data.createdAt) {
      const date = new Date(data.createdAt);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      const formattedDate = `${String(date.getDate()).padStart(2, '0')} ${monthNames[date.getMonth()]}, ${date.getFullYear()}`;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${formattedDate}`, margin, yPosition);
      yPosition += 10;
    }

    yPosition += 2; // Reduced space before Billed to section

    // ========== BILLED TO AND FROM SECTION ==========
    const twoColumnWidth = (contentWidth - 20) / 2;
    const leftColumnX = margin;
    const rightColumnX = margin + twoColumnWidth + 20;

    // Billed to (Left column)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.black);
    doc.text('Billed to:', leftColumnX, yPosition);
    yPosition += 7;

    doc.setFont('helvetica', 'bold');
    doc.text(data.clientName, leftColumnX, yPosition);
    yPosition += 6;

    doc.setFont('helvetica', 'normal');
    if (data.clientNumber) {
      doc.text(`Client #: ${data.clientNumber}`, leftColumnX, yPosition);
      yPosition += 5;
    }
    if (data.clientAddress) {
      doc.text(data.clientAddress, leftColumnX, yPosition);
      yPosition += 5;
    }
    if (data.clientCountry) {
      doc.text(data.clientCountry, leftColumnX, yPosition);
      yPosition += 5;
    }
    if (data.clientEmail) {
      doc.text(data.clientEmail, leftColumnX, yPosition);
    }

    // From (Right column) - Calculate Y position based on client info height
    let clientInfoHeight = 7; // Base height for client name
    if (data.clientNumber) clientInfoHeight += 5;
    if (data.clientAddress) clientInfoHeight += 5;
    if (data.clientCountry) clientInfoHeight += 5;
    if (data.clientEmail) clientInfoHeight += 5;
    const fromY = yPosition - clientInfoHeight;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('From:', rightColumnX, fromY);
    
    let fromContentY = fromY + 7;
    if (data.companyName) {
      doc.setFont('helvetica', 'bold');
      doc.text(data.companyName, rightColumnX, fromContentY);
      fromContentY += 6;
    }

    doc.setFont('helvetica', 'normal');
    if (data.companyAddress) {
      doc.text(data.companyAddress, rightColumnX, fromContentY);
      fromContentY += 5;
    }
    if (data.companyEmail) {
      doc.text(data.companyEmail, rightColumnX, fromContentY);
    }

    yPosition = Math.max(yPosition, fromContentY) + 6;

    // ========== ITEMS TABLE ==========
    const tableHeaderHeight = 14;
    const tableStartY = yPosition;
    const colWidths = {
      item: contentWidth * 0.40,
      quantity: contentWidth * 0.15,
      price: contentWidth * 0.20,
      amount: contentWidth * 0.25,
    };

    // Calculate column separator positions (borders)
    const separatorX = {
      item: margin + colWidths.item,
      quantity: margin + colWidths.item + colWidths.quantity,
      price: margin + colWidths.item + colWidths.quantity + colWidths.price,
    };

    // Text positions with proper padding to avoid border lines
    const colX = {
      item: margin + 8, // More padding from left border
      quantity: separatorX.item + 8, // Padding from left separator
      price: separatorX.quantity + 8, // Padding from left separator
      amount: separatorX.price + 8, // Padding from left separator
    };

    // Draw top border of table
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);

    // Table header with light gray background
    doc.setFillColor(...colors.lightGray);
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPosition, contentWidth, tableHeaderHeight, 'FD');
    
    // Draw vertical lines in header
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.3);
    doc.line(separatorX.item, yPosition, separatorX.item, yPosition + tableHeaderHeight);
    doc.line(separatorX.quantity, yPosition, separatorX.quantity, yPosition + tableHeaderHeight);
    doc.line(separatorX.price, yPosition, separatorX.price, yPosition + tableHeaderHeight);
    
    // Header text with better spacing and alignment (avoiding border lines)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.black);
    doc.text('Item', colX.item, yPosition + 10);
    // Center text in quantity column (between separatorX.item and separatorX.quantity)
    doc.text('Quantity', separatorX.item + (separatorX.quantity - separatorX.item) / 2, yPosition + 10, { align: 'center' });
    // Right align text in price column (before separatorX.price)
    doc.text('Price', separatorX.price - 8, yPosition + 10, { align: 'right' });
    // Right align text in amount column (before right edge)
    doc.text('Amount', pageWidth - margin - 8, yPosition + 10, { align: 'right' });
    
    // Draw bottom border of header
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition + tableHeaderHeight, pageWidth - margin, yPosition + tableHeaderHeight);
    
    yPosition += tableHeaderHeight;

    // Table rows with proper borders
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.3);
    
    data.items.forEach((item, index) => {
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = margin;
        const newTableStartY = yPosition;
        
        // Redraw header with borders
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.5);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        
        doc.setFillColor(...colors.lightGray);
        doc.rect(margin, yPosition, contentWidth, tableHeaderHeight, 'FD');
        
        // Draw vertical lines in header
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.3);
        doc.line(separatorX.item, yPosition, separatorX.item, yPosition + tableHeaderHeight);
        doc.line(separatorX.quantity, yPosition, separatorX.quantity, yPosition + tableHeaderHeight);
        doc.line(separatorX.price, yPosition, separatorX.price, yPosition + tableHeaderHeight);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.black);
        doc.text('Item', colX.item, yPosition + 10);
        doc.text('Quantity', separatorX.item + (separatorX.quantity - separatorX.item) / 2, yPosition + 10, { align: 'center' });
        doc.text('Price', separatorX.price - 8, yPosition + 10, { align: 'right' });
        doc.text('Amount', pageWidth - margin - 8, yPosition + 10, { align: 'right' });
        
        // Draw bottom border of header
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.5);
        doc.line(margin, yPosition + tableHeaderHeight, pageWidth - margin, yPosition + tableHeaderHeight);
        
        yPosition += tableHeaderHeight;
      }

      doc.setFontSize(10);
      // Calculate available width for description (from left border to first separator, minus padding)
      const descriptionWidth = separatorX.item - margin - 16; // 8px padding on each side
      const descriptionLines = doc.splitTextToSize(item.description, descriptionWidth);
      const lineHeight = 5;
      const rowHeight = Math.max(14, descriptionLines.length * lineHeight + 8);
      const rowStartY = yPosition;

      // Draw left border
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.3);
      doc.line(margin, rowStartY, margin, rowStartY + rowHeight);
      
      // Draw vertical separators
      doc.line(separatorX.item, rowStartY, separatorX.item, rowStartY + rowHeight);
      doc.line(separatorX.quantity, rowStartY, separatorX.quantity, rowStartY + rowHeight);
      doc.line(separatorX.price, rowStartY, separatorX.price, rowStartY + rowHeight);
      
      // Draw right border
      doc.line(pageWidth - margin, rowStartY, pageWidth - margin, rowStartY + rowHeight);

      // Content - all items are bold (positioned to avoid border lines)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.black);
      
      // Item description - left aligned, padding from left border
      doc.text(descriptionLines, colX.item, rowStartY + 7);
      
      // Quantity - centered in its column (between separatorX.item and separatorX.quantity)
      const quantityCenterX = separatorX.item + (separatorX.quantity - separatorX.item) / 2;
      doc.text(item.quantity.toString(), quantityCenterX, rowStartY + (rowHeight / 2) + 3, { align: 'center' });
      
      // Price - right aligned, padding from separatorX.price
      doc.setFont('helvetica', 'bold');
      const priceText = formatCurrency(item.unitPrice);
      // Align to right edge of Price column (before separatorX.price)
      doc.text(priceText, separatorX.price - 10, rowStartY + (rowHeight / 2) + 3, { align: 'right' });
      
      // Amount - right aligned, padding from right edge
      const amountText = formatCurrency(item.total);
      // Align to right edge of page
      doc.text(amountText, pageWidth - margin - 8, rowStartY + (rowHeight / 2) + 3, { align: 'right' });

      // Draw bottom border of row
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.3);
      doc.line(margin, rowStartY + rowHeight, pageWidth - margin, rowStartY + rowHeight);

      yPosition += rowHeight;
    });

    // Draw final bottom border of table (thicker)
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);

    // ========== TAX AND TOTAL SECTION ==========
    yPosition += 8;
    const totalStartX = margin + colWidths.item + colWidths.quantity;
    const totalWidth = colWidths.price + colWidths.amount;

    // Tax row (if tax exists)
    if (data.tax && data.tax > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.black);
      // Tax label aligned to right edge of Price column
      doc.text('Tax:', separatorX.price - 10, yPosition, { align: 'right' });
      const taxText = formatCurrency(data.tax);
      doc.setFont('helvetica', 'normal');
      // Tax amount aligned to right edge
      doc.text(taxText, pageWidth - margin - 8, yPosition, { align: 'right' });
      yPosition += 8;
    }

    // Total - "Total" label in Price column, amount in Amount column
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.black);
    // Total label aligned to right edge of Price column
    doc.text('Total', separatorX.price - 10, yPosition, { align: 'right' });
    const totalText = formatCurrency(data.total);
    doc.setFont('helvetica', 'bold');
    // Total amount aligned to right edge
    doc.text(totalText, pageWidth - margin - 8, yPosition, { align: 'right' });

    yPosition += 20;

    // ========== SIGNATURE SECTION ==========
    if (data.signature || data.signedBy) {
      if (yPosition + 40 > pageHeight - 30) {
        doc.addPage();
        yPosition = margin;
      }

      yPosition += 10;

      if (data.signedBy) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.gray);
        // "Authorized by:" text - LEFT aligned
        doc.text(`Authorized by: ${data.signedBy}`, margin, yPosition);
        yPosition += 5;
      }

      if (data.signature) {
        try {
          // Load signature image - handle both data URLs and base64 strings
          let signatureData = data.signature;
          if (!signatureData.startsWith('data:')) {
            // If it's not a data URL, assume it's base64 and add the prefix
            signatureData = `data:image/png;base64,${signatureData}`;
          }
          
          const signatureBase64 = await this.loadImageAsBase64(signatureData);
          if (signatureBase64) {
            const img = new Image();
            img.src = signatureBase64;
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = (err) => {
                console.error('Error loading signature image:', err);
                reject(err);
              };
            });

            const sigWidth = 60;
            const sigHeight = Math.min((img.height / img.width) * sigWidth, 20);
            
            // Left-align signature beneath "Authorized by:" text
            doc.addImage(signatureBase64, 'PNG', margin, yPosition, sigWidth, sigHeight);
            yPosition += sigHeight + 15;
          }
        } catch (error) {
          console.error('Error adding signature to PDF:', error);
          // Continue even if signature fails
        }
      }
    }

    // ========== PAYMENT METHOD AND NOTE ==========
    if (yPosition < pageHeight - 40) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.black);
      
      // Payment method - show both options (bold)
      doc.text(`Payment method: Cash and Bank Deposit`, margin, yPosition);
      yPosition += 8;

      // Note (bold)
      doc.text('Note: Thank you for choosing us!', margin, yPosition);
    }

    // Generate blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  }

  /**
   * Generate PDF and return as base64 string
   */
  async generateInvoicePDFBase64(data: InvoicePDFData): Promise<string> {
    const blob = await this.generateInvoicePDF(data);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Return base64 without data URL prefix for email attachments
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const invoicePDFService = new InvoicePDFService();
