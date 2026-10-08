import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation, QuotationItem } from '../lib/supabase';
import { formatCurrencyForPDF as formatCurrency } from '../utils/numberFormat';
import { getTranslations, Language } from '../utils/translations';

interface ObjectiveGroup {
  name: string;
  timepoints: string;
  items: QuotationItem[];
}

const sortTimepoints = (timepoints: string[]): string[] => {
  const getTimepointValueInMinutes = (timepoint: string): number => {
    const normalizedTimepoint = timepoint.trim().toUpperCase();
    if (normalizedTimepoint === 'T IMMEDIAT') return -2;
    if (normalizedTimepoint === 'T IMM') return -1;
    if (normalizedTimepoint === 'T0') return 0;

    // Remove the 'T' prefix and work with uppercase for consistency
    const value = normalizedTimepoint.substring(1);

    // Check for minutes (MIN or M at the end)
    if (value.endsWith('MIN')) {
      return parseInt(value);
    }
    if (value.match(/^\d+M$/)) {
      return parseInt(value);
    }

    // Check for hours (H)
    if (value.endsWith('H')) {
      return parseInt(value) * 60;
    }

    // Otherwise, it's days - convert to minutes
    const num = parseInt(value);
    return num * 24 * 60;
  };

  return timepoints.sort((a, b) => getTimepointValueInMinutes(a) - getTimepointValueInMinutes(b));
};

const wrapText = (pdf: jsPDF, text: string, maxWidth: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = pdf.getTextWidth(testLine);

    if (textWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const formatCriteriaLines = (value: string): string[] => {
  return value
    .normalize('NFC')
    .replace(/\r\n/g, '\n')
    .split(/[\n;]+/)
    .map((criterion: string) => criterion.replace(/^[•\-]+\s*/, '').replace(/\s+/g, ' ').trim())
    .filter((criterion: string) => criterion.length > 0)
    .map((criterion: string) => `• ${criterion}`);
};

const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();

    // Only set crossOrigin for external URLs, not for local assets
    if (url.startsWith('http://') || url.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          console.log('Image loaded successfully:', url, 'size:', dataUrl.length);
          resolve(dataUrl);
        } else {
          console.error('Failed to get canvas context for:', url);
          resolve('');
        }
      } catch (error) {
        console.error('Error converting image to base64:', url, error);
        resolve('');
      }
    };
    img.onerror = (error) => {
      console.error('Failed to load image:', url, error);
      resolve('');
    };
    img.src = url;
  });
};

interface ImageWithDimensions {
  data: string;
  width: number;
  height: number;
}

const loadImageWithDimensions = (url: string): Promise<ImageWithDimensions> => {
  return new Promise((resolve) => {
    const img = new Image();

    if (url.startsWith('http://') || url.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve({ data: dataUrl, width: canvas.width, height: canvas.height });
        } else {
          resolve({ data: '', width: 0, height: 0 });
        }
      } catch {
        resolve({ data: '', width: 0, height: 0 });
      }
    };
    img.onerror = () => resolve({ data: '', width: 0, height: 0 });
    img.src = url;
  });
};

const loadSVGAsBase64 = async (url: string, width: number, height: number): Promise<string> => {
  return new Promise((resolve) => {
    fetch(url)
      .then(response => response.text())
      .then(svgText => {
        const img = new Image();
        const blob = new Blob([svgText], { type: 'image/svg+xml' });
        const blobUrl = URL.createObjectURL(blob);

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const dataUrl = canvas.toDataURL('image/png');
              URL.revokeObjectURL(blobUrl);
              console.log('SVG loaded and converted successfully');
              resolve(dataUrl);
            } else {
              URL.revokeObjectURL(blobUrl);
              console.error('Failed to get canvas context for SVG');
              resolve('');
            }
          } catch (error) {
            URL.revokeObjectURL(blobUrl);
            console.error('Error converting SVG to base64:', error);
            resolve('');
          }
        };

        img.onerror = (error) => {
          URL.revokeObjectURL(blobUrl);
          console.error('Failed to load SVG image:', error);
          resolve('');
        };

        img.src = blobUrl;
      })
      .catch(error => {
        console.error('Failed to fetch SVG:', error);
        resolve('');
      });
  });
};

const groupItemsByObjective = (items: QuotationItem[], quotation: Quotation): { objectiveGroups: ObjectiveGroup[], mandatoryItems: QuotationItem[] } => {
  const mandatoryItems: QuotationItem[] = [];
  const objectiveMap = new Map<string, ObjectiveGroup>();

  // Try to parse saved objectives data
  let savedObjectives: Array<{ id: string, name: string, timepoints: string[] }> = [];
  if (quotation.objectives_data) {
    try {
      savedObjectives = typeof quotation.objectives_data === 'string'
        ? JSON.parse(quotation.objectives_data)
        : quotation.objectives_data;
    } catch (e) {
      console.error('Failed to parse objectives_data:', e);
    }
  }

  // Create a map of objective names to their timepoints
  const objectiveTimepointsMap = new Map<string, string[]>();
  savedObjectives.forEach(obj => {
    objectiveTimepointsMap.set(obj.name, obj.timepoints);
  });

  // Group items by objective
  items.forEach(item => {
    // Check if item is mandatory (no objective_name or includes mandatory text)
    if (!item.objective_name ||
        item.description?.includes('MANDATORY FOR ALL STUDIES') ||
        item.description?.includes('MANDATORY FOR CLINICAL TRIALS')) {
      mandatoryItems.push(item);
      return;
    }

    const isRecruitmentObjective = item.objective_name.toLowerCase().includes('recrutement') ||
                                   item.objective_name.toLowerCase().includes('recruitment') ||
                                   item.objective_name.toLowerCase().includes('panelist') ||
                                   item.objective_name.toLowerCase().includes('panéliste');

    if (isRecruitmentObjective) {
      mandatoryItems.push(item);
    } else {
      if (!objectiveMap.has(item.objective_name)) {
        // Use saved objective timepoints if available, otherwise fallback to item timepoints
        const objectiveTimepoints = objectiveTimepointsMap.get(item.objective_name);
        const timepointsDisplay = objectiveTimepoints && objectiveTimepoints.length > 0
          ? sortTimepoints(objectiveTimepoints).join(', ')
          : item.objective_timepoints || '';

        objectiveMap.set(item.objective_name, {
          name: item.objective_name,
          timepoints: timepointsDisplay,
          items: []
        });
      }
      objectiveMap.get(item.objective_name)!.items.push(item);
    }
  });

  return {
    objectiveGroups: Array.from(objectiveMap.values()),
    mandatoryItems
  };
};

export async function generateQuotationPDF(quotation: Quotation, items: QuotationItem[]): Promise<jsPDF> {
  try {
    const language = (quotation.language || 'fr') as Language;
    const t = getTranslations(language);

    const warnings: string[] = [];

    if (quotation.study_title && quotation.study_title.length > 200) {
      warnings.push(`Titre de l'étude très long (${quotation.study_title.length} caractères). Vérifier l'affichage dans le PDF.`);
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const totalAmountStr = `${formatCurrency(totalAmount)} €`;
    if (totalAmountStr.length > 15) {
      warnings.push(`Montant total très élevé (${totalAmountStr}). Vérifier l'affichage dans le PDF.`);
    }

    items.forEach((item, index) => {
      if (item.description && item.description.length > 200) {
        warnings.push(`Item ${index + 1}: Description très longue (${item.description.length} caractères).`);
      }
    });

    if (warnings.length > 0) {
      console.warn('PDF Generation Warnings:', warnings);
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;

  let signatureImg = '';
  let logoImg = '';

  try {
    signatureImg = await loadImageAsBase64('/signature-sylvie.jpg');
    console.log('Signature loaded:', signatureImg ? `Yes (${signatureImg.length} bytes)` : 'No');
  } catch (error) {
    console.error('Failed to load signature image:', error);
  }

  try {
    logoImg = await loadImageAsBase64('/logo.png');
    console.log('Logo loaded:', logoImg ? `Yes (${logoImg.length} bytes)` : 'No');
  } catch (error) {
    console.error('Failed to load logo image:', error);
  }

  let yPos = margin;

  if (logoImg) {
    const logoWidth = 25;
    const logoHeight = 25;
    pdf.addImage(logoImg, 'PNG', margin, yPos, logoWidth, logoHeight);
    console.log('Logo added to PDF at position:', margin, yPos);
  } else {
    console.error('Logo image failed to load, skipping logo in PDF');
  }

  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('GREDECO', margin + 30, yPos + 13);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Groupe de Recherche et d\'Evaluation en Dermatologie et Cosmétologie', margin + 30, yPos + 20);

  pdf.setFontSize(8);
  const contactX = pageWidth - margin;
  pdf.text('45 bd Vincent Auriol', contactX, yPos + 5, { align: 'right' });
  pdf.text('75013 Paris', contactX, yPos + 9, { align: 'right' });
  pdf.text('01 45 86 58 82', contactX, yPos + 13, { align: 'right' });
  pdf.text('gredeco@gredeco.com', contactX, yPos + 17, { align: 'right' });

  yPos += 35;

  // Calculate box height dynamically based on client information and study title
  let boxHeight = 28; // Base height for Date, N° Devis, and "Client:" label
  let clientLineCount = 1; // customer_name
  if (quotation.customer_company && quotation.customer_company.trim()) clientLineCount++;
  if (quotation.customer_address && quotation.customer_address.trim()) clientLineCount++;
  if (quotation.postal_code || quotation.city || quotation.country) clientLineCount++;

  // Add 4mm per client line plus 5mm base padding
  boxHeight += (clientLineCount * 4) + 5;

  // Calculate estimated lines for study title if it exists
  if (quotation.study_title) {
    // Rough estimate: ~35 characters per line at font size 11
    const estimatedTitleLines = Math.ceil(quotation.study_title.length / 35);
    const titleHeight = (estimatedTitleLines * 4.5) + 12; // line spacing + padding
    boxHeight = Math.max(boxHeight, titleHeight);
  }

  // Ensure minimum height of 40mm
  boxHeight = Math.max(boxHeight, 40);

  // Left box (Date, N° Devis, Client)
  const leftBoxWidth = (pageWidth - 2 * margin - 5) / 2; // 5mm gap between boxes
  pdf.setFillColor(230, 235, 250);
  pdf.rect(margin, yPos, leftBoxWidth, boxHeight, 'F');

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(t.date, margin + 3, yPos + 6);
  pdf.setFont('helvetica', 'normal');
  const date = quotation.quotation_date
    ? new Date(quotation.quotation_date).toLocaleDateString('fr-FR')
    : new Date(quotation.created_at).toLocaleDateString('fr-FR');
  pdf.text(date, margin + 3, yPos + 11);

  pdf.setFont('helvetica', 'bold');
  pdf.text(t.quoteNumber, margin + 3, yPos + 17);
  pdf.setFont('helvetica', 'normal');
  pdf.text(quotation.quotation_number || 'N/A', margin + 3, yPos + 22);

  // Right box (Étude) - centered
  const rightBoxX = margin + leftBoxWidth + 5;
  const rightBoxWidth = leftBoxWidth;
  pdf.setFillColor(230, 235, 250);
  pdf.rect(rightBoxX, yPos, rightBoxWidth, boxHeight, 'F');

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  // Center the "Étude:" label horizontally
  const labelText = t.study;
  const labelWidth = pdf.getTextWidth(labelText);
  const labelX = rightBoxX + (rightBoxWidth - labelWidth) / 2;
  pdf.text(labelText, labelX, yPos + 6);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(30, 58, 138); // Blue color

  if (quotation.study_title) {
    const titleMaxWidth = rightBoxWidth - 6;
    const titleLines = wrapText(pdf, quotation.study_title.toUpperCase(), titleMaxWidth);

    // Start title below the "Étude:" label with proper spacing
    const lineSpacing = 4.5;
    const startY = yPos + 12; // Start after label (yPos + 6) + spacing

    let titleYPos = startY;
    titleLines.forEach((line) => {
      // Center each line horizontally within the right box
      const textWidth = pdf.getTextWidth(line);
      const centerX = rightBoxX + (rightBoxWidth - textWidth) / 2;
      pdf.text(line, centerX, titleYPos);
      titleYPos += lineSpacing;
    });
  } else {
    // If no study title, show placeholder centered below label
    const placeholderText = 'ÉTUDE';
    const textWidth = pdf.getTextWidth(placeholderText);
    const centerX = rightBoxX + (rightBoxWidth - textWidth) / 2;
    pdf.text(placeholderText, centerX, yPos + 14);
  }

  // Reset text color
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(9);

  // Client info in left box
  pdf.setFont('helvetica', 'bold');
  pdf.text(t.client, margin + 3, yPos + 28);
  pdf.setFont('helvetica', 'normal');
  let clientYPos = yPos + 33;
  pdf.text(quotation.customer_name || 'Client', margin + 3, clientYPos);
  clientYPos += 4;
  if (quotation.customer_company && quotation.customer_company.trim()) {
    pdf.text(quotation.customer_company, margin + 3, clientYPos);
    clientYPos += 4;
  }
  if (quotation.customer_address && quotation.customer_address.trim()) {
    pdf.setFontSize(8);
    pdf.text(quotation.customer_address, margin + 3, clientYPos);
    clientYPos += 4;
  }
  if (quotation.postal_code || quotation.city || quotation.country) {
    const locationParts = [quotation.postal_code, quotation.city, quotation.country].filter(Boolean);
    pdf.text(locationParts.join(', '), margin + 3, clientYPos);
  }
  pdf.setFontSize(9);

  yPos += boxHeight + 10;

  const hasStudyDesign = quotation.product_description || quotation.study_objectives || quotation.methodology ||
                          quotation.inclusion_criteria || quotation.exclusion_criteria || quotation.skin_types ||
                          quotation.number_of_volunteers || quotation.number_of_conditions;

  if (hasStudyDesign) {
    const isExVivo = quotation.study_type === 'ex_vivo';
    const designRows: Array<[string, string | string[]]> = [];

    if (quotation.product_description?.trim()) {
      designRows.push(['Produit:', quotation.product_description.trim()]);
    }
    if (quotation.study_objectives?.trim()) {
      designRows.push([t.studyObjectives, quotation.study_objectives.trim()]);
    }
    if (quotation.methodology?.trim()) {
      designRows.push(['Méthodologie:', quotation.methodology.trim()]);
    }
    if (quotation.number_of_volunteers && quotation.number_of_volunteers > 0) {
      designRows.push([
        isExVivo ? t.numberOfSkinFibroblast : t.numberOfPanelists,
        quotation.number_of_volunteers.toString()
      ]);
    }
    if (isExVivo && quotation.number_of_conditions && quotation.number_of_conditions > 0) {
      designRows.push(['Nombre de Conditions:', quotation.number_of_conditions.toString()]);
    }
    if (quotation.inclusion_criteria?.trim()) {
      designRows.push([t.inclusionCriteria, formatCriteriaLines(quotation.inclusion_criteria)]);
    }
    if (quotation.exclusion_criteria?.trim()) {
      designRows.push([t.exclusionCriteria, formatCriteriaLines(quotation.exclusion_criteria)]);
    }
    if (quotation.skin_types?.trim()) {
      const cleanedSkinTypes = Array.from(new Set(quotation.skin_types
        .split(',')
        .map((skinType: string) => skinType.trim().replace(/^Phototypes?\s*/i, ''))
        .filter((skinType: string) => skinType.length > 0)))
        .join(', ');
      designRows.push([t.skinTypes, cleanedSkinTypes]);
    }

    autoTable(pdf, {
      startY: yPos,
      head: [[{
        content: t.studyDesign,
        colSpan: 2,
        styles: {
          fillColor: [100, 130, 200],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 11,
          halign: 'left'
        }
      }]],
      body: designRows,
      theme: 'grid',
      margin: { left: margin, right: margin, top: margin, bottom: margin },
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        textColor: [0, 0, 0],
        cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
        lineColor: [100, 130, 200],
        lineWidth: 0.25,
        overflow: 'linebreak',
        valign: 'top'
      },
      columnStyles: {
        0: { cellWidth: 52, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      },
      headStyles: {
        fillColor: [100, 130, 200],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        fillColor: [255, 255, 255]
      },
      rowPageBreak: 'auto',
      showHead: 'everyPage'
    });

    const designTable = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
    yPos = (designTable?.finalY || yPos) + 8;
  }

  // Load all images first (in the order items are provided)
  const imagePromises = items.map(async (item) => {
    if (item.image_url) {
      try {
        const imgResult = await loadImageWithDimensions(item.image_url);
        return imgResult;
      } catch (error) {
        console.error('Failed to load image:', item.image_url, error);
        return { data: '', width: 0, height: 0 };
      }
    }
    return { data: '', width: 0, height: 0 };
  });

  let loadedImages: ImageWithDimensions[] = [];
  try {
    loadedImages = await Promise.all(imagePromises);
    console.log('All images loaded successfully:', loadedImages.filter(img => img.data).length, 'images');
  } catch (error) {
    console.error('Error loading images, continuing without images:', error);
    loadedImages = items.map(() => ({ data: '', width: 0, height: 0 }));
  }

  // Parse saved objectives data
  let savedObjectives: Array<{ id: string, name: string, timepoints: string[] }> = [];
  if (quotation.objectives_data) {
    try {
      savedObjectives = typeof quotation.objectives_data === 'string'
        ? JSON.parse(quotation.objectives_data)
        : quotation.objectives_data;
    } catch (error) {
      console.error('Failed to parse objectives_data:', error);
    }
  }

  const objectiveTimepointsMap = new Map<string, string[]>();
  savedObjectives.forEach(obj => {
    if (obj.name && obj.timepoints) {
      objectiveTimepointsMap.set(obj.name, obj.timepoints);
    }
  });

  const tableData: any[] = [];
  const imageData: { [key: number]: ImageWithDimensions } = {};

  let currentObjective: string | null = null;
  let mandatoryHeaderAdded = false;

  // Separate items into objective items and mandatory items
  // We need to maintain the relative order within each category
  const objectiveItems: any[] = [];
  const mandatoryItems: any[] = [];

  items.forEach((item, itemIndex) => {
    const isMandatory = !item.objective_name ||
        item.description?.includes('MANDATORY FOR ALL STUDIES') ||
        item.description?.includes('MANDATORY FOR CLINICAL TRIALS');

    const isRecruitmentObjective = item.objective_name?.toLowerCase().includes('recrutement') ||
                                   item.objective_name?.toLowerCase().includes('recruitment') ||
                                   item.objective_name?.toLowerCase().includes('panelist') ||
                                   item.objective_name?.toLowerCase().includes('panéliste');

    console.log(`Item ${itemIndex}: "${item.service_name || item.description?.substring(0, 50)}"`, {
      objective_name: item.objective_name,
      isMandatory,
      isRecruitmentObjective
    });

    // Consider recruitment as part of mandatory services since it's usually last
    if (isMandatory || isRecruitmentObjective) {
      mandatoryItems.push({ item, itemIndex });
    } else {
      objectiveItems.push({ item, itemIndex });
    }
  });

  // Process all objective items first (maintaining their order), then mandatory items
  const sortedItems = [...objectiveItems, ...mandatoryItems];

  console.log('========================================');
  console.log('PDF ITEM ORDERING SUMMARY');
  console.log('========================================');
  console.log('Total items:', items.length);
  console.log('Objective items (will appear FIRST):', objectiveItems.length);
  console.log('Mandatory items (will appear LAST):', mandatoryItems.length);
  console.log('');
  console.log('Order of items in PDF:');
  sortedItems.forEach(({ item }, idx) => {
    const type = !item.objective_name ? 'MANDATORY' : 'OBJECTIVE';
    console.log(`  ${idx + 1}. [${type}] ${item.service_name || item.description?.substring(0, 40)}`);
  });
  console.log('========================================');

  sortedItems.forEach(({ item, itemIndex }) => {
    const isMandatory = !item.objective_name ||
        item.description?.includes('MANDATORY FOR ALL STUDIES') ||
        item.description?.includes('MANDATORY FOR CLINICAL TRIALS');

    const isRecruitmentObjective = item.objective_name?.toLowerCase().includes('recrutement') ||
                                   item.objective_name?.toLowerCase().includes('recruitment') ||
                                   item.objective_name?.toLowerCase().includes('panelist') ||
                                   item.objective_name?.toLowerCase().includes('panéliste');

    if (isMandatory || isRecruitmentObjective) {
      // Add mandatory header if first mandatory item
      if (!mandatoryHeaderAdded) {
        if (currentObjective !== null) {
          // Reset current objective when switching to mandatory section
          currentObjective = null;
        }

        // Add separator header for mandatory services
        tableData.push([
          {
            content: t.mandatoryServices,
            colSpan: 5,
            styles: { fillColor: [220, 230, 250], fontStyle: 'bold', fontSize: 9 }
          }
        ]);

        // Check if Indemnisation is present in any items
        const hasIndemnisation = items.some(i =>
          (i.service_name || i.description || '').toLowerCase().includes('indemnisation')
        );

        // If Indemnisation is not present, add "Fournis par le client" row
        if (!hasIndemnisation) {
          tableData.push([
            t.panelistsCompensationProvidedByClient,
            '-',
            '-',
            '-',
            '-'
          ]);
        }

        mandatoryHeaderAdded = true;
      }
    } else if (item.objective_name && item.objective_name !== currentObjective) {
      // Add objective header
      currentObjective = item.objective_name;

      tableData.push([
        {
          content: `${t.objective} ${item.description?.match(/OBJECTIF\s+(\d+)/)?.[1] || ''}: ${item.objective_name.toUpperCase()}`,
          colSpan: 5,
          styles: { fillColor: [220, 230, 250], fontStyle: 'bold', fontSize: 9 }
        }
      ]);

      // Add timepoints row
      const objectiveTimepoints = objectiveTimepointsMap.get(item.objective_name);
      const timepointsDisplay = objectiveTimepoints && objectiveTimepoints.length > 0
        ? sortTimepoints(objectiveTimepoints).join(', ')
        : item.objective_timepoints || '';

      if (timepointsDisplay) {
        tableData.push([
          {
            content: `${t.measurementTimeDuration} ${timepointsDisplay}`,
            colSpan: 5,
            styles: { fillColor: [240, 245, 255], fontStyle: 'italic', fontSize: 8 }
          }
        ]);
      }
    }

    // Add the item row
    // Use service_name if available, otherwise fallback to description
    let cleanDesc = (item.service_name || item.description || '').trim();

    // Clean up description only if service_name is not present
    if (!item.service_name && item.description) {
      cleanDesc = cleanDesc.replace(/\s*\(Objective:.*?\)/g, '').replace(/\s*\(Objectif:.*?\)/g, '');
      cleanDesc = cleanDesc.replace(/\s*-?\s*MANDATORY FOR ALL STUDIES/gi, '');
      cleanDesc = cleanDesc.replace(/\s*-?\s*MANDATORY FOR CLINICAL TRIALS/gi, '');
      cleanDesc = cleanDesc.replace(/\s*-?\s*MANDATORY FOR LABORATORY TRIALS/gi, '');
      cleanDesc = cleanDesc.replace(/\|\s*Claims:.*$/gi, '');
      cleanDesc = cleanDesc.replace(/\(TVA:\s*[\d.]+\)/gi, '');
      cleanDesc = cleanDesc.trim();
    }

    // Normalize text for better PDF rendering and fix common issues
    cleanDesc = cleanDesc.normalize('NFC');
    // Fix double "de" (e.g., "Test de d'homogénéité" -> "Test d'homogénéité")
    cleanDesc = cleanDesc.replace(/\bde\s+d'/gi, "d'");
    // Remove any zero-width spaces, invisible characters, and extra whitespace
    cleanDesc = cleanDesc.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '');
    // Replace multiple spaces with single space
    cleanDesc = cleanDesc.replace(/\s+/g, ' ').trim();

    const globalDiscount = quotation.global_discount_percent || 0;
    const totalDiscount = (item.discount_percent || 0) + globalDiscount;

    if (totalDiscount > 0) {
      cleanDesc += ` (Remise: ${totalDiscount}%`;
      if (item.discount_percent > 0 && globalDiscount > 0) {
        cleanDesc += ` = ${item.discount_percent}% + ${globalDiscount}% globale`;
      }
      cleanDesc += ')';
    }

    const adjustedUnitPrice = (item.unit_price || 0) * (1 - totalDiscount / 100);
    const adjustedAmountHT = adjustedUnitPrice * item.quantity;

    const rowIndex = tableData.length;
    const imgResult = loadedImages[itemIndex];
    console.log(`Item ${itemIndex}: rowIndex=${rowIndex}, hasImage=${!!imgResult?.data}, imageLength=${imgResult?.data?.length || 0}`);
    if (imgResult && imgResult.data) {
      imageData[rowIndex] = imgResult;
      console.log(`  → Mapped image to row ${rowIndex}`);
    }

    tableData.push([
      cleanDesc,
      item.quantity || '',
      `${formatCurrency(adjustedUnitPrice)} €`,
      `${formatCurrency(adjustedAmountHT)} €`,
      `${item.vat_percent || 20}%`
    ]);
  });


  console.log('=== FINAL IMAGE MAPPING ===');
  console.log('ImageData keys:', Object.keys(imageData));
  Object.keys(imageData).forEach(k => {
    console.log(`  Row ${k}: ${imageData[parseInt(k)].substring(0, 60)}...`);
  });
  console.log('Total tableData rows:', tableData.length);

  const globalDiscount = quotation.global_discount_percent || 0;
  const subtotal = items.reduce((sum, item) => {
    const totalDiscount = (item.discount_percent || 0) + globalDiscount;
    const adjustedUnitPrice = (item.unit_price || 0) * (1 - totalDiscount / 100);
    const adjustedAmountHT = adjustedUnitPrice * item.quantity;
    return sum + adjustedAmountHT;
  }, 0);
  const totalVAT = items.reduce((sum, item) => {
    const totalDiscount = (item.discount_percent || 0) + globalDiscount;
    const adjustedUnitPrice = (item.unit_price || 0) * (1 - totalDiscount / 100);
    const adjustedAmountHT = adjustedUnitPrice * item.quantity;
    const vatAmount = adjustedAmountHT * (item.vat_percent || 20) / 100;
    return sum + vatAmount;
  }, 0);
  const totalTTC = subtotal + totalVAT;

  autoTable(pdf, {
    startY: yPos,
    head: [[
      { content: t.description, styles: { halign: 'left' } },
      t.unit,
      t.unitPriceExclTax,
      t.totalPriceExclTax,
      t.vat
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      font: 'helvetica',
      fontStyle: 'normal',
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      overflow: 'linebreak',
      halign: 'left',
      valign: 'top',
      minCellHeight: 10
    },
    headStyles: {
      fillColor: [200, 210, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 100, overflow: 'linebreak', valign: 'top', font: 'helvetica', fontStyle: 'bold', fontSize: 9, minCellHeight: 10 },
      1: { cellWidth: 16, halign: 'center', valign: 'middle' },
      2: { cellWidth: 25, halign: 'right', valign: 'middle' },
      3: { cellWidth: 25, halign: 'right', valign: 'middle' },
      4: { cellWidth: 16, halign: 'center', valign: 'middle' }
    },
    margin: { left: margin, right: margin },
    showHead: 'everyPage',
    rowPageBreak: 'auto',
    didParseCell: (data: any) => {
      // Ensure text content is properly normalized
      if (data.cell.raw && typeof data.cell.raw === 'string') {
        data.cell.text = [data.cell.raw.normalize('NFC')];
      }

      // Log all body rows to understand indexing
      if (data.section === 'body' && data.column.index === 0) {
        console.log(`Parse row ${data.row.index}: colSpan=${data.cell.colSpan}, text="${data.cell.text[0]?.substring(0, 30)}..."`);
      }

      // Adjust cell height if image is present
      if (data.column.index === 0 && data.section === 'body') {
        const imgData = imageData[data.row.index];
        if (imgData && imgData.data) {
          // Calculate required height based on text lines
          const lineHeight = 3.5;
          const textHeight = data.cell.text.length * lineHeight;
          const imageHeight = 30;
          const padding = 10;
          const requiredHeight = textHeight + imageHeight + padding;

          // Set minimum height to accommodate text + image + padding
          data.cell.styles.minCellHeight = Math.max(40, requiredHeight);
          console.log(`Cell ${data.row.index}: ${data.cell.text.length} lines, setting minHeight to ${data.cell.styles.minCellHeight}`);
        }
      }
    },
    didDrawCell: (data: any) => {
      // Draw images in the first column if available
      if (data.column.index === 0 && data.section === 'body') {
        const imgData = imageData[data.row.index];
        console.log(`Drawing row ${data.row.index}: hasImage=${!!imgData?.data}, cellHeight=${data.cell.height}, textLines=${data.cell.text.length}, text="${data.cell.text[0]?.substring(0, 30)}..."`);
        if (imgData && imgData.data) {
          console.log(`  → Found image for row ${data.row.index}, length=${imgData.data.length}`);

          const cellX = data.cell.x;
          const cellY = data.cell.y;
          const cellWidth = data.cell.width;
          const cellHeight = data.cell.height;

          // Calculate text height (each line is approximately 3.5-4mm in height with fontSize 9)
          const lineHeight = 3.5;
          const textHeight = data.cell.text.length * lineHeight;
          const imageY = cellY + textHeight + 3;

          // Image dimensions - preserve aspect ratio
          const maxImageHeight = Math.min(30, cellHeight - textHeight - 6);
          const maxImageWidth = cellWidth - 6;

          let drawWidth = maxImageWidth;
          let drawHeight = maxImageHeight;

          if (imgData.width > 0 && imgData.height > 0) {
            const aspectRatio = imgData.width / imgData.height;
            // Fit image within the bounding box while preserving aspect ratio
            if (maxImageWidth / maxImageHeight > aspectRatio) {
              // Height is the limiting factor
              drawHeight = maxImageHeight;
              drawWidth = drawHeight * aspectRatio;
            } else {
              // Width is the limiting factor
              drawWidth = maxImageWidth;
              drawHeight = drawWidth / aspectRatio;
            }
          }

          // Center the image horizontally within the cell
          const imageX = cellX + 3 + (maxImageWidth - drawWidth) / 2;

          console.log(`  → Image size: ${drawWidth}x${drawHeight} (aspect-ratio preserved), at position (${imageX}, ${imageY})`);

          if (drawHeight > 5) {
            try {
              pdf.addImage(imgData.data, 'PNG', imageX, imageY, drawWidth, drawHeight, undefined, 'FAST');
              console.log('  → Image added successfully');
            } catch (error) {
              console.error('Error adding image to PDF:', error);
            }
          } else {
            console.log('  → Image skipped (drawHeight too small)');
          }
        }
      }
    },
    didDrawPage: (data: any) => {
      yPos = data.cursor?.y || yPos;
    }
  });

  yPos += 8;

  const totalsBoxWidth = 85;
  const totalsBoxHeight = 36;
  const totalsBoxX = pageWidth - totalsBoxWidth - margin;

  if (yPos + totalsBoxHeight > pageHeight - margin) {
    pdf.addPage();
    yPos = margin;
  }

  pdf.setDrawColor(100, 130, 200);
  pdf.setLineWidth(0.3);
  pdf.setFillColor(245, 248, 255);
  pdf.rect(totalsBoxX, yPos, totalsBoxWidth, totalsBoxHeight, 'FD');

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(t.totalExclTax, totalsBoxX + 5, yPos + 7);
  pdf.text(`${formatCurrency(subtotal)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 7, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.text(t.totalVat, totalsBoxX + 5, yPos + 14);
  pdf.text(`${formatCurrency(totalVAT)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 14, { align: 'right' });

  pdf.setDrawColor(100, 130, 200);
  pdf.setLineWidth(0.2);
  pdf.line(totalsBoxX + 5, yPos + 18, totalsBoxX + totalsBoxWidth - 5, yPos + 18);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setFillColor(100, 130, 200);
  pdf.setTextColor(100, 130, 200);
  pdf.text(t.totalInclTax, totalsBoxX + 5, yPos + 27);
  pdf.text(`${formatCurrency(totalTTC)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 27, { align: 'right' });
  pdf.setTextColor(0, 0, 0);

  yPos += 40;

  if (yPos + 10 > pageHeight - margin) {
    pdf.addPage();
    yPos = margin;
  }

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.text(t.taxCreditText, margin, yPos);

  yPos += 15;

  const spaceNeeded = 60;
  if (yPos + spaceNeeded > pageHeight - margin) {
    pdf.addPage();
    yPos = margin;
  }

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  const signatureBoxWidth = 85;
  const signatureAreaHeight = 35;
  const leftSignatureX = margin;
  const rightSignatureX = pageWidth - margin - signatureBoxWidth;

  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.5);
  pdf.rect(leftSignatureX, yPos, signatureBoxWidth, signatureAreaHeight, 'S');

  pdf.setTextColor(0, 0, 0);
  pdf.text(t.agreementForApproval, leftSignatureX + 3, yPos + 6);

  pdf.rect(rightSignatureX, yPos, signatureBoxWidth, signatureAreaHeight, 'S');
  pdf.text(t.agreementForApproval, rightSignatureX + 3, yPos + 6);

  yPos += 10;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(t.investigatorSignature, leftSignatureX + 3, yPos);
  pdf.text(t.promoterSignature, rightSignatureX + 3, yPos);

  yPos += 4;

  if (signatureImg) {
    pdf.addImage(signatureImg, 'JPEG', leftSignatureX + 3, yPos, 30, 15);
  }

  yPos += 18;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Dr Sylvie BOISNIC', leftSignatureX + 3, yPos);

  const signatureLineY = yPos - 18;
  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.3);
  pdf.line(rightSignatureX + 3, signatureLineY + 15, rightSignatureX + signatureBoxWidth - 3, signatureLineY + 15);

  yPos += 8;

  if (yPos + 45 > pageHeight - margin) {
    pdf.addPage();
    yPos = margin;
  }

  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, yPos, 85, 40, 'F');
  pdf.rect(rightSignatureX, yPos, 85, 40, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.text(t.bankingInformation, margin + 2, yPos + 5);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(t.bankAccount, margin + 2, yPos + 10);
  pdf.text('N° IBAN: FR76 1830 6002 3236 1380 7752 124', margin + 2, yPos + 15);
  pdf.text('BIC: AGRIFRPP883', margin + 2, yPos + 20);
  pdf.text('SIRET 392 221 230 00023', margin + 2, yPos + 25);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text(t.contact, rightSignatureX + 2, yPos + 5);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('Dr Sylvie BOISNIC', rightSignatureX + 2, yPos + 10);
  pdf.text('45 bd Vincent Auriol', rightSignatureX + 2, yPos + 15);
  pdf.text('75013 Paris', rightSignatureX + 2, yPos + 20);
  pdf.text('01 45 86 58 82', rightSignatureX + 2, yPos + 25);
  pdf.text('gredeco@gredeco.com', rightSignatureX + 2, yPos + 30);

  pdf.addPage();

  yPos = margin;

  pdf.setFillColor(230, 235, 250);
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(t.termsAndConditionsTitle, margin + 3, yPos + 5);

  yPos += 15;

  const cgv = t.termsAndConditions;

  pdf.setFontSize(8);
  cgv.forEach((article) => {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      yPos = margin;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.text(article.title, margin, yPos);
    yPos += 5;

    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(article.text, pageWidth - 2 * margin);
    pdf.text(lines, margin, yPos);
    yPos += lines.length * 4 + 3;
  });

    return pdf;
  } catch (error) {
    console.error('Error in generateQuotationPDF:', error);
    throw error;
  }
}
