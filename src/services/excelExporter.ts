import * as XLSX from 'xlsx';
import { Quotation, QuotationItem } from '../lib/supabase';

interface ExcelExportData {
  quotation: Quotation;
  items: QuotationItem[];
}

export function generateExcelFromQuotation({ quotation, items }: ExcelExportData): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Quotation Info
  const quotationData = [
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
    ['Objectifs de l\'étude', ''],
  ];

  // Add study objectives
  if (quotation.study_objectives) {
    if (typeof quotation.study_objectives === 'string') {
      const objectivesArray = quotation.study_objectives.split(',').map(o => o.trim()).filter(o => o);
      objectivesArray.forEach((obj: string, index: number) => {
        quotationData.push([`Objectif ${index + 1}`, obj]);
      });
    } else if (Array.isArray(quotation.study_objectives)) {
      quotation.study_objectives.forEach((obj: string, index: number) => {
        quotationData.push([`Objectif ${index + 1}`, obj]);
      });
    }
  }

  const quotationSheet = XLSX.utils.aoa_to_sheet(quotationData);
  XLSX.utils.book_append_sheet(workbook, quotationSheet, 'Informations');

  // Sheet 2: Items/Services
  const itemsData: any[][] = [
    ['Description', 'Quantité', 'Prix Unitaire HT', 'TVA (%)', 'Objectif', 'Ordre']
  ];

  items.forEach((item) => {
    itemsData.push([
      item.description || '',
      item.quantity || 0,
      item.unit_price || 0,
      item.tva_percent || 20,
      item.objective_name || '',
      item.order_index || 0
    ]);
  });

  const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
  XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Services');

  // Sheet 3: Objectives Details with timepoints (if available)
  if (quotation.objectives_data) {
    try {
      const objectivesData: any[][] = [
        ['Objectif', 'Points de Mesure']
      ];

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

      parsedObjectives.forEach((obj: any) => {
        if (obj && obj.name) {
          const timepoints = Array.isArray(obj.timepoints) ? obj.timepoints.join(', ') : obj.timepoints || '';
          objectivesData.push([
            obj.name,
            timepoints
          ]);
        }
      });

      if (objectivesData.length > 1) {
        const objectivesSheet = XLSX.utils.aoa_to_sheet(objectivesData);
        XLSX.utils.book_append_sheet(workbook, objectivesSheet, 'Objectifs Détails');
      }
    } catch (e) {
      console.error('Error parsing objectives_data for Excel export:', e);
    }
  }

  // Generate filename
  const filename = `${quotation.quotation_number || 'devis'}_${quotation.customer_company || 'client'}_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Save file
  XLSX.writeFile(workbook, filename);
}

export function downloadQuotationAsExcel(quotation: Quotation, items: QuotationItem[]): void {
  generateExcelFromQuotation({ quotation, items });
}
