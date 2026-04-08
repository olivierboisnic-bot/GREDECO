import React, { useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { Quotation, QuotationItem } from '../lib/supabase';
import GredecoLogo from './GredecoLogo';
import { generateQuotationPDF } from '../services/pdfGenerator';
import { downloadQuotationAsExcel } from '../services/excelExporter';
import { formatCurrency } from '../utils/numberFormat';

interface QuotationPreviewProps {
  quotation: Quotation;
  items: QuotationItem[];
  onClose: () => void;
}

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

export default function QuotationPreview({ quotation, items, onClose }: QuotationPreviewProps) {
  const generateFilename = () => {
    const quotationNumber = quotation.quotation_number || 'devis';
    const companyName = quotation.customer_company?.trim()?.replace(/[^a-z0-9]/gi, '_').replace(/__+/g, '_') || 'client';
    const currentDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const date = currentDate.replace(/\//g, '-');
    return `${quotationNumber}_${companyName}_${date}.pdf`;
  };

  useEffect(() => {
    const originalTitle = document.title;
    document.title = generateFilename().replace('.pdf', '');

    const style = document.createElement('style');
    style.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 0; }
        body { margin: 0; padding: 0; }
        .pdf-page { page-break-after: always; page-break-inside: avoid; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.title = originalTitle;
      document.head.removeChild(style);
    };
  }, [quotation]);

  const handleDownloadBoth = async () => {
    console.log('=== handleDownloadBoth called ===');
    try {
      console.log('Starting PDF generation...');
      console.log('Quotation:', quotation);
      console.log('Items:', items);

      // Generate and download PDF
      const pdf = await generateQuotationPDF(quotation, items);
      pdf.save(generateFilename());
      console.log('PDF generated successfully');

      console.log('Starting Excel generation...');
      // Generate and download Excel
      await downloadQuotationAsExcel(quotation, items);
      console.log('Excel generated successfully');

      alert('Fichiers générés avec succès!');
    } catch (error) {
      console.error('=== Error generating files ===');
      console.error('Error details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`Erreur lors de la génération des fichiers: ${errorMessage}`);
    }
  };


  const groupItemsByObjective = (): { objectiveGroups: ObjectiveGroup[], mandatoryItems: QuotationItem[] } => {
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
      // Check if item is mandatory (no objective_name or recruitment objective)
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

  const calculateSubtotal = () => {
    const globalDiscount = quotation.global_discount_percent || 0;
    return items.reduce((sum, item) => {
      const totalDiscount = (item.discount_percent || 0) + globalDiscount;
      const adjustedUnitPrice = item.unit_price * (1 - totalDiscount / 100);
      const adjustedAmountHT = adjustedUnitPrice * item.quantity;
      return sum + adjustedAmountHT;
    }, 0);
  };

  const calculateTotalVAT = () => {
    const globalDiscount = quotation.global_discount_percent || 0;
    return items.reduce((sum, item) => {
      const totalDiscount = (item.discount_percent || 0) + globalDiscount;
      const adjustedUnitPrice = item.unit_price * (1 - totalDiscount / 100);
      const adjustedAmountHT = adjustedUnitPrice * item.quantity;
      const vatAmount = adjustedAmountHT * (item.vat_percent || 20) / 100;
      return sum + vatAmount;
    }, 0);
  };

  const calculateNetTotal = () => {
    return calculateSubtotal() + calculateTotalVAT();
  };

  const { objectiveGroups, mandatoryItems } = groupItemsByObjective();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:static print:bg-transparent">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col print:max-w-full print:max-h-full print:shadow-none print:rounded-none">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 print:hidden">
          <h2 className="text-xl font-semibold text-gray-900">Quotation Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadBoth}
              className="download-button flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download size={18} />
              Exporter (PDF + Excel)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
          <div className="max-w-[210mm] mx-auto bg-white shadow-lg" id="quotation-content">
            <div className="pdf-page bg-white p-[15mm]">
            <div className="mb-4 pb-3 bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <img src="/logo.png" alt="Gredeco Logo" className="w-20 h-20 object-contain" crossOrigin="anonymous" />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">GREDECO</h1>
                    <p className="text-sm text-gray-600">Groupe de Recherche et d'Evaluation en Dermatologie et Cosmétologie</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-700">45 bd Vincent Auriol</p>
                  <p className="text-xs text-gray-700">75013 Paris</p>
                  <p className="text-xs text-gray-700">01 45 86 58 82</p>
                  <p className="text-xs text-gray-700">gredeco@gredeco.com</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-4 rounded">
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-900 mb-1">Date:</p>
                    <p className="text-sm text-gray-800">{quotation.quotation_date ? new Date(quotation.quotation_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date(quotation.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                  </div>
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-900 mb-1">N° Devis:</p>
                    <p className="text-sm text-gray-800 font-mono">{quotation.quotation_number || 'N/A'}</p>
                  </div>

                  <div className="border-t border-blue-200 pt-3 mt-3">
                    <p className="text-xs font-bold text-gray-900 mb-2">Client:</p>
                    <p className="text-sm text-gray-800 font-semibold">{quotation.customer_name || 'Client'}</p>
                    {quotation.customer_company && quotation.customer_company.trim() && (
                      <p className="text-sm text-gray-800">{quotation.customer_company.trim()}</p>
                    )}
                    {quotation.customer_address && quotation.customer_address.trim() && (
                      <p className="text-xs text-gray-600 mt-1">{quotation.customer_address.trim()}</p>
                    )}
                    {(quotation.postal_code || quotation.city || quotation.country) && (
                      <p className="text-xs text-gray-600">
                        {[quotation.postal_code, quotation.city, quotation.country].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded h-full flex flex-col justify-center items-center text-center overflow-hidden">
                  <p className="text-xs text-gray-600 mb-2">Étude:</p>
                  <h2 className="text-sm font-bold text-blue-900 uppercase leading-tight break-words w-full px-2" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', hyphens: 'auto' }}>
                    {quotation.study_title && quotation.study_title.trim() ? quotation.study_title.trim() : 'ÉTUDE'}
                  </h2>
                </div>
              </div>
            </div>

            {((quotation.product_description && quotation.product_description.trim()) ||
              (quotation.study_objectives && quotation.study_objectives.trim()) ||
              (quotation.methodology && quotation.methodology.trim()) ||
              (quotation.inclusion_criteria && quotation.inclusion_criteria.trim()) ||
              (quotation.exclusion_criteria && quotation.exclusion_criteria.trim()) ||
              quotation.number_of_volunteers || quotation.number_of_conditions) && (
              <div className="mb-4 bg-blue-100 p-3 rounded-lg border border-blue-300">
                <h3 className="text-sm font-bold text-blue-900 mb-2 uppercase">Design de l'Étude</h3>

                {quotation.product_description && quotation.product_description.trim() && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-900 mb-0.5">Produit:</p>
                    <p className="text-xs text-gray-800">{quotation.product_description.trim()}</p>
                  </div>
                )}

                {quotation.study_objectives && quotation.study_objectives.trim() && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-900 mb-0.5">Objectifs de l'Étude:</p>
                    <p className="text-xs text-gray-800">{quotation.study_objectives.trim()}</p>
                  </div>
                )}

                {quotation.methodology && quotation.methodology.trim() && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-900 mb-0.5">Méthodologie:</p>
                    <p className="text-xs text-gray-800 whitespace-pre-line">{quotation.methodology.trim()}</p>
                  </div>
                )}

                {quotation.number_of_volunteers && quotation.number_of_volunteers > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-900 mb-0.5">
                      {quotation.study_type === 'ex_vivo' ? 'Nombre de Peau/Fibroblaste:' : 'Nombre de Panélistes:'}
                    </p>
                    <p className="text-xs text-gray-800">{quotation.number_of_volunteers}</p>
                  </div>
                )}

                {quotation.study_type === 'ex_vivo' && quotation.number_of_conditions && quotation.number_of_conditions > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-900 mb-0.5">Nombre de Conditions:</p>
                    <p className="text-xs text-gray-800">{quotation.number_of_conditions}</p>
                  </div>
                )}

                {quotation.inclusion_criteria && quotation.inclusion_criteria.trim() && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-900 mb-0.5">Critères d'Inclusion:</p>
                    <p className="text-xs text-gray-800 whitespace-pre-line">{quotation.inclusion_criteria.trim()}</p>
                  </div>
                )}

                {quotation.exclusion_criteria && quotation.exclusion_criteria.trim() && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-900 mb-0.5">Critères d'Exclusion:</p>
                    <p className="text-xs text-gray-800 whitespace-pre-line">{quotation.exclusion_criteria.trim()}</p>
                  </div>
                )}

                {quotation.skin_types && quotation.skin_types.trim() && (
                  <div className="mb-0">
                    <p className="text-xs font-semibold text-gray-900 mb-0.5">Types de Peau (Phototypes):</p>
                    <p className="text-xs text-gray-800">
                      {Array.from(new Set(quotation.skin_types
                        .split(',')
                        .map((s: string) => s.trim())
                        .map((s: string) => s.replace(/^Phototypes?\s*/i, ''))
                        .filter((s: string) => s.length > 0)))
                        .join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-blue-200">
                    <th className="text-left py-2 px-3 font-semibold border border-gray-300">Description</th>
                    <th className="text-center py-2 px-3 font-semibold border border-gray-300">Unité</th>
                    <th className="text-right py-2 px-3 font-semibold border border-gray-300">Prix U HT</th>
                    <th className="text-right py-2 px-3 font-semibold border border-gray-300">Prix T HT</th>
                    <th className="text-center py-2 px-3 font-semibold border border-gray-300">TVA</th>
                  </tr>
                </thead>
                <tbody>
                  {objectiveGroups.map((group, groupIndex) => {
                    const isRecruitmentObjective = group.name.toLowerCase().includes('recrutement') ||
                                                   group.name.toLowerCase().includes('recruitment') ||
                                                   group.name.toLowerCase().includes('panelist') ||
                                                   group.name.toLowerCase().includes('panéliste');

                    return (
                    <React.Fragment key={`objective-group-${groupIndex}`}>
                      <tr key={`objective-header-${groupIndex}`} className="bg-blue-100">
                        <td className="py-2 px-3 font-bold border border-gray-300 text-blue-900" colSpan={5}>
                          OBJECTIF : {group.name.toUpperCase()}
                        </td>
                      </tr>
                      {!isRecruitmentObjective && group.timepoints && (
                        <tr key={`objective-timepoints-${groupIndex}`} className="bg-white">
                          <td className="py-1.5 px-3 border border-gray-300 italic text-gray-700" colSpan={5}>
                            <span className="font-semibold">Temps de mesure/Durée:</span> {group.timepoints}
                          </td>
                        </tr>
                      )}
                      {group.items.map((item) => {
                        // Use service_name if available, otherwise fallback to description
                        let cleanDescription = (item.service_name || item.description || '').trim();

                        // Clean up description only if service_name is not present
                        if (!item.service_name && item.description) {
                          cleanDescription = cleanDescription.replace(/\s*\(Objective:.*?\)/g, '');
                          cleanDescription = cleanDescription.replace(/\s*-?\s*MANDATORY FOR ALL STUDIES/gi, '');
                          cleanDescription = cleanDescription.replace(/\s*-?\s*MANDATORY FOR CLINICAL TRIALS/gi, '');
                          cleanDescription = cleanDescription.replace(/\s*-?\s*MANDATORY FOR LABORATORY TRIALS/gi, '');
                          cleanDescription = cleanDescription.replace(/\|\s*Claims:.*$/gi, '');
                          cleanDescription = cleanDescription.replace(/\s*\(TVA:\s*[\d.]+\)/g, '');
                          cleanDescription = cleanDescription.trim();
                        }

                        const isIndemnisation = cleanDescription.toLowerCase().includes('idemisation') ||
                                               cleanDescription.toLowerCase().includes('indemnisation');
                        const isZeroPrice = item.unit_price === 0 || item.amount_without_tax === 0;

                        if (isIndemnisation && isZeroPrice) {
                          return (
                            <tr key={`${groupIndex}-${item.id}`} className="bg-white">
                              <td className="py-2 px-3 border border-gray-300 break-words">
                                {cleanDescription}
                                {item.discount_percent > 0 && (
                                  <span className="ml-2 font-bold text-red-600">(Remise: {item.discount_percent}%)</span>
                                )}
                              </td>
                              <td className="py-2 px-3 border border-gray-300 text-center" colSpan={4}>
                                {item.quantity} produits fournis par le client
                              </td>
                            </tr>
                          );
                        }

                        const globalDiscount = quotation.global_discount_percent || 0;
                        const totalDiscount = (item.discount_percent || 0) + globalDiscount;
                        const adjustedUnitPrice = item.unit_price * (1 - totalDiscount / 100);
                        const adjustedAmountHT = adjustedUnitPrice * item.quantity;
                        return (
                          <tr key={`${groupIndex}-${item.id}`} className="bg-white">
                            <td className="py-2 px-3 border border-gray-300 break-words">
                              <span className="text-sm font-semibold">{cleanDescription}</span>
                              {totalDiscount > 0 && (
                                <span className="ml-2 font-bold text-red-600">
                                  (Remise: {totalDiscount}%
                                  {item.discount_percent > 0 && globalDiscount > 0 && ` = ${item.discount_percent}% + ${globalDiscount}% globale`})
                                </span>
                              )}
                              {item.image_url && (
                                <div className="mt-2">
                                  <img
                                    src={item.image_url}
                                    alt={cleanDescription}
                                    className="max-w-full max-h-32 object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 border border-gray-300 text-center">{item.quantity}</td>
                            <td className="py-2 px-3 border border-gray-300 text-right whitespace-nowrap">{formatCurrency(adjustedUnitPrice)}&nbsp;€</td>
                            <td className="py-2 px-3 border border-gray-300 text-right whitespace-nowrap">{formatCurrency(adjustedAmountHT)}&nbsp;€</td>
                            <td className="py-2 px-3 border border-gray-300 text-center">{item.vat_percent ? `${item.vat_percent}%` : '20%'}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                    );
                  })}

                  {(mandatoryItems.length > 0 || !items.some(item => (item.service_name || item.description || '').toLowerCase().includes('indemnisation'))) && (
                    <>
                      <tr className="bg-blue-100">
                        <td className="py-2 px-3 font-bold border border-gray-300 text-blue-900" colSpan={5}>
                          SERVICES OBLIGATOIRES
                        </td>
                      </tr>
                      {!items.some(item => (item.service_name || item.description || '').toLowerCase().includes('indemnisation')) && (
                        <tr className="bg-white">
                          <td className="py-2 px-3 border border-gray-300 break-words">
                            Indemnisation des panélistes - Fournis par le client
                          </td>
                          <td className="py-2 px-3 border border-gray-300 text-center">-</td>
                          <td className="py-2 px-3 border border-gray-300 text-right whitespace-nowrap">-</td>
                          <td className="py-2 px-3 border border-gray-300 text-right whitespace-nowrap">-</td>
                          <td className="py-2 px-3 border border-gray-300 text-center">-</td>
                        </tr>
                      )}
                      {mandatoryItems.filter(item => !item.description?.toLowerCase().includes('rapport')).sort((a, b) => {
                        const descA = a.description?.toLowerCase() || '';
                        const descB = b.description?.toLowerCase() || '';

                        // Order: Recrutement -> Bibliographie -> Indemnisation -> Datacapt -> Rapport
                        const isRecruitmentA = descA.includes('recrutement') || descA.includes('recruitment');
                        const isRecruitmentB = descB.includes('recrutement') || descB.includes('recruitment');
                        const isBibliographieA = descA.includes('bibliographie') || descA.includes('synopsis') || descA.includes('préparation');
                        const isBibliographieB = descB.includes('bibliographie') || descB.includes('synopsis') || descB.includes('préparation');
                        const isIndemnisationA = descA.includes('indemnisation');
                        const isIndemnisationB = descB.includes('indemnisation');
                        const isDatacaptA = descA.includes('datacapt') || (descA.includes('gestion') && descA.includes('donnees'));
                        const isDatacaptB = descB.includes('datacapt') || (descB.includes('gestion') && descB.includes('donnees'));
                        const isRapportA = descA.includes('rapport') || descA.includes('rédaction');
                        const isRapportB = descB.includes('rapport') || descB.includes('rédaction');

                        if (isRecruitmentA && !isRecruitmentB) return -1;
                        if (!isRecruitmentA && isRecruitmentB) return 1;
                        if (isBibliographieA && !isBibliographieB) return -1;
                        if (!isBibliographieA && isBibliographieB) return 1;
                        if (isIndemnisationA && !isIndemnisationB) return -1;
                        if (!isIndemnisationA && isIndemnisationB) return 1;
                        if (isDatacaptA && !isDatacaptB) return -1;
                        if (!isDatacaptA && isDatacaptB) return 1;
                        if (isRapportA && !isRapportB) return -1;
                        if (!isRapportA && isRapportB) return 1;
                        return 0;
                      }).map((item) => {
                        // Use service_name if available, otherwise fallback to description
                        let cleanDescription = (item.service_name || item.description || '').trim();

                        // Clean up description only if service_name is not present
                        if (!item.service_name && item.description) {
                          cleanDescription = cleanDescription.replace(/\s*\(Objectif?:.*?\)/g, '');
                          cleanDescription = cleanDescription.replace(/\s*-?\s*MANDATORY FOR ALL STUDIES/gi, '');
                          cleanDescription = cleanDescription.replace(/\s*-?\s*MANDATORY FOR CLINICAL TRIALS/gi, '');
                          cleanDescription = cleanDescription.replace(/\s*-?\s*MANDATORY FOR LABORATORY TRIALS/gi, '');
                          cleanDescription = cleanDescription.replace(/\|\s*Claims:.*$/gi, '');
                          cleanDescription = cleanDescription.replace(/\s*\(TVA:\s*[\d.]+\)/g, '');
                          cleanDescription = cleanDescription.trim();
                        }

                        const globalDiscount = quotation.global_discount_percent || 0;
                        const totalDiscount = (item.discount_percent || 0) + globalDiscount;
                        const adjustedUnitPrice = item.unit_price * (1 - totalDiscount / 100);
                        const adjustedAmountHT = adjustedUnitPrice * item.quantity;
                        return (
                          <tr key={item.id} className="bg-white">
                            <td className="py-2 px-3 border border-gray-300 break-words">
                              <span className="text-sm font-semibold">{cleanDescription}</span>
                              {totalDiscount > 0 && (
                                <span className="ml-2 font-bold text-red-600">
                                  (Remise: {totalDiscount}%
                                  {item.discount_percent > 0 && globalDiscount > 0 && ` = ${item.discount_percent}% + ${globalDiscount}% globale`})
                                </span>
                              )}
                              {item.image_url && (
                                <div className="mt-2">
                                  <img
                                    src={item.image_url}
                                    alt={cleanDescription}
                                    className="max-w-full max-h-32 object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 border border-gray-300 text-center">{item.quantity}</td>
                            <td className="py-2 px-3 border border-gray-300 text-right whitespace-nowrap">{formatCurrency(adjustedUnitPrice)}&nbsp;€</td>
                            <td className="py-2 px-3 border border-gray-300 text-right whitespace-nowrap">{formatCurrency(adjustedAmountHT)}&nbsp;€</td>
                            <td className="py-2 px-3 border border-gray-300 text-center">{item.vat_percent ? `${item.vat_percent}%` : '20%'}</td>
                          </tr>
                        );
                      })}
                      {mandatoryItems.filter(item => item.description?.toLowerCase().includes('rapport')).map((item) => {
                        // Use service_name if available, otherwise fallback to description
                        let cleanDescription = (item.service_name || item.description || '').trim();

                        // Clean up description only if service_name is not present
                        if (!item.service_name && item.description) {
                          cleanDescription = cleanDescription.replace(/\s*\(Objectif?:.*?\)/g, '');
                          cleanDescription = cleanDescription.replace(/\s*-?\s*MANDATORY FOR ALL STUDIES/gi, '');
                          cleanDescription = cleanDescription.replace(/\s*-?\s*MANDATORY FOR CLINICAL TRIALS/gi, '');
                          cleanDescription = cleanDescription.replace(/\s*-?\s*MANDATORY FOR LABORATORY TRIALS/gi, '');
                          cleanDescription = cleanDescription.replace(/\|\s*Claims:.*$/gi, '');
                          cleanDescription = cleanDescription.replace(/\s*\(TVA:\s*[\d.]+\)/g, '');
                          cleanDescription = cleanDescription.trim();
                        }

                        const globalDiscount = quotation.global_discount_percent || 0;
                        const totalDiscount = (item.discount_percent || 0) + globalDiscount;
                        const adjustedUnitPrice = item.unit_price * (1 - totalDiscount / 100);
                        const adjustedAmountHT = adjustedUnitPrice * item.quantity;
                        return (
                        <tr key={item.id} className="bg-white">
                          <td className="py-2 px-3 border border-gray-300 break-words">
                            <span className="text-sm font-semibold">{cleanDescription}</span>
                            {totalDiscount > 0 && (
                              <span className="ml-2 font-bold text-red-600">
                                (Remise: {totalDiscount}%
                                {item.discount_percent > 0 && globalDiscount > 0 && ` = ${item.discount_percent}% + ${globalDiscount}% globale`})
                              </span>
                            )}
                            {item.image_url && (
                              <div className="mt-2">
                                <img
                                  src={item.image_url}
                                  alt={cleanDescription}
                                  className="max-w-full max-h-32 object-contain"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 border border-gray-300 text-center">{item.quantity}</td>
                          <td className="py-2 px-3 border border-gray-300 text-right whitespace-nowrap">{adjustedUnitPrice.toFixed(2)}&nbsp;€</td>
                          <td className="py-2 px-3 border border-gray-300 text-right whitespace-nowrap">{adjustedAmountHT.toFixed(2)}&nbsp;€</td>
                          <td className="py-2 px-3 border border-gray-300 text-center">{item.vat_percent ? `${item.vat_percent}%` : '20%'}</td>
                        </tr>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mb-4 bg-blue-50 p-3 rounded border border-blue-200">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-right">
                  <p className="font-bold text-gray-900">Total HT</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 whitespace-nowrap">{formatCurrency(calculateSubtotal())}&nbsp;€</p>
                </div>
                <div></div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm mt-1">
                <div className="text-right">
                  <p className="text-gray-700">Total TVA</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-700 whitespace-nowrap">{formatCurrency(calculateTotalVAT())}&nbsp;€</p>
                </div>
                <div></div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm mt-2 pt-2 border-t border-blue-200">
                <div className="text-right">
                  <p className="font-bold text-blue-700 text-lg">Total TTC</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-700 text-lg whitespace-nowrap">{formatCurrency(calculateNetTotal())}&nbsp;€</p>
                </div>
                <div></div>
              </div>
            </div>

            <div className="mb-3 text-xs italic text-gray-600 bg-gray-50 p-2 rounded">
              <p>GREDECO a reçu l'agrément en ce qui concerne le crédit d'impôt en faveur de la recherche de 2022 à 2026</p>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-6">
              <div className="bg-gray-50 p-2 rounded border border-gray-300">
                <p className="text-xs font-bold text-gray-900 mb-1">Bon pour accord</p>
                <p className="text-xs text-gray-700 mb-1">Signature Investigateur</p>
                <div className="h-12 mt-1 mb-1 flex items-center">
                  <img
                    src="/signature-sylvie.jpg"
                    alt="Signature Sylvie Boisnic"
                    className="max-h-10 max-w-full object-contain"
                    onError={(e) => console.error('Failed to load signature image:', e)}
                  />
                </div>
                <p className="text-xs text-gray-700">Dr Sylvie BOISNIC</p>
              </div>
              <div className="bg-gray-50 p-2 rounded border border-gray-300">
                <p className="text-xs font-bold text-gray-900 mb-1">Bon pour accord</p>
                <p className="text-xs text-gray-700 mb-1">Signature promoteur</p>
                <div className="h-12 border-b-2 border-gray-400 mt-1"></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs bg-gray-50 p-2 rounded">
              <div>
                <p className="font-bold text-gray-900 mb-1">Informations bancaires</p>
                <p className="text-gray-700 text-[10px] leading-tight">Compte Crédit Agricole de Normandie-Seine</p>
                <p className="text-gray-700 text-[10px] leading-tight">N° IBAN: FR76 1830 6002 3236 1380 7752 124</p>
                <p className="text-gray-700 text-[10px] leading-tight">BIC: AGRIFRPP883</p>
                <p className="text-gray-700 text-[10px] leading-tight mt-1">SIRET 392 221 230 00023</p>
              </div>
              <div>
                <p className="font-bold text-gray-900 mb-1">Contact</p>
                <p className="text-gray-700 text-[10px] leading-tight">Dr Sylvie BOISNIC</p>
                <p className="text-gray-700 text-[10px] leading-tight">45 bd Vincent Auriol</p>
                <p className="text-gray-700 text-[10px] leading-tight">75013 Paris</p>
                <p className="text-gray-700 text-[10px] leading-tight">01 45 86 58 82</p>
                <p className="text-gray-700 text-[10px] leading-tight">gredeco@gredeco.com</p>
              </div>
            </div>

            </div>

            <div className="pdf-page bg-white p-[15mm]">
              <div className="bg-blue-100 p-3 rounded-lg border border-blue-300 mb-4">
                <h2 className="text-sm font-bold text-gray-900 uppercase">Conditions Générales de Vente</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <h3 className="font-bold text-gray-900 mb-1.5">Article 1 - Objet</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Les présentes conditions générales de vente s'appliquent à toutes les prestations de services effectuées par GREDECO. Toute commande implique l'acceptation sans réserve par l'acheteur et son adhésion pleine et entière aux présentes conditions générales de vente qui prévalent sur tout autre document de l'acheteur.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-1.5">Article 2 - Prix</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Les prix des prestations sont ceux en vigueur au jour de la prise de commande. Ils sont libellés en euros et calculés hors taxes. Par voie de conséquence, ils seront majorés du taux de TVA et des frais de transport applicables au jour de la commande. GREDECO s'accorde le droit de modifier ses tarifs à tout moment. Toutefois, elle s'engage à facturer les marchandises commandées aux prix indiqués lors de l'enregistrement de la commande.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-1.5">Article 3 - Escompte</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Aucun escompte ne sera consenti en cas de paiement anticipé.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-1.5">Article 4 - Modalités de paiement</h3>
                  <p className="text-gray-700 leading-relaxed mb-2">
                    Les modalités de règlement du montant total du devis s'établiront comme suit :
                  </p>
                  <p className="text-gray-700 leading-relaxed mb-1">
                    <span className="font-semibold">Acompte :</span> Un acompte de 50% du montant total du devis sera exigible à la signature du devis, paiement sous quinzaine.
                  </p>
                  <p className="text-gray-700 leading-relaxed mb-2">
                    <span className="font-semibold">Solde :</span> Le solde restant, soit 50% du montant total, sera réglé à 30 jours à compter de la date d'émission du rapport d'étude final.
                  </p>
                  <p className="text-gray-700 leading-relaxed mb-1">
                    <span className="font-semibold">Moyens de Paiement :</span> Les règlements peuvent être effectués :
                  </p>
                  <ul className="list-disc pl-5 text-gray-700 space-y-0.5 leading-relaxed">
                    <li>Soit par chèque</li>
                    <li>Soit par virement bancaire</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-1.5">Article 5 - Retard de paiement</h3>
                  <p className="text-gray-700 leading-relaxed">
                    En cas de défaut de paiement total ou partiel des marchandises livrées au jour de la réception, l'acheteur doit verser à la société GREDECO une pénalité de retard égale à trois fois le taux de l'intérêt légal. Le taux de l'intérêt légal retenu est celui en vigueur au jour de la livraison des marchandises. Cette pénalité est calculée sur le montant TTC de la somme restant due, et court à compter de la date d'échéance du prix sans qu'aucune mise en demeure préalable ne soit nécessaire.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-1.5">Article 6 - Clause résolutoire</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Si dans les quinze jours qui suivent la mise en œuvre de la clause « Retard de paiement », l'acheteur ne s'est pas acquitté des sommes restant dues, la vente sera résolue de plein droit et pourra ouvrir droit à l'allocation de dommages et intérêts au profit de la société GREDECO.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-1.5">Article 7 - Clause de réserve de propriété</h3>
                  <p className="text-gray-700 leading-relaxed">
                    La société GREDECO conserve la propriété des biens vendus jusqu'au paiement intégral du prix, en principal et accessoires. À ce titre, si l'acheteur fait l'objet d'un redressement ou d'une liquidation judiciaire, la société GREDECO se réserve le droit de revendiquer, dans le cadre de la procédure collective, les marchandises vendues et restées impayées.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-1.5">Article 8 - Clause de compétence territoriale</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Tout litige relatif à l'interprétation et à l'exécution des présentes conditions générales de vente est soumis au droit français. À défaut de résolution amiable, le litige sera porté devant le Tribunal de Commerce de Paris.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-1.5">Article 9 - Force majeure</h3>
                  <p className="text-gray-700 leading-relaxed">
                    La responsabilité de GREDECO ne pourra pas être mise en œuvre si la non-exécution ou le retard dans l'exécution de l'une de ses obligations découle d'un cas de force majeure. À ce titre, la force majeure s'entend de tout événement extérieur, imprévisible et irrésistible au sens de l'article 1148 du Code civil.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-1.5">Article 10 - Acceptation du client</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Les présentes conditions générales de vente constituent le socle de la négociation commerciale et sont systématiquement adressées ou remises à chaque acheteur pour lui permettre de passer commande. Toute commande passée constitue une acceptation sans réserve par l'acheteur des présentes conditions générales de vente.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
