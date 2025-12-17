import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Plus, Eye, Download, DollarSign, Calendar, AlertCircle, Check, FileSpreadsheet } from 'lucide-react';
import { generateInvoicePDF } from '../services/invoicePdfGenerator';
import * as XLSX from 'xlsx';

interface Quotation {
  id: string;
  quotation_number: string;
  customer_company: string;
  customer_name: string;
  total_amount: number;
  vat_rate: number;
  created_at: string;
  invoice_status: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  quotation_id: string;
  invoice_type: 'deposit' | 'final';
  percentage: number | null;
  amount_ht: number;
  amount_ttc: number;
  status: 'unpaid' | 'paid';
  payment_date: string | null;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  quotations: {
    quotation_number: string;
    customer_company: string;
    customer_name: string;
  };
}

export default function InvoiceManager() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [existingInvoices, setExistingInvoices] = useState<Invoice[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'single' | 'period'>('single');
  const [selectedInvoiceForExport, setSelectedInvoiceForExport] = useState<Invoice | null>(null);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceType: 'deposit' as 'deposit' | 'final',
    percentage: 30,
    customPercentage: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: ''
  });

  useEffect(() => {
    loadQuotations();
    loadInvoices();
  }, []);

  const loadQuotations = async () => {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showNotification('error', 'Erreur lors du chargement des devis');
      return;
    }

    setQuotations(data || []);
  };

  const loadInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        quotations (
          quotation_number,
          customer_company,
          customer_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      showNotification('error', 'Erreur lors du chargement des factures');
      return;
    }

    setInvoices(data || []);
  };

  const loadInvoicesForQuotation = async (quotationId: string) => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('quotation_id', quotationId)
      .order('created_at', { ascending: false });

    if (error) {
      showNotification('error', 'Erreur lors du chargement des factures');
      return;
    }

    setExistingInvoices(data || []);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleQuotationSelect = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    loadInvoicesForQuotation(quotation.id);
    setShowCreateForm(true);

    generateInvoiceNumber().then(number => {
      setFormData(prev => ({ ...prev, invoiceNumber: number }));
    });
  };

  const generateInvoiceNumber = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return `INV-${new Date().getFullYear()}-0001`;
    }

    const lastNumber = data[0].invoice_number;
    const match = lastNumber.match(/INV-(\d{4})-(\d{4})/);

    if (match) {
      const year = parseInt(match[1]);
      const number = parseInt(match[2]);
      const currentYear = new Date().getFullYear();

      if (year === currentYear) {
        return `INV-${currentYear}-${String(number + 1).padStart(4, '0')}`;
      }
    }

    return `INV-${new Date().getFullYear()}-0001`;
  };

  const calculateAmount = () => {
    if (!selectedQuotation) return { ht: 0, ttc: 0 };

    const percentage = formData.customPercentage
      ? parseFloat(formData.customPercentage)
      : formData.percentage;

    const vatRate = selectedQuotation.vat_rate || 20;
    const totalTtc = selectedQuotation.total_amount;
    const totalHt = totalTtc / (1 + vatRate / 100);

    if (formData.invoiceType === 'deposit') {
      const amountHt = (totalHt * percentage) / 100;
      const amountTtc = (totalTtc * percentage) / 100;
      return { ht: amountHt, ttc: amountTtc };
    } else {
      const paidAmount = existingInvoices
        .filter(inv => inv.invoice_type === 'deposit')
        .reduce((sum, inv) => sum + inv.amount_ttc, 0);

      const remainingHt = totalHt - (paidAmount * totalHt / totalTtc);
      const remainingTtc = totalTtc - paidAmount;

      return { ht: remainingHt, ttc: remainingTtc };
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedQuotation) return;

    const depositExists = existingInvoices.some(inv => inv.invoice_type === 'deposit');

    if (formData.invoiceType === 'deposit' && depositExists) {
      if (!window.confirm('Une facture d\'acompte existe déjà pour ce devis. Voulez-vous créer une autre facture d\'acompte ?')) {
        return;
      }
    }

    if (formData.invoiceType === 'final' && !depositExists) {
      if (!window.confirm('Aucun acompte n\'a été émis. Voulez-vous créer une facture finale directement ?')) {
        return;
      }
    }

    setLoading(true);

    const amounts = calculateAmount();
    const percentage = formData.invoiceType === 'deposit'
      ? (formData.customPercentage ? parseFloat(formData.customPercentage) : formData.percentage)
      : null;

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: formData.invoiceNumber,
        quotation_id: selectedQuotation.id,
        invoice_type: formData.invoiceType,
        percentage: percentage,
        amount_ht: amounts.ht,
        amount_ttc: amounts.ttc,
        status: 'unpaid',
        issue_date: formData.issueDate,
        due_date: formData.dueDate || null,
        notes: formData.notes || null
      })
      .select()
      .single();

    if (error) {
      showNotification('error', 'Erreur lors de la création de la facture');
      setLoading(false);
      return;
    }

    const totalInvoiced = [...existingInvoices, invoice].reduce((sum, inv) => sum + inv.amount_ttc, 0);
    const newStatus = totalInvoiced >= selectedQuotation.total_amount
      ? 'fully_invoiced'
      : 'partially_invoiced';

    await supabase
      .from('quotations')
      .update({ invoice_status: newStatus })
      .eq('id', selectedQuotation.id);

    showNotification('success', 'Facture créée avec succès');
    setLoading(false);
    setShowCreateForm(false);
    setSelectedQuotation(null);
    loadQuotations();
    loadInvoices();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: '',
      invoiceType: 'deposit',
      percentage: 30,
      customPercentage: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      notes: ''
    });
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    setLoading(true);

    const { data: quotation } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', invoice.quotation_id)
      .single();

    if (quotation) {
      await generateInvoicePDF(invoice, quotation);
    }

    setLoading(false);
  };

  const handleUpdateStatus = async (invoiceId: string, status: 'paid' | 'unpaid') => {
    const updates: any = { status };
    if (status === 'paid') {
      updates.payment_date = new Date().toISOString().split('T')[0];
    } else {
      updates.payment_date = null;
    }

    const { error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', invoiceId);

    if (error) {
      showNotification('error', 'Erreur lors de la mise à jour du statut');
      return;
    }

    showNotification('success', 'Statut mis à jour');
    loadInvoices();
  };

  const handleExportInvoices = async () => {
    let invoicesToExport: Invoice[] = [];

    if (exportType === 'single') {
      if (!selectedInvoiceForExport) {
        showNotification('error', 'Veuillez sélectionner une facture à exporter');
        return;
      }
      invoicesToExport = [selectedInvoiceForExport];
    } else {
      if (!exportDateRange.startDate || !exportDateRange.endDate) {
        showNotification('error', 'Veuillez sélectionner une plage de dates');
        return;
      }

      invoicesToExport = invoices.filter(inv => {
        const issueDate = new Date(inv.issue_date);
        const start = new Date(exportDateRange.startDate);
        const end = new Date(exportDateRange.endDate);
        return issueDate >= start && issueDate <= end;
      });

      if (invoicesToExport.length === 0) {
        showNotification('error', 'Aucune facture trouvée dans cette période');
        return;
      }
    }

    const { data: quotationsData } = await supabase
      .from('quotations')
      .select('id, customer_email, study_type');

    const quotationDataMap = new Map(
      quotationsData?.map(q => [q.id, { email: q.customer_email, studyType: q.study_type }]) || []
    );

    const exportData = invoicesToExport.map(inv => {
      const dueDays = inv.due_date
        ? Math.round((new Date(inv.due_date).getTime() - new Date(inv.issue_date).getTime()) / (1000 * 60 * 60 * 24))
        : 60;

      const quotationData = quotationDataMap.get(inv.quotation_id);
      const emails = quotationData?.email;
      const emailString = Array.isArray(emails) ? emails.join(', ') : emails || '';

      const processus = quotationData?.studyType === 'ex_vivo' ? 'Laboratoire' : 'Clinique';

      return {
        "Date d'émission": new Date(inv.issue_date).toLocaleDateString('fr-FR'),
        "Numéro de devis": inv.quotations.quotation_number,
        "Numéro facture": inv.invoice_number,
        "Delais (Jours)": dueDays,
        "Processus": processus,
        "Type facture": inv.invoice_type === 'deposit' ? `Acompte ${inv.percentage}%` : 'Facture Finale',
        "CLIENT": inv.quotations.customer_company,
        "Mail": emailString,
        "Date de paiment": inv.payment_date ? new Date(inv.payment_date).toLocaleDateString('fr-FR') : '',
        "Statut du paiement": inv.status === 'paid' ? 'Payé' : 'En attente',
        "Action": inv.status === 'paid' ? 'Payé' : 'Impayé',
        "MONTANT TTC": Math.round(inv.amount_ttc) + ' €'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Factures');

    const colWidths = [
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 30 },
      { wch: 30 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 }
    ];
    worksheet['!cols'] = colWidths;

    const filename = exportType === 'single'
      ? `facture_${selectedInvoiceForExport?.invoice_number}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `factures_${exportDateRange.startDate}_${exportDateRange.endDate}.xlsx`;

    XLSX.writeFile(workbook, filename);
    showNotification('success', `${invoicesToExport.length} facture(s) exportée(s) avec succès`);
    setShowExportModal(false);
  };

  const amounts = selectedQuotation ? calculateAmount() : { ht: 0, ttc: 0 };

  const filteredQuotations = quotations.filter(q => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      q.quotation_number.toLowerCase().includes(search) ||
      q.customer_company.toLowerCase().includes(search) ||
      q.customer_name.toLowerCase().includes(search)
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      {notification && (
        <div className={`mb-4 p-4 rounded-lg ${notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {notification.message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">Gestion des Factures</h1>
          </div>
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              if (showCreateForm) {
                setSelectedQuotation(null);
                resetForm();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouvelle Facture
          </button>
        </div>

        {showCreateForm && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Créer une Facture</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher un devis ou client
              </label>
              <input
                type="text"
                placeholder="Rechercher par numéro de devis, société ou nom de client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sélectionner un devis
              </label>
              <select
                value={selectedQuotation?.id || ''}
                onChange={(e) => {
                  const quotation = quotations.find(q => q.id === e.target.value);
                  if (quotation) handleQuotationSelect(quotation);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Choisir un devis --</option>
                {filteredQuotations.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.quotation_number} - {q.customer_company} - {q.customer_name} - {q.total_amount?.toFixed(2) || '0.00'}€ TTC
                    {q.invoice_status === 'partially_invoiced' && ' (Partiellement facturé)'}
                    {q.invoice_status === 'fully_invoiced' && ' (Facturé)'}
                  </option>
                ))}
              </select>
              {searchQuery && filteredQuotations.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">Aucun devis trouvé pour "{searchQuery}"</p>
              )}
              {searchQuery && filteredQuotations.length > 0 && (
                <p className="mt-2 text-sm text-green-600">{filteredQuotations.length} devis trouvé(s)</p>
              )}
            </div>

            {selectedQuotation && (
              <>
                {existingInvoices.length > 0 && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-yellow-800 mb-2">Factures existantes pour ce devis :</p>
                        <ul className="space-y-1">
                          {existingInvoices.map(inv => (
                            <li key={inv.id} className="text-sm text-yellow-700">
                              {inv.invoice_number} - {inv.invoice_type === 'deposit' ? `Acompte ${inv.percentage}%` : 'Solde'} - {inv.amount_ttc.toFixed(2)}€ TTC - {inv.status === 'paid' ? 'Payé' : 'Impayé'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro de facture
                    </label>
                    <input
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de facture
                    </label>
                    <select
                      value={formData.invoiceType}
                      onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value as 'deposit' | 'final' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="deposit">Acompte</option>
                      <option value="final">Facture Finale (Solde)</option>
                    </select>
                  </div>
                </div>

                {formData.invoiceType === 'deposit' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pourcentage d'acompte
                    </label>
                    <div className="flex gap-2 mb-2">
                      {[30, 50].map(pct => (
                        <button
                          key={pct}
                          onClick={() => setFormData({ ...formData, percentage: pct, customPercentage: '' })}
                          className={`px-4 py-2 rounded-lg ${
                            formData.percentage === pct && !formData.customPercentage
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      placeholder="Pourcentage personnalisé"
                      value={formData.customPercentage}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setFormData({ ...formData, customPercentage: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="100"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date d'émission
                    </label>
                    <input
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date d'échéance
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-800">Montants calculés :</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Montant HT</p>
                      <p className="text-lg font-bold text-gray-800">{amounts.ht.toFixed(2)} €</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Montant TTC</p>
                      <p className="text-lg font-bold text-gray-800">{amounts.ttc.toFixed(2)} €</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCreateInvoice}
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Création...' : 'Créer la Facture'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setSelectedQuotation(null);
                      resetForm();
                    }}
                    className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Liste des Factures</h2>
          {invoices.length > 0 && (
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Exporter
            </button>
          )}
        </div>

        {invoices.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucune facture créée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">N° Facture</th>
                  <th className="text-left py-3 px-4">Devis</th>
                  <th className="text-left py-3 px-4">Client</th>
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-right py-3 px-4">Montant TTC</th>
                  <th className="text-center py-3 px-4">Statut</th>
                  <th className="text-center py-3 px-4">Date</th>
                  <th className="text-center py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(invoice => (
                  <tr key={invoice.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{invoice.invoice_number}</td>
                    <td className="py-3 px-4">{invoice.quotations.quotation_number}</td>
                    <td className="py-3 px-4">
                      {invoice.quotations.customer_company}<br />
                      <span className="text-sm text-gray-500">{invoice.quotations.customer_name}</span>
                    </td>
                    <td className="py-3 px-4">
                      {invoice.invoice_type === 'deposit'
                        ? `Acompte ${invoice.percentage}%`
                        : 'Solde'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {invoice.amount_ttc.toFixed(2)} €
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleUpdateStatus(invoice.id, invoice.status === 'paid' ? 'unpaid' : 'paid')}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {invoice.status === 'paid' ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Payé
                          </span>
                        ) : (
                          'Impayé'
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(invoice.issue_date).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleDownloadInvoice(invoice)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Télécharger PDF"
                        >
                          <Download className="w-5 h-5" />
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

      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Exporter les Factures</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type d'export
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="exportType"
                      value="single"
                      checked={exportType === 'single'}
                      onChange={(e) => setExportType(e.target.value as 'single' | 'period')}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">Facture unique</div>
                      <div className="text-sm text-gray-500">Exporter une seule facture</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="exportType"
                      value="period"
                      checked={exportType === 'period'}
                      onChange={(e) => setExportType(e.target.value as 'single' | 'period')}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">Période</div>
                      <div className="text-sm text-gray-500">Exporter toutes les factures d'une période</div>
                    </div>
                  </label>
                </div>
              </div>

              {exportType === 'single' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sélectionner une facture
                  </label>
                  <select
                    value={selectedInvoiceForExport?.id || ''}
                    onChange={(e) => {
                      const invoice = invoices.find(inv => inv.id === e.target.value);
                      setSelectedInvoiceForExport(invoice || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Choisir une facture --</option>
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} - {inv.quotations.customer_company} - {inv.amount_ttc.toFixed(2)}€
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {exportType === 'period' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de début
                    </label>
                    <input
                      type="date"
                      value={exportDateRange.startDate}
                      onChange={(e) => setExportDateRange({ ...exportDateRange, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de fin
                    </label>
                    <input
                      type="date"
                      value={exportDateRange.endDate}
                      onChange={(e) => setExportDateRange({ ...exportDateRange, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleExportInvoices}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Exporter
              </button>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setSelectedInvoiceForExport(null);
                  setExportDateRange({ startDate: '', endDate: '' });
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
