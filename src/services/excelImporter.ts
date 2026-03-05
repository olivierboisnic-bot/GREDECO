import * as XLSX from 'xlsx';

export interface ImportedQuotationData {
  quotationInfo: {
    quotationNumber: string;
    quotationDate: string;
    studyTitle: string;
    language: 'fr' | 'en';
  };
  customerInfo: {
    name: string;
    contact: string;
    company: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
    emails: string[];
  };
  studyDesign: {
    methodology: string;
    inclusionCriteria: string[];
    exclusionCriteria: string[];
    numberOfPanelists: number;
    studyType: string;
    numberOfConditions: number;
    skinTypes: string[];
    timepoints: string;
  };
  objectives: string[];
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    tvaPercent: number;
    objectiveName: string;
    orderIndex: number;
  }>;
  objectivesData: Array<{
    name: string;
    timepoints: string[];
  }>;
  globalDiscountPercent: number;
}

export async function importQuotationFromExcel(file: File): Promise<ImportedQuotationData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const result: ImportedQuotationData = {
          quotationInfo: {
            quotationNumber: '',
            quotationDate: '',
            studyTitle: '',
            language: 'fr',
          },
          customerInfo: {
            name: '',
            contact: '',
            company: '',
            address: '',
            postalCode: '',
            city: '',
            country: 'France',
            emails: [],
          },
          studyDesign: {
            methodology: '',
            inclusionCriteria: [],
            exclusionCriteria: [],
            numberOfPanelists: 30,
            studyType: 'in_vivo',
            numberOfConditions: 1,
            skinTypes: [],
            timepoints: 'T0, T2',
          },
          objectives: [],
          items: [],
          objectivesData: [],
          globalDiscountPercent: 0,
        };

        // Check if new format (single sheet) or old format (multi-sheet)
        const hasNewFormat = workbook.SheetNames.includes('Devis Complet');
        const hasOldFormat = workbook.SheetNames.includes('Informations');

        if (hasNewFormat) {
          // New single-sheet format
          const sheet = workbook.Sheets['Devis Complet'];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

          let currentSection = '';
          let servicesHeaderFound = false;
          let objectivesDetailsHeaderFound = false;

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row[0]) continue;

            const label = String(row[0]).trim();

            // Detect sections
            if (label === 'INFORMATIONS DU DEVIS' || label === 'DÉTAILS DE L\'ÉTUDE' || label === 'OBJECTIFS DE L\'ÉTUDE') {
              currentSection = label;
              continue;
            }

            if (label === 'SERVICES ET PRESTATIONS') {
              currentSection = label;
              servicesHeaderFound = true;
              continue;
            }

            if (label === 'DÉTAILS DES OBJECTIFS') {
              currentSection = label;
              objectivesDetailsHeaderFound = true;
              continue;
            }

            // Skip section headers in SERVICES section
            if (servicesHeaderFound && label === 'Description') {
              continue;
            }

            // Skip section headers in DÉTAILS DES OBJECTIFS section
            if (objectivesDetailsHeaderFound && label === 'Objectif') {
              continue;
            }

            const value = row[1] !== undefined ? String(row[1]).trim() : '';

            // Parse based on current section
            if (currentSection === 'SERVICES ET PRESTATIONS') {
              // Parse service rows
              if (label && label !== 'Description') {
                result.items.push({
                  description: label,
                  quantity: parseFloat(row[1]) || 0,
                  unitPrice: parseFloat(row[2]) || 0,
                  tvaPercent: parseFloat(row[3]) || 20,
                  objectiveName: String(row[4] || ''),
                  orderIndex: parseInt(row[5]) || result.items.length,
                });
              }
            } else if (currentSection === 'DÉTAILS DES OBJECTIFS') {
              // Parse objective details
              if (label && label !== 'Objectif') {
                result.objectivesData.push({
                  name: label,
                  timepoints: value.split(',').map(t => t.trim()).filter(t => t),
                });
              }
            } else {
              // Parse quotation info, customer info, and study design
              switch (label) {
                case 'Devis':
                  result.quotationInfo.quotationNumber = value;
                  break;
                case 'Date':
                  result.quotationInfo.quotationDate = value;
                  break;
                case 'Étude':
                  result.quotationInfo.studyTitle = value;
                  break;
                case 'Client':
                  result.customerInfo.name = value;
                  break;
                case 'Société':
                  result.customerInfo.company = value;
                  break;
                case 'Adresse':
                  result.customerInfo.address = value;
                  break;
                case 'Code Postal':
                  result.customerInfo.postalCode = value;
                  break;
                case 'Ville':
                  result.customerInfo.city = value;
                  break;
                case 'Pays':
                  result.customerInfo.country = value;
                  break;
                case 'Email':
                  result.customerInfo.emails = value.split(',').map(e => e.trim()).filter(e => e);
                  break;
                case 'Langue':
                  result.quotationInfo.language = value === 'en' ? 'en' : 'fr';
                  break;
                case 'Méthodologie':
                  result.studyDesign.methodology = value;
                  break;
                case 'Critères d\'Inclusion':
                  result.studyDesign.inclusionCriteria = value.split(';').map(c => c.trim()).filter(c => c);
                  break;
                case 'Critères d\'Exclusion':
                  result.studyDesign.exclusionCriteria = value.split(';').map(c => c.trim()).filter(c => c);
                  break;
                case 'Nombre de Panélistes':
                  result.studyDesign.numberOfPanelists = parseInt(value) || 30;
                  break;
                case 'Type d\'étude':
                  result.studyDesign.studyType = value;
                  break;
                case 'Nombre de Conditions':
                  result.studyDesign.numberOfConditions = parseInt(value) || 1;
                  break;
                case 'Phototypes':
                  result.studyDesign.skinTypes = value.split(',').map(s => s.trim()).filter(s => s);
                  break;
                case 'Points de Mesure':
                  result.studyDesign.timepoints = value;
                  break;
                case 'Remise Globale (%)':
                  result.globalDiscountPercent = parseFloat(value) || 0;
                  break;
                default:
                  if (label.startsWith('Objectif ')) {
                    result.objectives.push(value);
                  }
                  break;
              }
            }
          }
        } else if (hasOldFormat) {
          // Old multi-sheet format (backward compatibility)
          const sheet = workbook.Sheets['Informations'];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

          for (const row of jsonData) {
            if (!row[0]) continue;

            const label = String(row[0]).trim();
            const value = row[1] !== undefined ? String(row[1]).trim() : '';

            switch (label) {
              case 'Devis':
                result.quotationInfo.quotationNumber = value;
                break;
              case 'Date':
                result.quotationInfo.quotationDate = value;
                break;
              case 'Étude':
                result.quotationInfo.studyTitle = value;
                break;
              case 'Client':
                result.customerInfo.name = value;
                break;
              case 'Société':
                result.customerInfo.company = value;
                break;
              case 'Adresse':
                result.customerInfo.address = value;
                break;
              case 'Code Postal':
                result.customerInfo.postalCode = value;
                break;
              case 'Ville':
                result.customerInfo.city = value;
                break;
              case 'Pays':
                result.customerInfo.country = value;
                break;
              case 'Email':
                result.customerInfo.emails = value.split(',').map(e => e.trim()).filter(e => e);
                break;
              case 'Langue':
                result.quotationInfo.language = value === 'en' ? 'en' : 'fr';
                break;
              case 'Méthodologie':
                result.studyDesign.methodology = value;
                break;
              case 'Critères d\'Inclusion':
                result.studyDesign.inclusionCriteria = value.split(';').map(c => c.trim()).filter(c => c);
                break;
              case 'Critères d\'Exclusion':
                result.studyDesign.exclusionCriteria = value.split(';').map(c => c.trim()).filter(c => c);
                break;
              case 'Nombre de Panélistes':
                result.studyDesign.numberOfPanelists = parseInt(value) || 30;
                break;
              case 'Type d\'étude':
                result.studyDesign.studyType = value;
                break;
              case 'Nombre de Conditions':
                result.studyDesign.numberOfConditions = parseInt(value) || 1;
                break;
              case 'Phototypes':
                result.studyDesign.skinTypes = value.split(',').map(s => s.trim()).filter(s => s);
                break;
              case 'Points de Mesure':
                result.studyDesign.timepoints = value;
                break;
              case 'Remise Globale (%)':
                result.globalDiscountPercent = parseFloat(value) || 0;
                break;
              default:
                if (label.startsWith('Objectif ')) {
                  result.objectives.push(value);
                }
                break;
            }
          }

          // Old format: Sheet 2: Services
          if (workbook.SheetNames.includes('Services')) {
            const sheet = workbook.Sheets['Services'];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (!row[0]) continue;

              result.items.push({
                description: String(row[0] || ''),
                quantity: parseFloat(row[1]) || 0,
                unitPrice: parseFloat(row[2]) || 0,
                tvaPercent: parseFloat(row[3]) || 20,
                objectiveName: String(row[4] || ''),
                orderIndex: parseInt(row[5]) || i - 1,
              });
            }
          }

          // Old format: Sheet 3: Objectifs Détails
          if (workbook.SheetNames.includes('Objectifs Détails')) {
            const sheet = workbook.Sheets['Objectifs Détails'];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (!row[0]) continue;

              result.objectivesData.push({
                name: String(row[0] || ''),
                timepoints: String(row[1] || '').split(',').map(t => t.trim()).filter(t => t),
              });
            }
          }
        }

        resolve(result);
      } catch (error) {
        reject(new Error(`Erreur lors de l'import du fichier Excel: ${error instanceof Error ? error.message : 'Erreur inconnue'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };

    reader.readAsArrayBuffer(file);
  });
}
