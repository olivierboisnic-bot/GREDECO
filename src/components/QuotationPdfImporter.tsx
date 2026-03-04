import { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '../lib/supabase';

// Configure PDF.js worker - use local import instead of CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface QuotationPdfImporterProps {
  onImportComplete: () => void;
  onClose: () => void;
}

interface ParsedQuotation {
  quotation_number: string;
  customer_name: string;
  customer_email: string;
  customer_company: string;
  customer_address: string;
  date: string;
  valid_until: string;
  study_objectives: string[];
  product_description: string;
  skin_types: string[];
  number_of_panelists: number;
  number_of_timepoints: number;
  number_of_conditions: number;
  study_type: string;
  items: Array<{
    service_name: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    vat_percent: number;
  }>;
  global_discount_percent: number;
  notes: string;
  language: string;
}

export default function QuotationPdfImporter({ onImportComplete, onClose }: QuotationPdfImporterProps) {
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'reading' | 'parsing' | 'creating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [parsedData, setParsedData] = useState<Partial<ParsedQuotation> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  };

  const parseQuotationFromText = (text: string): Partial<ParsedQuotation> => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const parsed: Partial<ParsedQuotation> = {
      items: [],
      study_objectives: [],
      skin_types: [],
      global_discount_percent: 0,
    };

    // Extraire le numéro de devis (ex: IMPORT-1772598769081 ou 18.2.26)
    const quotationMatch = text.match(/(?:N°?\s*Devis|Quotation)\s*:?\s*([A-Z0-9.-]+)/i);
    if (quotationMatch) {
      parsed.quotation_number = quotationMatch[1].trim();
    }

    // Extraire le nom du client et la société
    // Format: "Nadège DURAND FILORGA 2-4 Rue de Lisbonne..."
    const clientMatch = text.match(/Client:\s*([A-Za-zÀ-ÿ\s]+?)(?:\s+([A-Z][A-Z\s]+))?\s+(\d+-?\d*\s+[Rr]ue[^\n]*)/i);
    if (clientMatch) {
      parsed.customer_name = clientMatch[1].trim();
      if (clientMatch[2]) {
        parsed.customer_company = clientMatch[2].trim();
      }
      parsed.customer_address = clientMatch[3].trim();
    } else {
      // Fallback - chercher juste après "Client:"
      const simpleClientMatch = text.match(/Client:\s*([^\n]+)/i);
      if (simpleClientMatch) {
        const clientLine = simpleClientMatch[1].trim();
        // Séparer nom et société si possible
        const parts = clientLine.split(/\s{2,}|\s+(?=[A-Z]{2,})/);
        if (parts.length > 0) {
          parsed.customer_name = parts[0].trim();
          if (parts.length > 1) {
            parsed.customer_company = parts[1].trim();
          }
        }
      }
    }

    // Extraire l'email
    const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    if (emailMatch) {
      parsed.customer_email = emailMatch[1];
    }

    // Extraire l'adresse si pas encore trouvée
    if (!parsed.customer_address) {
      const addressMatch = text.match(/(\d+-?\d*\s+[Rr]ue[^\n]+\d{5}[^\n]*)/i);
      if (addressMatch) {
        parsed.customer_address = addressMatch[1].trim();
      }
    }

    // Extraire la date (format DD/MM/YYYY)
    const dateMatch = text.match(/Date:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      parsed.date = `${year}-${month}-${day}`;
    }

    // Extraire la date de validité (30 jours par défaut)
    if (parsed.date) {
      const date = new Date(parsed.date);
      date.setDate(date.getDate() + 30);
      parsed.valid_until = date.toISOString().split('T')[0];
    }

    // Extraire le titre de l'étude (Étude:)
    const studyTitleMatch = text.match(/Étude:\s*([^\n]+)/i);
    if (studyTitleMatch) {
      parsed.product_description = studyTitleMatch[1].trim();
    }

    // Extraire les objectifs d'étude - plusieurs patterns possibles
    let objectivesText = '';

    // Pattern 1: "Objectifs de l'Étude: [...array...]"
    const objArrayMatch = text.match(/Objectifs de l'Étude:\s*\[([^\]]+)\]/i);
    if (objArrayMatch) {
      objectivesText = objArrayMatch[1];
    } else {
      // Pattern 2: "Objectifs de l'Étude: texte sur plusieurs lignes"
      const objMultilineMatch = text.match(/Objectifs de l'Étude:\s*([^\n]+(?:\n(?!Méthodologie|Types de Peau|Critères)[^\n]+)*)/i);
      if (objMultilineMatch) {
        objectivesText = objMultilineMatch[1];
      }
    }

    if (objectivesText) {
      const objectives = objectivesText
        .split(/","|;|\n/)
        .map(obj => obj.replace(/^["'\s]+|["'\s]+$/g, '').trim())
        .filter(obj => obj && obj.length > 10 && !obj.includes('Méthodologie') && !obj.includes('Types de Peau'));
      parsed.study_objectives = objectives.slice(0, 5);
    }

    // Extraire le nombre de panélistes
    const panelistsMatch = text.match(/(?:Nombre de Panélistes|Number of Panelists):\s*(\d+)/i);
    if (panelistsMatch) {
      parsed.number_of_panelists = parseInt(panelistsMatch[1]);
    }

    // Extraire les phototypes (I, II, III, IV, V, VI)
    const phototypesMatch = text.match(/Types de Peau \(Phototypes\):\s*([I, V]+)/i);
    if (phototypesMatch) {
      const phototypesStr = phototypesMatch[1];
      const phototypes = phototypesStr.split(',').map(p => p.trim()).filter(p => p);
      parsed.skin_types = phototypes;
    }

    // Extraire la méthodologie
    const methodologyMatch = text.match(/Méthodologie:\s*([^\n]+(?:\n(?!Nombre de Panélistes|Critères)[^\n]+)*)/i);
    if (methodologyMatch) {
      parsed.notes = methodologyMatch[1].trim();
    }

    // Extraire le temps de mesure/durée (ex: T0, T7, T28, T56, T84)
    const timepointsMatch = text.match(/Temps de mesure\/Durée:\s*([T0-9, ]+)/i);
    if (timepointsMatch) {
      const timepoints = timepointsMatch[1].split(',').map(t => t.trim()).filter(t => t.startsWith('T'));
      parsed.number_of_timepoints = timepoints.length;
    }

    // Le type d'étude par défaut est in_vivo (sauf si ex_vivo est mentionné)
    parsed.study_type = text.toLowerCase().includes('ex vivo') || text.toLowerCase().includes('ex_vivo') ? 'ex_vivo' : 'in_vivo';

    // Extraire la remise globale
    const discountMatch = text.match(/(?:Remise globale|Global discount)[:\s]+(\d+(?:\.\d+)?)\s*%/i);
    if (discountMatch) {
      parsed.global_discount_percent = parseFloat(discountMatch[1]);
    }

    // Extraire la langue
    if (text.includes('Devis') || text.includes('Étude') || text.includes('Méthodologie')) {
      parsed.language = 'fr';
    } else if (text.includes('Quotation') || text.includes('Study') || text.includes('Methodology')) {
      parsed.language = 'en';
    } else {
      parsed.language = 'fr';
    }

    return parsed;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setStatus('error');
      setMessage('Le fichier doit être un PDF');
      return;
    }

    setImporting(true);
    setStatus('reading');
    setMessage('Lecture du fichier PDF...');

    try {
      // Extraire le texte du PDF
      const text = await extractTextFromPdf(file);

      setStatus('parsing');
      setMessage('Analyse des données...');

      // Parser les données
      const parsed = parseQuotationFromText(text);
      setParsedData(parsed);

      setStatus('success');
      setMessage('PDF analysé avec succès ! Vérifiez les données ci-dessous et cliquez sur "Créer le Devis".');
    } catch (error) {
      console.error('Error importing PDF:', error);
      setStatus('error');
      setMessage(`Erreur lors de l'import: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const createQuotationFromParsedData = async () => {
    if (!parsedData) return;

    setStatus('creating');
    setMessage('Création du devis...');

    try {
      // Vérifier les données minimales requises
      if (!parsedData.customer_name || !parsedData.customer_email) {
        throw new Error('Le nom du client et l\'email sont requis');
      }

      // Créer un nouveau numéro de devis si nécessaire
      const quotationNumber = parsedData.quotation_number || `IMPORT-${Date.now()}`;

      // Préparer les données à insérer
      const insertData = {
        quotation_number: quotationNumber,
        customer_name: parsedData.customer_name,
        customer_email: parsedData.customer_email,
        customer_company: parsedData.customer_company || '',
        customer_address: parsedData.customer_address || '',
        quotation_date: parsedData.date || new Date().toISOString().split('T')[0],
        valid_until: parsedData.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        study_objectives: JSON.stringify(parsedData.study_objectives || []),
        product_description: parsedData.product_description || '',
        skin_types: JSON.stringify(parsedData.skin_types || []),
        number_of_conditions: parsedData.number_of_conditions || 1,
        study_type: parsedData.study_type === 'ex_vivo' ? 'ex_vivo' : 'in_vivo',
        status: 'draft',
        total_amount: 0,
        global_discount_percent: parsedData.global_discount_percent || 0,
        notes: parsedData.notes || '',
        language: parsedData.language || 'fr',
        methodology: '',
        objectives_data: []
      };

      console.log('Attempting to insert quotation:', insertData);

      // Créer le devis
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([insertData])
        .select()
        .single();

      if (quotationError) {
        console.error('Supabase error details:', quotationError);
        throw new Error(quotationError.message || 'Erreur lors de la création du devis dans la base de données');
      }

      if (!quotation) {
        throw new Error('Le devis a été créé mais aucune donnée n\'a été retournée');
      }

      console.log('Quotation created successfully:', quotation);

      setStatus('success');
      setMessage('Devis créé avec succès !');

      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error creating quotation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Full error details:', error);
      setStatus('error');
      setMessage(`Erreur lors de la création: ${errorMessage}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">Importer un Devis PDF</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Upload section */}
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 font-medium shadow-md"
            >
              <Upload size={20} />
              {importing ? 'Import en cours...' : 'Choisir un fichier PDF'}
            </button>
          </div>

          {/* Status message */}
          {status !== 'idle' && (
            <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              status === 'error' ? 'bg-red-50 text-red-800' :
              status === 'success' ? 'bg-green-50 text-green-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              {status === 'error' ? <AlertCircle size={20} className="flex-shrink-0 mt-0.5" /> :
               status === 'success' ? <CheckCircle size={20} className="flex-shrink-0 mt-0.5" /> :
               <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className="font-medium">{message}</p>
              </div>
            </div>
          )}

          {/* Parsed data preview */}
          {parsedData && status === 'success' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Données extraites du PDF :</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de devis</label>
                  <p className="text-sm text-gray-900">{parsedData.quotation_number || 'Non trouvé'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <p className="text-sm text-gray-900">{parsedData.customer_name || 'Non trouvé'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-sm text-gray-900">{parsedData.customer_email || 'Non trouvé'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Société</label>
                  <p className="text-sm text-gray-900">{parsedData.customer_company || 'Non trouvé'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <p className="text-sm text-gray-900">{parsedData.date || 'Non trouvé'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valide jusqu'au</label>
                  <p className="text-sm text-gray-900">{parsedData.valid_until || 'Non trouvé'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de panélistes</label>
                  <p className="text-sm text-gray-900">{parsedData.number_of_panelists || 'Non trouvé'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de temps</label>
                  <p className="text-sm text-gray-900">{parsedData.number_of_timepoints || 'Non trouvé'}</p>
                </div>
                {parsedData.product_description && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Produit</label>
                    <p className="text-sm text-gray-900">{parsedData.product_description}</p>
                  </div>
                )}
                {parsedData.study_objectives && parsedData.study_objectives.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Objectifs d'étude</label>
                    <ul className="text-sm text-gray-900 list-disc list-inside">
                      {parsedData.study_objectives.map((obj, idx) => (
                        <li key={idx}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note :</strong> Les services ne sont pas importés automatiquement.
                  Après avoir créé le devis, vous devrez ajouter manuellement les services depuis l'interface de modification du devis.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={createQuotationFromParsedData}
                  disabled={importing || !parsedData.customer_name || !parsedData.customer_email}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 font-medium shadow-md"
                >
                  Créer le Devis
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium shadow-md"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
