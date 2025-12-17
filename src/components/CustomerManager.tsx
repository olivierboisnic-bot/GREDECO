import { useState, useEffect, useRef } from 'react';
import { Upload, Download, Plus, Trash2, Edit2, Search, Users, FileDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface Customer {
  id: string;
  name: string;
  contact: string;
  emails: string[];
  phone: string;
  position: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  created_at: string;
  updated_at: string;
}

export default function CustomerManager() {
  const [activeTab, setActiveTab] = useState<'list' | 'import' | 'manual'>('list');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    emails: [''],
    phone: '',
    position: '',
    address: '',
    postal_code: '',
    city: '',
    country: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading customers:', error);
    } else {
      setCustomers(data || []);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const existingCustomersCount = customers.length;

    if (existingCustomersCount > 0) {
      const userChoice = window.confirm(
        `Vous avez actuellement ${existingCustomersCount} client(s) dans la base.\n\n` +
        `Cliquez sur "OK" pour SUPPRIMER tous les clients existants et les remplacer par les nouveaux.\n` +
        `Cliquez sur "Annuler" pour AJOUTER les nouveaux clients en complément des existants.`
      );

      if (userChoice) {
        const confirmDelete = window.confirm(
          `⚠️ ATTENTION ⚠️\n\nÊtes-vous vraiment sûr de vouloir supprimer TOUS les ${existingCustomersCount} clients existants ?\n\nCette action est IRRÉVERSIBLE.`
        );

        if (confirmDelete) {
          const { error: deleteError } = await supabase
            .from('customers')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (deleteError) {
            alert(`Erreur lors de la suppression: ${deleteError.message}`);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            return;
          }
        } else {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
      }
    }

    setImporting(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log('Données Excel:', jsonData);
      console.log('Première ligne:', jsonData[0]);

      if (!jsonData || jsonData.length === 0) {
        alert('Le fichier Excel est vide ou mal formaté');
        return;
      }

      const customersToInsert = jsonData.map((row: any) => {
        const findValue = (possibleKeys: string[]) => {
          for (const key of possibleKeys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return String(row[key]).trim();
            }
          }
          return '';
        };

        const email = findValue(['MAIL', 'mail', 'Mail', 'Email', 'email', 'E-mail', 'e-mail']);

        return {
          name: findValue(['CLIENTS', 'clients', 'Client', 'client', 'Nom', 'nom', 'Name', 'name', 'Société', 'société', 'Societe', 'societe', 'Company', 'company', 'Entreprise', 'entreprise']),
          contact: findValue(['CONTACT', 'contact', 'Contact']),
          emails: email ? [email] : [],
          phone: findValue(['Téléphone', 'téléphone', 'Telephone', 'telephone', 'Phone', 'phone', 'Tel', 'tel']),
          position: findValue(['POSTE', 'poste', 'Poste', 'Position', 'position']),
          address: findValue(['Adresse', 'adresse', 'Address', 'address']),
          postal_code: findValue(['Code postal', 'code postal', 'Code Postal', 'postal_code', 'Postal Code', 'ZIP', 'zip']),
          city: findValue(['Ville', 'ville', 'City', 'city']),
          country: findValue(['Pays', 'pays', 'Country', 'country']),
        };
      });

      console.log('Clients à insérer:', customersToInsert);

      const validCustomers = customersToInsert.filter(c => c.name && c.name.length > 0);

      if (validCustomers.length === 0) {
        alert('Aucun client valide trouvé dans le fichier. Vérifiez que la colonne "CLIENTS" contient des données.');
        return;
      }

      const { data: existingCustomers } = await supabase
        .from('customers')
        .select('name, contact, emails');

      // Normalize function to handle variations
      const normalize = (str: string) => {
        return str
          .toLowerCase()
          .trim()
          .replace(/\s+/g, ' ') // Multiple spaces to single space
          .replace(/[\u00C0-\u00C5]/g, 'a') // Accents
          .replace(/[\u00C8-\u00CB]/g, 'e')
          .replace(/[\u00CC-\u00CF]/g, 'i')
          .replace(/[\u00D2-\u00D6]/g, 'o')
          .replace(/[\u00D9-\u00DC]/g, 'u');
      };

      const existingSet = new Set(
        (existingCustomers || []).map(c => {
          // Use name + first email as unique key (more reliable than contact)
          const email = Array.isArray(c.emails) && c.emails.length > 0 ? c.emails[0] : '';
          return `${normalize(c.name)}|${normalize(email)}`;
        })
      );

      const newCustomers = validCustomers.filter(c => {
        const email = c.emails && c.emails.length > 0 ? c.emails[0] : '';
        const key = `${normalize(c.name)}|${normalize(email)}`;
        return !existingSet.has(key);
      });

      const duplicatesCount = validCustomers.length - newCustomers.length;

      if (newCustomers.length === 0) {
        alert(`Aucun nouveau client à importer. Tous les ${validCustomers.length} clients existent déjà dans la base.`);
        loadCustomers();
        setActiveTab('list');
        return;
      }

      const { error } = await supabase
        .from('customers')
        .insert(newCustomers);

      if (error) {
        console.error('Error importing customers:', error);
        alert(`Erreur lors de l'importation: ${error.message}`);
      } else {
        const message = duplicatesCount > 0
          ? `${newCustomers.length} clients importés avec succès.\n${duplicatesCount} doublon(s) ignoré(s).`
          : `${newCustomers.length} clients importés avec succès.`;
        alert(message);
        loadCustomers();
        setActiveTab('list');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert(`Erreur lors du traitement du fichier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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
        'CLIENTS': 'Nom Entreprise 1',
        'CONTACT': 'Jean Dupont',
        'MAIL': 'jean.dupont@example.com',
        'Téléphone': '+33 1 23 45 67 89',
        'POSTE': 'Directeur Marketing',
        'Adresse': '123 Rue de la Paix',
        'Code postal': '75001',
        'Ville': 'Paris',
        'Pays': 'France'
      },
      {
        'CLIENTS': 'Nom Entreprise 2',
        'CONTACT': 'Marie Martin',
        'MAIL': 'marie.martin@example.com',
        'Téléphone': '+33 1 98 76 54 32',
        'POSTE': 'Responsable R&D',
        'Adresse': '456 Avenue des Champs',
        'Code postal': '69002',
        'Ville': 'Lyon',
        'Pays': 'France'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

    const colWidths = [
      { wch: 25 },
      { wch: 20 },
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
      { wch: 30 },
      { wch: 12 },
      { wch: 20 },
      { wch: 15 }
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, 'clients_template.xlsx');
  };

  const handleExportCustomers = () => {
    if (customers.length === 0) {
      alert('Aucun client à exporter.');
      return;
    }

    const exportData = customers.map(customer => ({
      'CLIENTS': customer.name,
      'CONTACT': customer.contact,
      'MAIL': customer.emails[0] || '',
      'Téléphone': customer.phone,
      'POSTE': customer.position,
      'Adresse': customer.address,
      'Code postal': customer.postal_code,
      'Ville': customer.city,
      'Pays': customer.country
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

    const colWidths = [
      { wch: 25 },
      { wch: 20 },
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
      { wch: 30 },
      { wch: 12 },
      { wch: 20 },
      { wch: 15 }
    ];
    worksheet['!cols'] = colWidths;

    const exportDate = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `clients_export_${exportDate}.xlsx`);
  };

  const handleCleanDuplicates = async () => {
    const confirm = window.confirm(
      `⚠️ Nettoyage des doublons\n\n` +
      `Cette action va:\n` +
      `1. Détecter tous les clients avec le même nom et email\n` +
      `2. Garder uniquement le plus récent\n` +
      `3. Supprimer les autres\n\n` +
      `Voulez-vous continuer?`
    );

    if (!confirm) return;

    try {
      const { data: allCustomers, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        alert(`Erreur lors de la récupération des clients: ${fetchError.message}`);
        return;
      }

      if (!allCustomers || allCustomers.length === 0) {
        alert('Aucun client dans la base de données.');
        return;
      }

      // Normalize function
      const normalize = (str: string) => {
        return str
          .toLowerCase()
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/[\u00C0-\u00C5]/g, 'a')
          .replace(/[\u00C8-\u00CB]/g, 'e')
          .replace(/[\u00CC-\u00CF]/g, 'i')
          .replace(/[\u00D2-\u00D6]/g, 'o')
          .replace(/[\u00D9-\u00DC]/g, 'u');
      };

      // Group customers by name + contact + email
      const customerGroups = new Map<string, Customer[]>();

      allCustomers.forEach(customer => {
        const email = Array.isArray(customer.emails) && customer.emails.length > 0 ? customer.emails[0] : '';
        const contact = customer.contact || '';
        const key = `${normalize(customer.name)}|${normalize(contact)}|${normalize(email)}`;

        console.log(`Customer: ${customer.name}, Contact: ${contact}, Email: ${email}, Key: ${key}`);

        if (!customerGroups.has(key)) {
          customerGroups.set(key, []);
        }
        customerGroups.get(key)!.push(customer);
      });

      console.log('Total customers:', allCustomers.length);
      console.log('Unique groups:', customerGroups.size);
      console.log('Customer groups:', Array.from(customerGroups.entries()).map(([key, group]) => ({
        key,
        count: group.length,
        names: group.map(c => c.name)
      })));

      // Find duplicates to delete (keep the most recent one)
      const idsToDelete: string[] = [];
      let duplicateGroupsCount = 0;
      const duplicateDetails: string[] = [];

      customerGroups.forEach((group, key) => {
        if (group.length > 1) {
          duplicateGroupsCount++;
          // Sort by created_at descending (most recent first)
          group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          duplicateDetails.push(`${group[0].name} (${group.length} entrées)`);

          // Keep the first (most recent), delete the rest
          for (let i = 1; i < group.length; i++) {
            idsToDelete.push(group[i].id);
          }
        }
      });

      console.log('Duplicate details:', duplicateDetails);
      console.log('IDs to delete:', idsToDelete);

      if (idsToDelete.length === 0) {
        alert('Aucun doublon trouvé dans la base de données.');
        return;
      }

      const confirmDelete = window.confirm(
        `Trouvé ${duplicateGroupsCount} groupe(s) de doublons:\n\n${duplicateDetails.join('\n')}\n\n` +
        `Total: ${idsToDelete.length} client(s) à supprimer.\n\n` +
        `Voulez-vous continuer avec la suppression?`
      );

      if (!confirmDelete) return;

      // Delete duplicates in batch
      console.log('Starting deletion of IDs:', idsToDelete);

      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .in('id', idsToDelete);

      console.log('Delete error:', deleteError);

      if (deleteError) {
        alert(`❌ Erreur lors de la suppression:\n${deleteError.message}\n\nVoir la console pour plus de détails.`);
        console.error('Delete error details:', deleteError);
      } else {
        alert(`✅ ${idsToDelete.length} doublon(s) supprimé(s) avec succès.`);
      }

      await loadCustomers();
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && editingCustomer) {
      const { error } = await supabase
        .from('customers')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', editingCustomer.id);

      if (error) {
        console.error('Error updating customer:', error);
        alert('Erreur lors de la mise à jour du client');
      } else {
        alert('Client mis à jour avec succès');
        resetForm();
        loadCustomers();
        setActiveTab('list');
      }
    } else {
      const { error } = await supabase
        .from('customers')
        .insert([formData]);

      if (error) {
        console.error('Error creating customer:', error);
        alert('Erreur lors de la création du client');
      } else {
        alert('Client créé avec succès');
        resetForm();
        loadCustomers();
        setActiveTab('list');
      }
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsEditing(true);
    setFormData({
      name: customer.name,
      contact: customer.contact,
      emails: customer.emails.length > 0 ? customer.emails : [''],
      phone: customer.phone,
      position: customer.position,
      address: customer.address,
      postal_code: customer.postal_code,
      city: customer.city,
      country: customer.country,
    });
    setActiveTab('manual');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting customer:', error);
      alert('Erreur lors de la suppression du client');
    } else {
      loadCustomers();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact: '',
      emails: [''],
      phone: '',
      position: '',
      address: '',
      postal_code: '',
      city: '',
      country: '',
    });
    setIsEditing(false);
    setEditingCustomer(null);
  };

  const addEmailField = () => {
    if (formData.emails.length < 4) {
      setFormData({ ...formData, emails: [...formData.emails, ''] });
    }
  };

  const removeEmailField = (index: number) => {
    if (formData.emails.length > 1) {
      const newEmails = formData.emails.filter((_, i) => i !== index);
      setFormData({ ...formData, emails: newEmails });
    }
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...formData.emails];
    newEmails[index] = value;
    setFormData({ ...formData, emails: newEmails });
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.emails.some(email => email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    customer.contact.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Gestion des Clients</h2>
      </div>

      <div className="flex justify-between items-center mb-6 border-b border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'list'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Liste des Clients
          </button>
          <button
            onClick={() => {
              resetForm();
              setActiveTab('manual');
            }}
            className={`px-4 py-2 font-medium ${
              activeTab === 'manual'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Ajout Manuel
          </button>
        </div>

        {activeTab === 'list' && (
          <div className="flex gap-2 pb-2">
            <button
              onClick={handleImportClick}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-md"
            >
              <Upload size={18} />
              {importing ? 'Importation...' : 'Importer'}
            </button>
            <button
              onClick={handleExportTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium shadow-md"
            >
              <FileDown size={18} />
              Template
            </button>
            <button
              onClick={handleExportCustomers}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
            >
              <Download size={18} />
              Exporter
            </button>
            <button
              onClick={handleCleanDuplicates}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium shadow-md"
              title="Nettoyer les doublons existants"
            >
              <Trash2 size={18} />
              Nettoyer doublons
            </button>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx,.xls"
        className="hidden"
      />

      {activeTab === 'list' && (
        <div>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Aucun client trouvé</p>
              <p className="text-gray-400 text-sm mt-2">Commencez par ajouter ou importer des clients</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
              <table className="w-full border-collapse text-[11px]">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-2 py-2 font-semibold text-gray-700">Entreprise</th>
                    <th className="text-left px-2 py-2 font-semibold text-gray-700">Contact</th>
                    <th className="text-left px-2 py-2 font-semibold text-gray-700">Email</th>
                    <th className="text-left px-2 py-2 font-semibold text-gray-700">Tél</th>
                    <th className="text-left px-2 py-2 font-semibold text-gray-700">Poste</th>
                    <th className="text-left px-2 py-2 font-semibold text-gray-700">CP</th>
                    <th className="text-left px-2 py-2 font-semibold text-gray-700">Ville</th>
                    <th className="text-left px-2 py-2 font-semibold text-gray-700">Pays</th>
                    <th className="text-center px-2 py-2 font-semibold text-gray-700 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-2 py-2">
                        <div className="font-medium text-gray-900 truncate max-w-[140px]" title={customer.name}>{customer.name}</div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-gray-700 truncate max-w-[100px]" title={customer.contact}>{customer.contact || '-'}</div>
                      </td>
                      <td className="px-2 py-2">
                        {customer.emails && customer.emails.length > 0 && customer.emails.some(e => e) ? (
                          <div className="text-[10px] max-w-[140px]">
                            {customer.emails.filter(e => e).slice(0, 1).map((email, idx) => (
                              <div key={idx} className="text-gray-700 truncate" title={customer.emails.filter(e => e).join(', ')}>{email}</div>
                            ))}
                            {customer.emails.filter(e => e).length > 1 && (
                              <div className="text-gray-500 text-[9px]">+{customer.emails.filter(e => e).length - 1}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-gray-700 truncate max-w-[90px]" title={customer.phone}>{customer.phone || '-'}</div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-gray-700 truncate max-w-[90px]" title={customer.position}>{customer.position || '-'}</div>
                      </td>
                      <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{customer.postal_code || '-'}</td>
                      <td className="px-2 py-2">
                        <div className="text-gray-700 truncate max-w-[80px]" title={customer.city}>{customer.city || '-'}</div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-gray-700 truncate max-w-[70px]" title={customer.country}>{customer.country || '-'}</div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1 justify-center items-center">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'manual' && (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact
              </label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Email{formData.emails.length > 1 ? 's' : ''}
                </label>
                {formData.emails.length < 4 && (
                  <button
                    type="button"
                    onClick={addEmailField}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un email
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {formData.emails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                      placeholder={`Email ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {formData.emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEmailField(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer cet email"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poste
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code postal
              </label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ville
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pays
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
            >
              {isEditing ? 'Mettre à jour' : 'Créer le client'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveTab('list');
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-md"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
