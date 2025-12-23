import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyForPDF as formatCurrency } from '../utils/numberFormat';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: 'deposit' | 'final';
  percentage: number | null;
  amount_ht: number;
  amount_ttc: number;
  status: 'unpaid' | 'paid';
  payment_date: string | null;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
}

interface Quotation {
  quotation_number: string;
  quotation_date: string;
  customer_company: string;
  customer_name: string;
  customer_email: string[];
  customer_address: string;
  postal_code: string;
  city: string;
  country: string;
  total_amount: number;
  vat_rate: number;
  created_at: string;
  study_title: string;
}

const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } else {
          resolve('');
        }
      } catch (error) {
        console.error('Error converting image to base64:', url, error);
        resolve('');
      }
    };
    img.onerror = () => {
      resolve('');
    };
    img.src = url;
  });
};

export async function generateInvoicePDF(invoice: Invoice, quotation: Quotation) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;

  const signatureImg = await loadImageAsBase64('/signature-sylvie.jpg');
  const logoImg = await loadImageAsBase64('/logo%20copy.png');

  let yPos = margin;

  if (logoImg) {
    const logoWidth = 25;
    const logoHeight = 25;
    pdf.addImage(logoImg, 'PNG', margin, yPos, logoWidth, logoHeight);
  }

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('GREDECO', margin + 30, yPos + 10);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Groupe de Recherche et d\'Evaluation', margin + 30, yPos + 16);
  pdf.text('en Dermatologie et Cosmétologie', margin + 30, yPos + 21);

  const rightX = pageWidth - margin;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(quotation.customer_company.toUpperCase(), rightX, yPos, { align: 'right' });

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  let addressY = yPos + 6;
  if (quotation.customer_address) {
    const addressLines = pdf.splitTextToSize(quotation.customer_address, 60);
    addressLines.forEach((line: string) => {
      pdf.text(line, rightX, addressY, { align: 'right' });
      addressY += 4;
    });
  }

  const locationParts = [quotation.postal_code, quotation.city].filter(Boolean);
  if (locationParts.length > 0) {
    pdf.text(locationParts.join(' '), rightX, addressY, { align: 'right' });
    addressY += 4;
  }
  if (quotation.country) {
    pdf.text(quotation.country, rightX, addressY, { align: 'right' });
  }

  yPos += 35;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const issueDate = new Date(invoice.issue_date);
  pdf.text(`Paris, le ${issueDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, rightX, yPos, { align: 'right' });

  yPos += 15;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`FACTURE n° ${invoice.invoice_number}`, pageWidth / 2, yPos, { align: 'center' });

  yPos += 12;

  if (quotation.study_title) {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(108, 99, 142);
    const titleLines = pdf.splitTextToSize(quotation.study_title.toUpperCase(), pageWidth - 2 * margin);
    titleLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;
    });
    pdf.setTextColor(0, 0, 0);
  }

  yPos += 8;

  const vatRate = quotation.vat_rate || 20;
  const totalTtc = quotation.total_amount;
  const totalHt = totalTtc / (1 + vatRate / 100);

  const devisDate = new Date(quotation.quotation_date || quotation.created_at);
  const formattedDevisDate = devisDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const tableData: string[][] = [];

  if (invoice.invoice_type === 'deposit') {
    const description = invoice.percentage
      ? `Acompte ${invoice.percentage}% sur devis ${quotation.quotation_number} du ${formattedDevisDate}`
      : `Acompte sur devis ${quotation.quotation_number} du ${formattedDevisDate}`;

    tableData.push([
      description,
      '1',
      `${formatCurrency(invoice.amount_ht)} €`,
      `${vatRate}%`,
      `${formatCurrency(invoice.amount_ttc - invoice.amount_ht)} €`,
      `${formatCurrency(invoice.amount_ttc)} €`
    ]);
  } else {
    const paidDeposit = totalTtc - invoice.amount_ttc;

    if (paidDeposit > 0) {
      tableData.push([
        `Montant total du devis ${quotation.quotation_number} du ${formattedDevisDate}`,
        '1',
        `${formatCurrency(totalHt)} €`,
        `${vatRate}%`,
        `${formatCurrency(totalTtc - totalHt)} €`,
        `${formatCurrency(totalTtc)} €`
      ]);

      const depositHt = paidDeposit / (1 + vatRate / 100);
      const depositVat = paidDeposit - depositHt;

      tableData.push([
        'Moins: Acompte(s) déjà versé(s)',
        '1',
        `-${formatCurrency(depositHt)} €`,
        `${vatRate}%`,
        `-${formatCurrency(depositVat)} €`,
        `-${formatCurrency(paidDeposit)} €`
      ]);

      tableData.push([
        'Solde à payer',
        '1',
        `${formatCurrency(invoice.amount_ht)} €`,
        `${vatRate}%`,
        `${formatCurrency(invoice.amount_ttc - invoice.amount_ht)} €`,
        `${formatCurrency(invoice.amount_ttc)} €`
      ]);
    } else {
      tableData.push([
        `Facture finale - Devis ${quotation.quotation_number} du ${formattedDevisDate}`,
        '1',
        `${formatCurrency(invoice.amount_ht)} €`,
        `${vatRate}%`,
        `${formatCurrency(invoice.amount_ttc - invoice.amount_ht)} €`,
        `${formatCurrency(invoice.amount_ttc)} €`
      ]);
    }
  }

  autoTable(pdf, {
    startY: yPos,
    head: [['Désignation', 'Qté', 'Montant HT', 'TVA', 'Montant TVA', 'Montant TTC']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      font: 'helvetica',
      fontStyle: 'normal',
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      overflow: 'linebreak',
      halign: 'left',
      valign: 'top',
      minCellHeight: 8
    },
    headStyles: {
      fillColor: [108, 99, 142],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
      lineWidth: 0.5
    },
    columnStyles: {
      0: { cellWidth: 80, overflow: 'linebreak', valign: 'top', font: 'helvetica', fontStyle: 'normal' },
      1: { cellWidth: 15, halign: 'center', valign: 'middle' },
      2: { cellWidth: 26, halign: 'right', valign: 'middle' },
      3: { cellWidth: 15, halign: 'center', valign: 'middle' },
      4: { cellWidth: 24, halign: 'right', valign: 'middle' },
      5: { cellWidth: 26, halign: 'right', fontStyle: 'bold', valign: 'middle' }
    }
  });

  yPos = (pdf as any).lastAutoTable.finalY + 8;

  pdf.setDrawColor(108, 99, 142);
  pdf.setLineWidth(0.5);
  pdf.rect(pageWidth - margin - 60, yPos, 60, 20);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(108, 99, 142);
  pdf.text('Total HT:', pageWidth - margin - 57, yPos + 5);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${formatCurrency(invoice.amount_ht)} €`, pageWidth - margin - 3, yPos + 5, { align: 'right' });

  pdf.setTextColor(108, 99, 142);
  pdf.text('TVA:', pageWidth - margin - 57, yPos + 10);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${formatCurrency(invoice.amount_ttc - invoice.amount_ht)} €`, pageWidth - margin - 3, yPos + 10, { align: 'right' });

  pdf.setFontSize(11);
  pdf.setTextColor(108, 99, 142);
  pdf.text('Total TTC:', pageWidth - margin - 57, yPos + 17);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${formatCurrency(invoice.amount_ttc)} €`, pageWidth - margin - 3, yPos + 17, { align: 'right' });

  yPos += 28;

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  const legalText = 'Loi 92-1442 du 31 décembre 1992: les factures sont payables à réception. Tout retard de paiement pourrait porter de plein droit jusqu\'à parfait paiement, intérêt à un taux égal à trois fois le taux légal. De plus, une pénalité forfaitaire de 40€ (décret du 2 oct 2012) est exigible sans qu\'un rappel soit nécessaire. Tout professionnel en situation de retard de paiement en est de plein droit débiteur à l\'égard du créancier.';
  const legalLines = pdf.splitTextToSize(legalText, pageWidth - 2 * margin);
  legalLines.forEach((line: string) => {
    pdf.text(line, margin, yPos);
    yPos += 3;
  });

  yPos += 5;

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 0, 0);
  pdf.text('GREDECO a reçu l\'agrément en ce qui concerne le crédit d\'impôt en faveur', margin, yPos);
  yPos += 4;
  pdf.text('de la recherche de 2022 à 2026', margin, yPos);
  pdf.setTextColor(0, 0, 0);

  yPos += 8;

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Compte Crédit Agricole de Normandie-Seine', margin, yPos);
  yPos += 4;
  pdf.text('IBAN : FR76 1830 6002 3236 1380 7752 124', margin, yPos);
  yPos += 4;
  pdf.text('BIC: AGRIFRPP883', margin, yPos);
  yPos += 4;
  pdf.text('N° intracommunautaire: FR61 39 222 1230', margin, yPos);

  yPos += 8;

  if (signatureImg) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Dr S. BOISNIC', pageWidth - margin - 35, yPos, { align: 'right' });

    const signatureWidth = 30;
    const signatureHeight = 18;
    pdf.addImage(signatureImg, 'JPEG', pageWidth - margin - 40, yPos + 2, signatureWidth, signatureHeight);
  }

  yPos = pageHeight - 22;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(1);
  pdf.line(margin, yPos - 3, pageWidth - margin, yPos - 3);

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('SARL au capital de 40 000 Euros. R. C. S. Paris 392 221 230 SIRET 392 221 230 00023. APE 731Z. FR61392221230', pageWidth / 2, yPos, { align: 'center' });
  yPos += 3.5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Siège: 69, rue de la Tour, 75116 Paris; Laboratoires: 45 Bd V. Auriol, 75 013 Paris', pageWidth / 2, yPos, { align: 'center' });
  yPos += 3.5;
  pdf.text('Tel : 01-45-86-58-82', pageWidth / 2, yPos, { align: 'center' });
  yPos += 3.5;
  pdf.setFont('helvetica', 'normal');
  pdf.text('gredeco@gredeco.com', pageWidth / 2, yPos, { align: 'center' });

  pdf.save(`Facture_${invoice.invoice_number}.pdf`);
}
