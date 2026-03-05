import * as XLSX from 'xlsx';
import { Quotation, QuotationItem } from '../lib/supabase';

interface ExcelExportData {
  quotation: Quotation;
  items: QuotationItem[];
}

export function generateExcelFromQuotation({ quotation, items }: ExcelExportData): void {
  const workbook = XLSX.utils.book_new();

  // Single sheet with all information
  const allData: any[][] = [
    // Header section
    ['INFORMATIONS DU DEVIS'],
    [''],
    ['Devis', quotation.quotation_number || ''],
    ['Date', quotation.quotation_date || ''],
    ['Étude', quotation.study_name || ''],
    ['Client', quotation.customer_name || ''],
    ['Société', quotation.customer_company || ''],
    ['Adresse', quotation.customer_address || ''],
    ['Code Postal', quotation.customer_postal_code || ''],
    ['Ville', quotation.customer_city || ''],
    ['Pays', quotation.customer_country || ''],
    ['Email', Array.isArray(quotation.customer_email) ? quotation.customer_email.join(', ') : quotation.customer_email || ''],
    ['Langue', quotation.language || 'fr'],
    [''],
    ['DÉTAILS DE L\'ÉTUDE'],
    [''],
    ['Méthodologie', quotation.methodology || quotation.notes || ''],
    [''],
    ['Critères d\'Inclusion', quotation.inclusion_criteria || ''],
    ['Critères d\'Exclusion', quotation.exclusion_criteria || ''],
    [''],
    ['Nombre de Panélistes', quotation.number_of_panelists || quotation.number_of_volunteers || ''],
    ['Type d\'étude', quotation.study_type || ''],
    ['Nombre de Conditions', quotation.number_of_conditions || ''],
    ['Phototypes', Array.isArray(quotation.skin_types) ? quotation.skin_types.join(', ') : quotation.skin_types || ''],
    ['Points de Mesure', quotation.timepoints || ''],
    [''],
    ['Remise Globale (%)', quotation.global_discount_percent || 0],
    [''],
  ];

  // Add study objectives
  if (quotation.study_objectives) {
    allData.push(['OBJECTIFS DE L\'ÉTUDE']);
    allData.push(['']);
    if (typeof quotation.study_objectives === 'string') {
      const objectivesArray = quotation.study_objectives.split(',').map(o => o.trim()).filter(o => o);
      objectivesArray.forEach((obj: string, index: number) => {
        allData.push([`Objectif ${index + 1}`, obj]);
      });
    } else if (Array.isArray(quotation.study_objectives)) {
      quotation.study_objectives.forEach((obj: string, index: number) => {
        allData.push([`Objectif ${index + 1}`, obj]);
      });
    }
    allData.push(['']);
  }

  // Add objectives details with timepoints if available
  if (quotation.objectives_data) {
    try {
      let parsedObjectives: any[] = [];
      if (typeof quotation.objectives_data === 'string') {
        parsedObjectives = JSON.parse(quotation.objectives_data);
      } else if (Array.isArray(quotation.objectives_data)) {
        parsedObjectives = quotation.objectives_data;
      } else if (typeof quotation.objectives_data === 'object') {
        parsedObjectives = Object.entries(quotation.objectives_data).map(([name, data]: [string, any]) => ({
          name,
          timepoints: data?.timepoints || []
        }));
      }

      if (parsedObjectives.length > 0) {
        allData.push(['DÉTAILS DES OBJECTIFS']);
        allData.push(['Objectif', 'Points de Mesure']);
        parsedObjectives.forEach((obj: any) => {
          if (obj && obj.name) {
            const timepoints = Array.isArray(obj.timepoints) ? obj.timepoints.join(', ') : obj.timepoints || '';
            allData.push([obj.name, timepoints]);
          }
        });
        allData.push(['']);
      }
    } catch (e) {
      console.error('Error parsing objectives_data for Excel export:', e);
    }
  }

  // Services section
  allData.push(['SERVICES ET PRESTATIONS']);
  allData.push(['']);
  allData.push(['Description', 'Quantité', 'Prix Unitaire HT', 'TVA (%)', 'Objectif', 'Ordre']);

  items.forEach((item) => {
    // Use service_name if available, otherwise fallback to description
    // Clean up the description by removing MANDATORY tags
    let cleanDescription = item.service_name || item.description || '';
    if (!item.service_name && item.description) {
      cleanDescription = item.description
        .replace(/\s*-?\s*MANDATORY FOR ALL STUDIES/gi, '')
        .replace(/\s*-?\s*MANDATORY FOR CLINICAL TRIALS/gi, '')
        .replace(/\s*-?\s*MANDATORY FOR LABORATORY TRIALS/gi, '')
        .trim();
    }

    allData.push([
      cleanDescription,
      item.quantity || 0,
      item.unit_price || 0,
      item.tva_percent || 20,
      item.objective_name || '',
      item.order_index || 0
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(allData);

  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 30 },  // Column A - Labels/Description
    { wch: 15 },  // Column B - Values/Quantité
    { wch: 20 },  // Column C - Prix Unitaire HT
    { wch: 10 },  // Column D - TVA
    { wch: 40 },  // Column E - Objectif
    { wch: 10 }   // Column F - Ordre
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Devis Complet');

  // Generate filename
  const filename = `${quotation.quotation_number || 'devis'}_${quotation.customer_company || 'client'}_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Save file
  XLSX.writeFile(workbook, filename);
}

export function downloadQuotationAsExcel(quotation: Quotation, items: QuotationItem[]): void {
  generateExcelFromQuotation({ quotation, items });
}
