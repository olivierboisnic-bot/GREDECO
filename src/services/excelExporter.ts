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
    ['Méthodologie', quotation.notes || ''],
    [''],
    ['Nombre de Panélistes', quotation.number_of_panelists || ''],
    ['Type d\'étude', quotation.study_type || ''],
    ['Nombre de Conditions', quotation.number_of_conditions || ''],
    ['Phototypes', Array.isArray(quotation.skin_types) ? quotation.skin_types.join(', ') : ''],
    [''],
    ['Remise Globale (%)', quotation.global_discount_percent || 0],
    [''],
    ['Objectifs de l\'étude', ''],
  ];

  // Add study objectives
  if (quotation.study_objectives && Array.isArray(quotation.study_objectives)) {
    quotation.study_objectives.forEach((obj: string, index: number) => {
      quotationData.push([`Objectif ${index + 1}`, obj]);
    });
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

  // Sheet 3: Objectives Details (if available)
  if (quotation.objectives_data && typeof quotation.objectives_data === 'object') {
    const objectivesData: any[][] = [
      ['Objectif', 'Méthodologie', 'Panélistes', 'Critères Inclusion', 'Critères Exclusion', 'Phototypes', 'Temps de mesure']
    ];

    // Convert objectives_data to array format
    const objData = quotation.objectives_data as Record<string, any>;
    Object.entries(objData).forEach(([objName, data]) => {
      if (data && typeof data === 'object') {
        objectivesData.push([
          objName,
          data.methodology || '',
          data.numberOfPanelists || '',
          data.inclusionCriteria || '',
          data.exclusionCriteria || '',
          Array.isArray(data.skinTypes) ? data.skinTypes.join(', ') : '',
          data.measurementTime || ''
        ]);
      }
    });

    if (objectivesData.length > 1) {
      const objectivesSheet = XLSX.utils.aoa_to_sheet(objectivesData);
      XLSX.utils.book_append_sheet(workbook, objectivesSheet, 'Objectifs Détails');
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
