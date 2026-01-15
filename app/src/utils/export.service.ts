// Export Service for PDF and Excel generation
// This service provides utilities for exporting data to PDF and Excel formats

export interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  title: string;
  filename?: string;
}

class ExportService {
  /**
   * Export data to CSV (Excel-compatible)
   */
  async exportToCSV(data: ExportData): Promise<void> {
    const { headers, rows, filename } = data;
    const csvContent = [headers, ...rows].map((row) => 
      row.map((cell) => {
        // Escape commas and quotes in CSV
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${data.title}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Export data to Excel (XLSX) format with proper styling
   * Creates an HTML table with Excel-compatible formatting
   */
  async exportToExcel(data: ExportData): Promise<void> {
    const { headers, rows, filename } = data;
    
    // Create HTML table with Excel-compatible styling
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${data.title}</x:Name>
                  <x:WorksheetOptions>
                    <x:DefaultRowHeight>15</x:DefaultRowHeight>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            table {
              border-collapse: collapse;
              width: 100%;
              font-family: Arial, sans-serif;
              font-size: 11pt;
            }
            .header-row {
              background-color: #2563eb; /* Professional blue background */
              color: #ffffff; /* White text */
              font-weight: bold;
              text-align: center;
              padding: 10px 8px;
              border: 1px solid #1e40af;
              vertical-align: middle;
            }
            .data-row {
              background-color: #ffffff; /* White background */
              color: #1f2937; /* Dark grey text */
              padding: 8px 6px;
              border: 1px solid #e5e7eb;
              vertical-align: middle;
            }
            .data-row-alt {
              background-color: #f9fafb; /* Light grey alternating rows */
              color: #1f2937; /* Dark grey text */
              padding: 8px 6px;
              border: 1px solid #e5e7eb;
              vertical-align: middle;
            }
            .number-cell {
              color: #059669; /* Green for numbers */
              font-weight: 600;
              text-align: center;
            }
            .text-cell {
              text-align: left;
              color: #1f2937; /* Dark grey text for non-numeric cells */
            }
            td, th {
              mso-number-format: "@";
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                ${headers.map((header) => {
                  return `<th class="header-row">${header}</th>`;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map((row, rowIndex) => 
                `<tr>
                  ${row.map((cell, index) => {
                    const isNumeric = typeof cell === 'number' || (typeof cell === 'string' && /^\d+$/.test(cell));
                    const isNumericColumn = index >= 3 && index <= 5; // Columns D, E, F (Clients contacted, Quotes sent, Sales made)
                    const cellClass = isNumericColumn && isNumeric ? 'number-cell' : 'text-cell';
                    const rowClass = rowIndex % 2 === 0 ? 'data-row' : 'data-row-alt';
                    return `<td class="${rowClass} ${cellClass}">${cell}</td>`;
                  }).join('')}
                </tr>`
              ).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${data.title}_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Export data to PDF
   * Note: This requires a library like jsPDF or pdfmake
   */
  async exportToPDF(data: ExportData): Promise<void> {
    // For now, we'll create a simple HTML-based PDF
    // In production, you could use jsPDF or pdfmake for better PDF generation
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${data.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #2563eb; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border: 1px solid #e5e7eb; }
            td { padding: 10px; border: 1px solid #e5e7eb; }
            .footer { margin-top: 30px; text-align: center; color: #6b7280; font-size: 0.875rem; }
          </style>
        </head>
        <body>
          <h1>${data.title}</h1>
          <p>Generated on: ${new Date().toLocaleString('en-US')}</p>
          <table>
            <thead>
              <tr>
                ${data.headers.map(header => `<th>${header}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.rows.map(row => 
                `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
              ).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>Generated by UBS ERP System</p>
          </div>
        </body>
      </html>
    `;

    // Open in new window for printing/saving as PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      // Wait a bit then trigger print dialog
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  }

  /**
   * Format currency for export
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Format date for export
   */
  formatDate(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Format datetime for export
   */
  formatDateTime(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

export const exportService = new ExportService();


