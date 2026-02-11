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
    // T0 always comes first
    if (timepoint === 'T0') return 0;

    // Remove the 'T' prefix and work with uppercase for consistency
    const value = timepoint.substring(1).toUpperCase();

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

const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    // Note: crossOrigin removed as CloudFront doesn't provide CORS headers
    // Images are public and can be loaded without CORS
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

    console.log('PDF Generation - Quotation data:', {
      language,
      study_objectives: quotation.study_objectives,
      product_description: quotation.product_description,
      inclusion_criteria: quotation.inclusion_criteria,
      exclusion_criteria: quotation.exclusion_criteria,
      skin_types: quotation.skin_types
    });

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

  const signatureImg = await loadImageAsBase64('/signature-sylvie.jpg');
  const logoImg = await loadImageAsBase64('/logo%20copy.png');

  let yPos = margin;

  if (logoImg) {
    const logoWidth = 25;
    const logoHeight = 25;
    pdf.addImage(logoImg, 'PNG', margin, yPos, logoWidth, logoHeight);
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
  pdf.text(t.study, rightBoxX + 3, yPos + 6);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(30, 58, 138); // Blue color

  if (quotation.study_title) {
    const titleMaxWidth = rightBoxWidth - 6;
    const titleLines = wrapText(pdf, quotation.study_title.toUpperCase(), titleMaxWidth);

    // Calculate vertical centering
    const lineSpacing = 4.5;
    const totalTextHeight = titleLines.length * lineSpacing;
    const startY = yPos + (boxHeight - totalTextHeight) / 2 + 3;

    let titleYPos = startY;
    titleLines.forEach((line) => {
      // Center each line horizontally within the right box
      const textWidth = pdf.getTextWidth(line);
      const centerX = rightBoxX + (rightBoxWidth - textWidth) / 2;
      pdf.text(line, centerX, titleYPos);
      titleYPos += lineSpacing;
    });
  } else {
    // If no study title, show placeholder centered
    const placeholderText = 'ÉTUDE';
    const textWidth = pdf.getTextWidth(placeholderText);
    const centerX = rightBoxX + (rightBoxWidth - textWidth) / 2;
    const centerY = yPos + boxHeight / 2;
    pdf.text(placeholderText, centerX, centerY);
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
    pdf.setFillColor(255, 255, 255);
    let designHeight = 12;
    const lineHeight = 5;
    const labelWidth = 65;
    const contentWidth = pageWidth - 2 * margin - labelWidth - 8;
    const padding = 5;

    pdf.setFontSize(9);

    // Check study type to determine if ex vivo or in vivo
    const isExVivo = quotation.study_type === 'ex_vivo';

    if (quotation.product_description) {
      const lines = pdf.splitTextToSize(quotation.product_description, contentWidth);
      designHeight += Math.max(lines.length * lineHeight, 6) + 1;
    }
    if (quotation.study_objectives) {
      const lines = pdf.splitTextToSize(quotation.study_objectives, contentWidth);
      designHeight += Math.max(lines.length * lineHeight, 6) + 1;
    }
    if (quotation.methodology) {
      const lines = pdf.splitTextToSize(quotation.methodology, contentWidth);
      designHeight += Math.max(lines.length * lineHeight, 6) + 1;
    }

    // Add study parameters section (panelists/peau and conditions)
    if (quotation.number_of_volunteers && quotation.number_of_volunteers > 0) {
      designHeight += 6 + 1;
    }
    if (isExVivo && quotation.number_of_conditions && quotation.number_of_conditions > 0) {
      designHeight += 6 + 1;
    }

    if (quotation.inclusion_criteria) {
      const lines = pdf.splitTextToSize(quotation.inclusion_criteria, contentWidth);
      designHeight += Math.max(lines.length * lineHeight, 6) + 1;
    }
    if (quotation.exclusion_criteria) {
      const lines = pdf.splitTextToSize(quotation.exclusion_criteria, contentWidth);
      designHeight += Math.max(lines.length * lineHeight, 6) + 1;
    }
    if (quotation.skin_types) {
      const lines = pdf.splitTextToSize(quotation.skin_types, contentWidth);
      designHeight += Math.max(lines.length * lineHeight, 6) + 1;
    }

    designHeight += padding;

    pdf.setDrawColor(100, 130, 200);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, designHeight, 'S');

    pdf.setFillColor(100, 130, 200);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 11, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    let designY = yPos + 7;
    pdf.text(t.studyDesign, margin + padding, designY);
    designY += 8;

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);

    if (quotation.product_description) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Produit:', margin + padding, designY);
      pdf.setFont('helvetica', 'normal');
      const productLines = pdf.splitTextToSize(quotation.product_description, contentWidth);
      pdf.text(productLines, margin + labelWidth, designY);
      designY += Math.max(productLines.length * lineHeight, 6) + 1;
    }

    if (quotation.study_objectives) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(t.studyObjectives, margin + padding, designY);
      pdf.setFont('helvetica', 'normal');
      const objLines = pdf.splitTextToSize(quotation.study_objectives, contentWidth);
      pdf.text(objLines, margin + labelWidth, designY);
      designY += Math.max(objLines.length * lineHeight, 6) + 1;
    }

    if (quotation.methodology) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Méthodologie:', margin + padding, designY);
      pdf.setFont('helvetica', 'normal');
      const methLines = pdf.splitTextToSize(quotation.methodology, contentWidth);
      pdf.text(methLines, margin + labelWidth, designY);
      designY += Math.max(methLines.length * lineHeight, 6) + 1;
    }

    // Add study parameters (panelists/peau and conditions)
    if (quotation.number_of_volunteers && quotation.number_of_volunteers > 0) {
      pdf.setFont('helvetica', 'bold');
      const label = isExVivo ? t.numberOfSkinFibroblast : t.numberOfPanelists;
      pdf.text(label, margin + padding, designY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(quotation.number_of_volunteers.toString(), margin + labelWidth, designY);
      designY += 6 + 1;
    }

    if (isExVivo && quotation.number_of_conditions && quotation.number_of_conditions > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Nombre de Conditions:', margin + padding, designY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(quotation.number_of_conditions.toString(), margin + labelWidth, designY);
      designY += 6 + 1;
    }

    if (quotation.inclusion_criteria) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Critères d\'Inclusion:', margin + padding, designY);
      pdf.setFont('helvetica', 'normal');
      const incLines = pdf.splitTextToSize(quotation.inclusion_criteria, contentWidth);
      pdf.text(incLines, margin + labelWidth, designY);
      designY += Math.max(incLines.length * lineHeight, 6) + 1;
    }

    if (quotation.exclusion_criteria) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Critères d\'Exclusion:', margin + padding, designY);
      pdf.setFont('helvetica', 'normal');
      const excLines = pdf.splitTextToSize(quotation.exclusion_criteria, contentWidth);
      pdf.text(excLines, margin + labelWidth, designY);
      designY += Math.max(excLines.length * lineHeight, 6) + 1;
    }

    if (quotation.skin_types) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Types de Peau (Phototypes):', margin + padding, designY);
      pdf.setFont('helvetica', 'normal');
      // Clean up skin types by removing "Phototype" or "Phototypes" prefix and duplicates
      const cleanedSkinTypes = Array.from(new Set(quotation.skin_types
        .split(',')
        .map((s: string) => s.trim())
        .map((s: string) => s.replace(/^Phototypes?\s*/i, ''))
        .filter((s: string) => s.length > 0)))
        .join(', ');
      const skinLines = pdf.splitTextToSize(cleanedSkinTypes, contentWidth);
      pdf.text(skinLines, margin + labelWidth, designY);
      designY += Math.max(skinLines.length * lineHeight, 6) + 1;
    }

    yPos = yPos + designHeight + 8;
  }

  const { objectiveGroups, mandatoryItems } = groupItemsByObjective(items, quotation);

  const tableData: any[] = [];
  const imageData: { [key: number]: string } = {};

  // Load all images first
  const allItems = [...objectiveGroups.flatMap(g => g.items), ...mandatoryItems];
  const imagePromises = allItems.map(async (item) => {
    if (item.image_url) {
      try {
        return await loadImageAsBase64(item.image_url);
      } catch (error) {
        console.error('Failed to load image:', item.image_url, error);
        return '';
      }
    }
    return '';
  });

  const loadedImages = await Promise.all(imagePromises);
  console.log('=== IMAGE LOADING DEBUG (v3) ===');
  console.log('Total items with images:', imagePromises.length);
  console.log('Loaded images count:', loadedImages.filter(img => img).length, 'out of', loadedImages.length);
  loadedImages.forEach((img, idx) => {
    console.log(`  Image ${idx}: loaded=${!!img}, length=${img ? img.length : 0}`);
  });
  let imageIndex = 0;

  // Add objectives first
  objectiveGroups.forEach((group) => {
    tableData.push([
      {
        content: `${t.objective} ${group.items[0]?.description?.match(/OBJECTIF\s+(\d+)/)?.[1] || ''}: ${group.name.toUpperCase()}`,
        colSpan: 5,
        styles: { fillColor: [220, 230, 250], fontStyle: 'bold', fontSize: 9 }
      }
    ]);

    if (group.timepoints) {
      tableData.push([
        {
          content: `${t.measurementTimeDuration} ${group.timepoints}`,
          colSpan: 5,
          styles: { fillColor: [240, 245, 255], fontStyle: 'italic', fontSize: 8 }
        }
      ]);
    }

    group.items.forEach(item => {
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
      const imgData = loadedImages[imageIndex];
      console.log(`Objective item ${imageIndex}: rowIndex=${rowIndex}, hasImage=${!!imgData}, imageLength=${imgData?.length || 0}`);
      if (imgData) {
        imageData[rowIndex] = imgData;
        console.log(`  → Mapped image to row ${rowIndex}`);
      }
      imageIndex++;

      tableData.push([
        cleanDesc,
        item.quantity || '',
        `${formatCurrency(adjustedUnitPrice)} €`,
        `${formatCurrency(adjustedAmountHT)} €`,
        `${item.vat_percent || 20}%`
      ]);
    });
  });

  // Add mandatory items at the end
  if (mandatoryItems.length > 0 || !items.some(item =>
    (item.service_name || item.description || '').toLowerCase().includes('indemnisation')
  )) {
    // Add a separator header for mandatory services
    tableData.push([
      {
        content: t.mandatoryServices,
        colSpan: 5,
        styles: { fillColor: [220, 230, 250], fontStyle: 'bold', fontSize: 9 }
      }
    ]);

    // Check if Indemnisation is present in any items (mandatory or not)
    const hasIndemnisation = items.some(item =>
      (item.service_name || item.description || '').toLowerCase().includes('indemnisation')
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

    mandatoryItems.forEach(item => {
      // Use service_name if available, otherwise fallback to description
      let cleanDesc = (item.service_name || item.description || '').trim();

      // Clean up description only if service_name is not present
      if (!item.service_name && item.description) {
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
      const imgData = loadedImages[imageIndex];
      console.log(`Mandatory item ${imageIndex}: rowIndex=${rowIndex}, hasImage=${!!imgData}, imageLength=${imgData?.length || 0}`);
      if (imgData) {
        imageData[rowIndex] = imgData;
        console.log(`  → Mapped image to row ${rowIndex}`);
      }
      imageIndex++;

      tableData.push([
        cleanDesc,
        item.quantity || '',
        `${formatCurrency(adjustedUnitPrice)} €`,
        `${formatCurrency(adjustedAmountHT)} €`,
        `${item.vat_percent || 20}%`
      ]);
    });
  }

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
        if (imgData) {
          // Calculate required height based on text lines
          const lineHeight = 3.5;
          const textHeight = data.cell.text.length * lineHeight;
          const imageHeight = 25;
          const padding = 10;
          const requiredHeight = textHeight + imageHeight + padding;

          // Set minimum height to accommodate text + image + padding
          data.cell.styles.minCellHeight = Math.max(35, requiredHeight);
          console.log(`Cell ${data.row.index}: ${data.cell.text.length} lines, setting minHeight to ${data.cell.styles.minCellHeight}`);
        }
      }
    },
    didDrawCell: (data: any) => {
      // Draw images in the first column if available
      if (data.column.index === 0 && data.section === 'body') {
        const imgData = imageData[data.row.index];
        console.log(`Drawing row ${data.row.index}: hasImage=${!!imgData}, cellHeight=${data.cell.height}, textLines=${data.cell.text.length}, text="${data.cell.text[0]?.substring(0, 30)}..."`);
        if (imgData) {
          console.log(`  → Found image for row ${data.row.index}, length=${imgData.length}`);

          const cellX = data.cell.x;
          const cellY = data.cell.y;
          const cellWidth = data.cell.width;
          const cellHeight = data.cell.height;

          // Calculate text height (each line is approximately 3.5-4mm in height with fontSize 9)
          const lineHeight = 3.5;
          const textHeight = data.cell.text.length * lineHeight;
          const imageY = cellY + textHeight + 3;

          // Image dimensions
          const maxImageHeight = Math.min(25, cellHeight - textHeight - 6);
          const maxImageWidth = cellWidth - 6;

          console.log(`  → Image size: ${maxImageWidth}x${maxImageHeight}, at position (${cellX + 3}, ${imageY})`);

          if (maxImageHeight > 5) {
            try {
              pdf.addImage(imgData, 'PNG', cellX + 3, imageY, maxImageWidth, maxImageHeight, undefined, 'FAST');
              console.log('  → Image added successfully');
            } catch (error) {
              console.error('Error adding image to PDF:', error);
            }
          } else {
            console.log('  → Image skipped (maxImageHeight too small)');
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
