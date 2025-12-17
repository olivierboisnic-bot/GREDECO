import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Save, X, Upload, Download, Search } from 'lucide-react';
import { supabase, Service } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { formatCurrency } from '../utils/numberFormat';

export default function ServiceManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    appareil: '',
    langues: '',
    base_price: '',
    tva_rate: '20',
    unit: 'unit',
    category: 'general',
    type: 'optional' as 'optional' | 'mandatory_all' | 'mandatory_clinical' | 'mandatory_lab',
    multiplier_type: 'both' as 'none' | 'panelists' | 'timepoints' | 'both' | 'skin_and_condition',
  });
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading services:', error);
    } else {
      setServices(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const serviceData = {
      name: formData.name,
      appareil: formData.appareil,
      langues: formData.langues,
      base_price: parseFloat(formData.base_price),
      tva_rate: parseFloat(formData.tva_rate),
      unit: formData.unit,
      category: formData.category,
      type: formData.type,
      multiplier_type: formData.multiplier_type,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', editingId);

      if (error) {
        console.error('Error updating service:', error);
      } else {
        setEditingId(null);
        resetForm();
        loadServices();
      }
    } else {
      const { error } = await supabase
        .from('services')
        .insert([serviceData]);

      if (error) {
        console.error('Error creating service:', error);
      } else {
        setIsAdding(false);
        resetForm();
        loadServices();
      }
    }
  };

  const handleEdit = (service: Service) => {
    setIsAdding(false);
    setEditingId(service.id);
    setFormData({
      name: service.name,
      appareil: service.appareil,
      langues: service.langues || '',
      base_price: service.base_price.toString(),
      tva_rate: service.tva_rate?.toString() || '20',
      unit: service.unit,
      category: service.category,
      type: service.type || 'optional',
      multiplier_type: service.multiplier_type || 'none',
    });
    setTimeout(() => {
      document.querySelector('form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDelete = async (id: string) => {
    const { data: usageData } = await supabase
      .from('quotation_items')
      .select('id')
      .eq('service_id', id);

    let confirmMessage = 'Are you sure you want to delete this service?';
    if (usageData && usageData.length > 0) {
      confirmMessage = `This service is used in ${usageData.length} quotation item(s). Deleting it will remove these items from their quotations.\n\nAre you sure you want to continue?`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    if (usageData && usageData.length > 0) {
      const { error: itemsError } = await supabase
        .from('quotation_items')
        .delete()
        .eq('service_id', id);

      if (itemsError) {
        console.error('Error deleting quotation items:', itemsError);
        alert(`Error deleting quotation items: ${itemsError.message}`);
        return;
      }
    }

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting service:', error);
      alert(`Error deleting service: ${error.message}`);
    } else {
      loadServices();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      appareil: '',
      langues: '',
      base_price: '',
      tva_rate: '20',
      unit: 'unit',
      category: 'general',
      type: 'optional',
      multiplier_type: 'both',
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmClear = confirm(
      'WARNING: This will DELETE ALL existing data including:\n' +
      '- All services and pricing\n' +
      '- All quotations\n' +
      '- All quotation items\n\n' +
      'This action cannot be undone. Are you sure you want to continue?'
    );

    if (!confirmClear) {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setImporting(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length > 0) {
        console.log('Excel columns found:', Object.keys(jsonData[0]));
        console.log('First row sample:', jsonData[0]);
      }

      const importedServices: any[] = [];
      let errorCount = 0;

      jsonData.forEach((row: any, index: number) => {
        const langues = row['Langues'] || row['langues'] || '';
        const typeEtudes = row['Type d etudes'] || row['Type d\'etudes'] || row['Type d\'études'] || '';
        const serviceName = row['Nom du service'] || row['Type of services'] || row['Type of services/'] || '';
        let appareil = row['Appareil'] || row['appareil'] || row['Description of services'] || row['Description'] || row['Description /'] || row['Description/'] || row['description'] || '';

        const prixRaw = row['Prix unitaire'] || row['Prix unitaire /'] || row['Prix unitaire/'] || row['prix'] || row['Prix'] || '';
        const prixUnitaire = parseFloat(prixRaw);

        const tvaRaw = row['TVA'] || row['tva'] || '20%';
        let tvaRate = parseFloat(tvaRaw.toString().replace('%', ''));
        if (tvaRate < 1 && tvaRate > 0) {
          tvaRate = tvaRate * 100;
        }
        if (isNaN(tvaRate)) {
          tvaRate = 20;
        }
        const mandatoryTypeRaw = row['Mandatory Type'] || row['Type Obligatoire'] || '';
        const multiplicateurRaw = row['Multiplicateur de Quantité'] || row['Multiplicateur de Quantite'] || row['Multiplier'] || row['Multiplicateur'] || '';

        const name = serviceName;

        // Clean appareil: remove everything after pipe "|"
        if (appareil) {
          const pipeIndex = appareil.indexOf('|');
          if (pipeIndex !== -1) {
            appareil = appareil.substring(0, pipeIndex).trim();
          }
        }

        if (!name || prixRaw === '' || prixRaw === undefined || prixRaw === null || isNaN(prixUnitaire)) {
          errorCount++;
          console.error(`Row ${index + 2} skipped: name="${name}", prixRaw="${prixRaw}", prixUnitaire=${prixUnitaire}`);
          return;
        }

        let category = 'laboratoire';
        const typeEtudesLower = typeEtudes.toLowerCase();
        if (typeEtudesLower.includes('clinique') || typeEtudesLower.includes('in vivo') || typeEtudesLower.includes('in-vivo')) {
          category = 'clinique';
        } else if (typeEtudesLower.includes('laboratoire') || typeEtudesLower.includes('ex vivo') || typeEtudesLower.includes('ex-vivo')) {
          category = 'laboratoire';
        }

        let serviceType = 'optional';
        const typeLower = mandatoryTypeRaw.toString().toLowerCase();
        if (typeLower.includes('all') || typeLower.includes('toutes')) {
          serviceType = 'mandatory_all';
        } else if (typeLower.includes('clinical') || typeLower.includes('clinique') || typeLower.includes('vivo')) {
          serviceType = 'mandatory_clinical';
        } else if (typeLower.includes('lab') || typeLower.includes('laboratoire')) {
          serviceType = 'mandatory_lab';
        }

        let multiplierType = 'none';
        const multiplierLower = multiplicateurRaw.toString().toLowerCase();

        const isFixedQuantity = multiplierLower.includes('fixe') || multiplierLower.includes('aucun');
        const hasPanelists = multiplierLower.includes('panelist') || multiplierLower.includes('panéliste') || multiplierLower.includes('peau');
        const hasTimepoints = multiplierLower.includes('timepoint') || multiplierLower.includes('temps');
        const hasSkinAndCondition = multiplierLower.includes('skin_and_condition') ||
          (multiplierLower.includes('peau') && multiplierLower.includes('condition') && multiplierLower.includes('excluant'));

        if (isFixedQuantity) {
          multiplierType = 'none';
        } else if (hasSkinAndCondition) {
          multiplierType = 'skin_and_condition';
        } else if (multiplierLower.includes('both') || multiplierLower.includes('×') || (hasPanelists && hasTimepoints)) {
          multiplierType = 'both';
        } else if (hasPanelists) {
          multiplierType = 'panelists';
        } else if (hasTimepoints) {
          multiplierType = 'timepoints';
        }

        if (typeLower.includes('recurring') || typeLower.includes('récurrent')) {
          multiplierType = 'both';
        } else if (typeLower.includes('one_time') || typeLower.includes('ponctuel')) {
          multiplierType = 'panelists';
        }

        importedServices.push({
          name: name.toString().trim(),
          appareil: appareil.trim(),
          langues: langues.toString().trim(),
          base_price: prixUnitaire,
          tva_rate: tvaRate,
          unit: 'unit',
          category: category,
          type: serviceType,
          multiplier_type: multiplierType,
          is_active: true,
          updated_at: new Date().toISOString(),
        });
      });

      if (importedServices.length === 0) {
        alert('No valid services found in the Excel file. Please check the format.');
        return;
      }

      const { error: deleteItemsError } = await supabase
        .from('quotation_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteItemsError) {
        console.error('Error clearing quotation items:', deleteItemsError);
        alert(`Error clearing quotation items: ${deleteItemsError.message}`);
        return;
      }

      const { error: deleteQuotationsError } = await supabase
        .from('quotations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteQuotationsError) {
        console.error('Error clearing quotations:', deleteQuotationsError);
        alert(`Error clearing quotations: ${deleteQuotationsError.message}`);
        return;
      }

      const { error: deleteServicesError } = await supabase
        .from('services')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteServicesError) {
        console.error('Error clearing existing services:', deleteServicesError);
        alert(`Error clearing existing services: ${deleteServicesError.message}`);
        return;
      }

      const { data: insertedData, error } = await supabase
        .from('services')
        .insert(importedServices)
        .select();

      if (error) {
        console.error('Error importing services:', error);
        alert(`Error importing services: ${error.message}`);
      } else {
        alert(`Successfully cleared all existing data and imported ${insertedData?.length || 0} new services${errorCount > 0 ? `. Skipped ${errorCount} invalid rows.` : '.'}`);
        loadServices();
      }
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading file. Please ensure it is a valid Excel file (.xlsx, .xls).');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportTemplate = () => {
    const template = [
      {
        'Langues': 'FR',
        'Type d etudes': 'Clinique',
        'Nom du service': 'Recrutement de panélistes',
        'Appareil': 'Description du service clinique',
        'Prix unitaire': 100.00,
        'TVA': '20%',
        'Mandatory Type': 'Mandatory Clinical',
        'Multiplicateur de Quantité': 'Multiplié par nombre de panélistes/peau'
      },
      {
        'Langues': 'EN',
        'Type d etudes': 'Laboratoire',
        'Nom du service': 'Test Laboratoire',
        'Appareil': 'Description du test laboratoire',
        'Prix unitaire': 250.00,
        'TVA': '20%',
        'Mandatory Type': 'Optional',
        'Multiplicateur de Quantité': 'Quantité fixe (aucun multiplicateur)'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Services');

    const colWidths = [
      { wch: 15 },
      { wch: 25 },
      { wch: 50 },
      { wch: 40 },
      { wch: 15 },
      { wch: 10 },
      { wch: 20 },
      { wch: 50 }
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, 'services_template.xlsx');
  };

  const handleExportServices = () => {
    if (services.length === 0) {
      alert('No services to export.');
      return;
    }

    const exportData = services.map(service => {
      const typeLabel =
        service.type === 'mandatory_all' ? 'Mandatory All' :
        service.type === 'mandatory_clinical' ? 'Mandatory Clinical' :
        service.type === 'mandatory_lab' ? 'Mandatory Lab' :
        service.type === 'recurring' ? 'Recurring' :
        service.type === 'one_time' ? 'One Time' :
        'Optional';

      const multiplierLabel =
        service.multiplier_type === 'both' ? 'Panélistes/Peau_condition × Temps de mesure' :
        service.multiplier_type === 'panelists' ? 'Multiplié par nombre de panélistes/peau' :
        service.multiplier_type === 'timepoints' ? 'Multiplié par nombre de temps de mesure' :
        service.multiplier_type === 'skin_and_condition' ? 'Multiplié par peau et condition only (excluant timepoint)' :
        'Quantité fixe (aucun multiplicateur)';

      return {
        'Langues': service.langues || '',
        'Type d etudes': service.category === 'clinique' ? 'Clinique' : 'Laboratoire',
        'Nom du service': service.name,
        'Appareil': service.appareil || '',
        'Prix unitaire': service.base_price,
        'TVA': `${service.tva_rate || 20}%`,
        'Mandatory Type': typeLabel,
        'Multiplicateur de Quantité': multiplierLabel
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Services');

    const colWidths = [
      { wch: 15 },
      { wch: 25 },
      { wch: 50 },
      { wch: 40 },
      { wch: 15 },
      { wch: 10 },
      { wch: 20 },
      { wch: 50 }
    ];
    worksheet['!cols'] = colWidths;

    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `services_export_${date}.xlsx`);
  };

  const categories = ['general', 'skincare', 'treatment', 'product', 'consultation', 'other'];

  return (
    <div className="bg-white rounded-lg shadow-lg print:hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Services & Tarifs</h2>
          {!isAdding && !editingId && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
            >
              <Plus size={20} />
              Ajouter un Service
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 font-medium shadow-md"
          >
            <Upload size={18} />
            {importing ? 'Import en cours...' : 'Importer Excel'}
          </button>
          <button
            onClick={handleExportTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium shadow-md"
          >
            <Download size={18} />
            Télécharger le Modèle
          </button>
          {services.length > 0 && (
            <button
              onClick={handleExportServices}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium shadow-md"
            >
              <Download size={18} />
              Exporter les Services
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {!isAdding && !editingId && services.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher des services par nom ou appareil..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toutes les Catégories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les Types</option>
                <option value="optional">Optionnel</option>
                <option value="mandatory_all">Obligatoire - Toutes</option>
                <option value="mandatory_clinical">Obligatoire - Clinique</option>
                <option value="mandatory_lab">Obligatoire - Laboratoire</option>
                <option value="recurring">Récurrent</option>
                <option value="one_time">Ponctuel</option>
              </select>
            </div>
          </div>
        )}

        {(isAdding || editingId) && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du Service
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Appareil
                </label>
                <textarea
                  value={formData.appareil}
                  onChange={(e) => setFormData({ ...formData, appareil: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Langues
                </label>
                <input
                  type="text"
                  value={formData.langues}
                  onChange={(e) => setFormData({ ...formData, langues: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="FR, EN, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix de Base (€ HT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.base_price}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TVA (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tva_rate}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setFormData({ ...formData, tva_rate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unité
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ex: session, unité, pièce"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de Service
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="optional">Optionnel</option>
                <option value="mandatory_all">Obligatoire - Toutes les études</option>
                <option value="mandatory_clinical">Obligatoire - Essais cliniques (in vivo)</option>
                <option value="mandatory_lab">Obligatoire - Études laboratoire</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Multiplicateur de Quantité
              </label>
              <select
                value={formData.multiplier_type}
                onChange={(e) => setFormData({ ...formData, multiplier_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="none">Aucun (quantité fixe)</option>
                <option value="panelists">Multiplié par nombre de panélistes/peau</option>
                <option value="timepoints">Multiplié par nombre de temps de mesure</option>
                <option value="both">Multiplié par panélistes/peau_condition × temps</option>
                <option value="skin_and_condition">Multiplié par peau et condition only (excluant timepoint)</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
              >
                <Save size={18} />
                {editingId ? 'Mettre à jour' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium shadow-md"
              >
                <X size={18} />
                Annuler
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {services
            .filter((service) => {
              let matchesSearch = true;
              if (searchTerm !== '') {
                const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 0);
                const searchableText = `${service.name} ${service.appareil || ''} ${service.langues || ''}`.toLowerCase();
                matchesSearch = searchWords.every(word => searchableText.includes(word));
              }

              const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
              const matchesType = typeFilter === 'all' || service.type === typeFilter;

              return matchesSearch && matchesCategory && matchesType;
            })
            .map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-medium text-gray-900">{service.name}</h3>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    {service.category}
                  </span>
                  {service.type && service.type !== 'optional' && (
                    <span className={`px-2 py-1 text-xs rounded font-medium ${
                      service.type === 'mandatory_all' ? 'bg-red-100 text-red-700' :
                      service.type === 'mandatory_clinical' ? 'bg-orange-100 text-orange-700' :
                      service.type === 'mandatory_lab' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {service.type === 'mandatory_all' ? 'Obligatoire - Toutes études' :
                       service.type === 'mandatory_clinical' ? 'Obligatoire - Clinique' :
                       service.type === 'mandatory_lab' ? 'Obligatoire - Laboratoire' : ''}
                    </span>
                  )}
                  {service.multiplier_type && service.multiplier_type !== 'none' && (
                    <span className="px-2 py-1 text-xs rounded font-medium bg-blue-100 text-blue-700">
                      {service.multiplier_type === 'panelists' ? '× Panélistes/Peau' :
                       service.multiplier_type === 'timepoints' ? '× Temps' :
                       service.multiplier_type === 'both' ? '× Panélistes/Peau_condition × Temps' :
                       service.multiplier_type === 'skin_and_condition' ? '× Peau et Condition (sans Temps)' : ''}
                    </span>
                  )}
                </div>
                {service.appareil && (
                  <p className="text-sm text-gray-600 mt-1">{service.appareil}</p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm font-semibold text-blue-600">
                    {formatCurrency(service.base_price)} € HT
                  </span>
                  <span className="text-sm text-gray-500">par {service.unit}</span>
                  <span className="text-sm text-gray-500">TVA: {service.tva_rate || 20}%</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(service)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(service.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {services.length === 0 && !isAdding && (
          <div className="text-center py-12 text-gray-500">
            <p>Aucun service ajouté pour l'instant. Cliquez sur "Ajouter un Service" pour commencer.</p>
          </div>
        )}
      </div>
    </div>
  );
}
