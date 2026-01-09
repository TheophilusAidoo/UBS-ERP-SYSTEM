import { Delivery } from '../types';
import { companyService } from './company.service';

let jsPDF: any = null;

class DeliveryPDFService {
  private async loadImageAsBase64(src: string): Promise<string | null> {
    try {
      if (src.startsWith('data:')) {
        return src;
      }

      if (src.startsWith('http://') || src.startsWith('https://')) {
        const response = await fetch(src);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }

      return null;
    } catch (error) {
      console.error('Error loading image:', error);
      return null;
    }
  }

  async generateDeliveryPDF(delivery: Delivery): Promise<void> {
    if (!jsPDF) {
      jsPDF = (await import('jspdf')).default;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // Colors
    const colors = {
      primary: [37, 99, 235], // Blue 600
      primaryLight: [59, 130, 246], // Blue 500
      black: [0, 0, 0],
      gray: [107, 114, 128], // Gray 500
      lightGray: [243, 244, 246], // Gray 100
      borderGray: [229, 231, 235], // Gray 200
      white: [255, 255, 255],
    };

    // Get company info
    let companyLogo: string | null = null;
    let companyName = 'UBS ERP';
    let companyAddress = '';
    let companyPhone = '';
    let companyEmail = '';

    if (delivery.companyId) {
      try {
        const company = await companyService.getCompany(delivery.companyId);
        if (company) {
          companyName = company.name;
          companyAddress = company.address || '';
          companyPhone = company.phone || '';
          companyEmail = company.email || '';
          if (company.logo) {
            companyLogo = await this.loadImageAsBase64(company.logo);
          }
        }
      } catch (error) {
        console.error('Error fetching company:', error);
      }
    }

    // Header Section with Logo and Title
    const headerHeight = 35;
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    // Company Logo (if available)
    if (companyLogo) {
      try {
        const img = new Image();
        img.src = companyLogo;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const logoWidth = 30;
        const logoHeight = Math.min((img.height / img.width) * logoWidth, 25);
        doc.addImage(companyLogo, 'PNG', margin, (headerHeight - logoHeight) / 2, logoWidth, logoHeight);
      } catch (error) {
        console.error('Error adding logo:', error);
      }
    }

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.white);
    const titleText = `${delivery.deliveryType === 'air' ? 'AIR' : 'SEA'} DELIVERY FORM`;
    doc.text(titleText, pageWidth / 2, headerHeight / 2 + 5, { align: 'center' });

    // Date (top right)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.white);
    const dateText = `Date: ${new Date().toLocaleDateString()}`;
    doc.text(dateText, pageWidth - margin, 12, { align: 'right' });

    yPosition = headerHeight + 15;

    // Company Info Box
    doc.setFillColor(...colors.lightGray);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 25, 2, 2, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.black);
    doc.text('From:', margin + 5, yPosition + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let companyY = yPosition + 8;
    if (companyName) {
      doc.text(companyName, margin + 25, companyY);
      companyY += 5;
    }
    if (companyAddress) {
      doc.text(companyAddress, margin + 25, companyY);
      companyY += 5;
    }
    if (companyPhone || companyEmail) {
      const contactInfo = [companyPhone, companyEmail].filter(Boolean).join(' | ');
      doc.text(contactInfo, margin + 25, companyY);
    }

    yPosition += 30;

    // Delivery Details Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.black);
    doc.text('Delivery Information', margin, yPosition);
    yPosition += 8;

    // Delivery Details Table
    const tableStartY = yPosition;
    const rowHeight = 7;
    const labelWidth = 50;
    const valueWidth = pageWidth - 2 * margin - labelWidth - 10;

    const details = [
      ['Date:', new Date(delivery.date).toLocaleDateString()],
      ['Sender Name:', delivery.clientName],
      delivery.senderPhone ? ['Sender Phone:', delivery.senderPhone] : null,
      ['Departure:', delivery.departure],
      ['Destination:', delivery.destination],
      delivery.sizeKgVolume ? ['Size/Kg/Volume:', delivery.sizeKgVolume] : null,
      delivery.estimateArrivalDate
        ? ['Est. Arrival Date:', new Date(delivery.estimateArrivalDate).toLocaleDateString()]
        : null,
    ].filter(Boolean) as [string, string][];

    details.forEach(([label, value], index) => {
      const rowY = tableStartY + index * rowHeight;
      
      // Background for alternating rows
      if (index % 2 === 0) {
        doc.setFillColor(...colors.white);
      } else {
        doc.setFillColor(...colors.lightGray);
      }
      doc.rect(margin, rowY - 5, pageWidth - 2 * margin, rowHeight, 'F');

      // Border
      doc.setDrawColor(...colors.borderGray);
      doc.line(margin, rowY - 5, pageWidth - margin, rowY - 5);

      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...colors.black);
      doc.text(label, margin + 3, rowY);

      // Value
      doc.setFont('helvetica', 'normal');
      const valueLines = doc.splitTextToSize(value, valueWidth);
      doc.text(valueLines[0], margin + labelWidth, rowY);
      if (valueLines.length > 1) {
        doc.text(valueLines[1], margin + labelWidth, rowY + 4);
      }
    });

    yPosition = tableStartY + details.length * rowHeight + 5;

    // Receiver Details Section
    if (delivery.receiverDetails) {
      yPosition += 5;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.black);
      doc.text('Receiver Details', margin, yPosition);
      yPosition += 8;

      // Receiver Details Box
      doc.setFillColor(...colors.lightGray);
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 20, 2, 2, 'F');
      
      doc.setDrawColor(...colors.borderGray);
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 20, 2, 2, 'S');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.black);
      const receiverLines = doc.splitTextToSize(delivery.receiverDetails, pageWidth - 2 * margin - 10);
      receiverLines.forEach((line: string, index: number) => {
        doc.text(line, margin + 5, yPosition + 7 + index * 5);
      });
      yPosition += 25;
    }

    // Items Section
    yPosition += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.black);
    doc.text(`Items (${delivery.items.length})`, margin, yPosition);
    yPosition += 8;

    // Process items sequentially with async/await
    for (let index = 0; index < delivery.items.length; index++) {
      const item = delivery.items[index];
      
      if (yPosition + 50 > pageHeight - 30) {
        doc.addPage();
        yPosition = margin;
      }

      // Item Card
      doc.setFillColor(...colors.lightGray);
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 45, 2, 2, 'F');
      
      doc.setDrawColor(...colors.borderGray);
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 45, 2, 2, 'S');

      // Item Number and Name
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(`Item ${index + 1}`, margin + 5, yPosition + 7);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.black);
      const itemNameLines = doc.splitTextToSize(item.name, pageWidth - 2 * margin - 70);
      doc.text(itemNameLines[0], margin + 5, yPosition + 15);
      if (itemNameLines.length > 1) {
        doc.text(itemNameLines[1], margin + 5, yPosition + 20);
      }

      // Item Picture
      if (item.picture) {
        try {
          const pictureData = await this.loadImageAsBase64(item.picture);
          if (pictureData) {
            const img = new Image();
            img.src = pictureData;
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
            });
            const picWidth = 40;
            const picHeight = Math.min((img.height / img.width) * picWidth, 35);
            const picX = pageWidth - margin - picWidth - 5;
            const picY = yPosition + 5;
            doc.addImage(pictureData, 'PNG', picX, picY, picWidth, picHeight);
            
            // Border around image
            doc.setDrawColor(...colors.borderGray);
            doc.rect(picX, picY, picWidth, picHeight, 'S');
          }
        } catch (error) {
          console.error('Error adding item picture:', error);
        }
      }

      yPosition += 50;
    }

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(...colors.borderGray);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.gray);
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    }

    // Save PDF
    const filename = `${delivery.deliveryType === 'air' ? 'Air' : 'Sea'}_Delivery_${delivery.clientName.replace(
      /\s+/g,
      '_'
    )}_${new Date(delivery.date).toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  }
}

export const deliveryPDFService = new DeliveryPDFService();

