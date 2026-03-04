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
    // Lire uniquement les 2 premières pages (éviter les conditions générales)
    const pagesToRead = Math.min(2, pdf.numPages);

    for (let i = 1; i <= pagesToRead; i++) {
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

    // Extraire le numéro de devis (ex: IMPORT-1772598769081, 18.2.26, 18.2.26 V4 english)
    const quotationMatch = text.match(/(?:N°?\s*Devis|Quote No):\s*([A-Z0-9.\s-]+?)(?:\n|Client)/i);
    if (quotationMatch) {
      parsed.quotation_number = quotationMatch[1].trim();
    }

    // Extraire le nom du client, société et adresse
    // Format du PDF: "Client: Nadège DURAND FILORGA 2-4 Rue de Lisbonne 75008 , Paris, France STUDY DESIGN"
    // Tout est sur une ligne, séparé par des espaces

    const clientMatch = text.match(/Client:\s*([A-Za-zÀ-ÿ]+\s+[A-Z][A-Za-zÀ-ÿ]+)\s+([A-Z][A-Z\s]+?)\s+(\d+-?\d*\s+[Rr]ue[^S]+?)(?:\s+STUDY DESIGN|\s+DESIGN DE L'ÉTUDE)/i);

    if (clientMatch) {
      parsed.customer_name = clientMatch[1].trim();
      parsed.customer_company = clientMatch[2].trim();

      // Nettoyer l'adresse: retirer ", France" et espaces multiples
      let address = clientMatch[3].trim();
      address = address.replace(/\s*,?\s*France\s*$/i, '').trim();
      address = address.replace(/\s{2,}/g, ' '); // Remplacer espaces multiples par un seul

      // Limiter la longueur de l'adresse
      if (address.length > 200) {
        address = address.substring(0, 197) + '...';
      }

      parsed.customer_address = address;
    }

    // Extraire l'email (si présent)
    const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    if (emailMatch) {
      parsed.customer_email = emailMatch[1];
    } else {
      // Email par défaut basé sur la société ou le nom
      if (parsed.customer_company) {
        const companySlug = parsed.customer_company.toLowerCase().replace(/\s+/g, '.');
        parsed.customer_email = `contact@${companySlug}.com`;
      } else if (parsed.customer_name) {
        const nameSlug = parsed.customer_name.toLowerCase().replace(/\s+/g, '.');
        parsed.customer_email = `${nameSlug}@example.com`;
      } else {
        parsed.customer_email = 'contact@client.com';
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

    // Extraire le titre de l'étude
    // Format du PDF: section "Titre de l'étude" suivie du titre complet (peut être très long)
    const studyTitleMatch = text.match(/Titre de l'étude\s+(.+?)(?:\s+Client:)/is);
    if (studyTitleMatch) {
      let title = studyTitleMatch[1].trim();

      // Nettoyer: retirer les retours à la ligne multiples
      title = title.replace(/\s+/g, ' ');

      // Limiter à 500 caractères pour le champ description
      if (title.length > 500) {
        title = title.substring(0, 497) + '...';
      }

      // Ne pas prendre si vide ou trop court
      if (title.length > 10) {
        parsed.product_description = title;
      }
    }

    // Extraire les objectifs d'étude
    // Format du PDF: liste à puces après "Objectifs d'étude"
    let objectives: string[] = [];

    // Trouver la section entre "Objectifs d'étude" et "Méthodologie"
    const objectivesSection = text.match(/Objectifs d'étude(.+?)(?:Méthodologie|Measurement Time)/is);
    if (objectivesSection) {
      const objText = objectivesSection[1];

      // Chercher les lignes qui commencent par des patterns typiques d'objectifs
      // Ex: "• Clinical scoring", "Clinical scoring :", "Instrumental :", etc.
      const objLines = objText.split(/\n/).map(l => l.trim()).filter(l => l.length > 15);

      for (const line of objLines) {
        // Nettoyer la ligne: retirer les puces, les deux-points, etc.
        let cleanLine = line.replace(/^[•●◦▪▫-]\s*/, '').trim();
        cleanLine = cleanLine.replace(/:\s*$/, '').trim();

        // Vérifier si c'est un objectif valide (commence par une majuscule, assez long)
        if (cleanLine.length > 15 && cleanLine.match(/^[A-Z]/) && !cleanLine.includes('Méthodologie')) {
          objectives.push(cleanLine);
        }
      }
    }

    // Fallback: essayer de trouver des lignes qui ressemblent à des objectifs
    if (objectives.length === 0) {
      const patterns = [
        /Clinical scoring[:\s]*([^\n]+)/i,
        /Instrumental[:\s]*([^\n]+)/i,
        /Preliminary Report[:\s]*([^\n]+)/i,
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const objective = match[0].replace(/:\s*$/, '').trim();
          if (objective.length > 15) {
            objectives.push(objective);
          }
        }
      }
    }

    parsed.study_objectives = objectives.slice(0, 5);

    // Extraire le nombre de panélistes
    const panelistsMatch = text.match(/(?:Nombre de Panélistes|Number of Panelists):\s*(\d+)/i);
    if (panelistsMatch) {
      parsed.number_of_panelists = parseInt(panelistsMatch[1]);
    }

    // Extraire les phototypes (I, II, III, IV, V, VI)
    const phototypesMatch = text.match(/(?:Types de Peau \(Phototypes\)|Skin Types \(Phototypes\)):\s*([IVX, ]+)/i);
    if (phototypesMatch) {
      const phototypesStr = phototypesMatch[1];
      const phototypes = phototypesStr.split(',').map(p => p.trim()).filter(p => p && p.match(/^[IVX]+$/));
      parsed.skin_types = phototypes;
    }

    // Extraire la méthodologie (en français ou anglais)
    // Format du PDF: "Méthodologie / Notes" suivi du texte complet (sans limites de lignes)
    const methodologyMatch = text.match(/(?:Méthodologie \/ Notes|Méthodologie|Methodology):\s*(.+?)(?=\nLangue|\nLanguage|$)/is);
    if (methodologyMatch) {
      let methodology = methodologyMatch[1].trim();

      // Nettoyer: retirer les caractères spéciaux en début/fin
      methodology = methodology.replace(/^[:\s]+|[:\s]+$/g, '');

      // Limiter à 1000 caractères max (mais garder suffisamment d'info)
      if (methodology.length > 1000) {
        methodology = methodology.substring(0, 997) + '...';
      }

      // Ne pas inclure si ça ressemble à des conditions générales
      if (!methodology.toLowerCase().includes('article 1 -') &&
          !methodology.toLowerCase().includes('general terms') &&
          methodology.length > 30) {
        parsed.notes = methodology;
      }
    }

    // Extraire le temps de mesure/durée (ex: T0, T7, T28, T56, T84)
    const timepointsMatch = text.match(/(?:Temps de mesure\/Durée|Measurement Time\/Duration):\s*([T0-9, ]+)/i);
    if (timepointsMatch) {
      const timepoints = timepointsMatch[1].split(',').map(t => t.trim()).filter(t => t.startsWith('T'));
      parsed.number_of_timepoints = timepoints.length;
    }

    // Ne pas extraire les critères d'inclusion - trop long et pas nécessaire

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
    } else if (text.includes('Quote') || text.includes('Study') || text.includes('Methodology')) {
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

      // Vérifier que les données minimales sont présentes
      if (!parsed.customer_name || parsed.customer_name.length < 3) {
        throw new Error('Impossible d\'extraire le nom du client du PDF');
      }

      console.log('Parsed data:', parsed);
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

              {parsedData.customer_email && (parsedData.customer_email.includes('example.com') || parsedData.customer_email.includes('@client.com')) && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    <strong>Note :</strong> Aucun email n'a été trouvé dans le PDF. Un email temporaire a été généré.
                    Vous devrez le modifier manuellement après la création du devis.
                  </p>
                </div>
              )}

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
                  <p className={`text-sm ${parsedData.customer_email?.includes('example.com') || parsedData.customer_email?.includes('@client.com') ? 'text-orange-600 italic' : 'text-gray-900'}`}>
                    {parsedData.customer_email || 'Non trouvé'}
                    {(parsedData.customer_email?.includes('example.com') || parsedData.customer_email?.includes('@client.com')) && ' (généré)'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Société</label>
                  <p className="text-sm text-gray-900">{parsedData.customer_company || 'Non trouvé'}</p>
                </div>
                {parsedData.customer_address && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                    <p className="text-sm text-gray-900">{parsedData.customer_address}</p>
                  </div>
                )}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de temps de mesure</label>
                  <p className="text-sm text-gray-900">{parsedData.number_of_timepoints || 'Non trouvé'}</p>
                </div>
                {parsedData.skin_types && parsedData.skin_types.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phototypes</label>
                    <p className="text-sm text-gray-900">{parsedData.skin_types.join(', ')}</p>
                  </div>
                )}
                {parsedData.product_description && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titre de l'étude</label>
                    <p className="text-sm text-gray-900">{parsedData.product_description}</p>
                  </div>
                )}
                {parsedData.study_objectives && parsedData.study_objectives.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Objectifs d'étude</label>
                    <ul className="text-sm text-gray-900 list-disc list-inside space-y-1">
                      {parsedData.study_objectives.map((obj, idx) => (
                        <li key={idx}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {parsedData.notes && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Méthodologie / Notes</label>
                    <p className="text-sm text-gray-900">{parsedData.notes}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
                  <p className="text-sm text-gray-900">{parsedData.language === 'fr' ? 'Français' : 'English'}</p>
                </div>
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
                  disabled={importing || !parsedData.customer_name || !parsedData.customer_email || status === 'creating'}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium shadow-md"
                  title={!parsedData.customer_name || !parsedData.customer_email ? 'Données manquantes (nom ou email)' : 'Créer le devis avec les données extraites'}
                >
                  {status === 'creating' ? 'Création...' : 'Créer le Devis'}
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
