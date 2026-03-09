import { useState, useEffect } from 'react';
import { Eye, Download, Pen as Edit2, Trash2, Search } from 'lucide-react';
import { supabase, Quotation, QuotationItem } from '../lib/supabase';
import QuotationPreview from './QuotationPreview';
import { formatCurrency } from '../utils/numberFormat';

interface QuotationListProps {
  onEditQuotation?: (quotationId: string) => void;
}

export default function QuotationList({ onEditQuotation }: QuotationListProps) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [calculatedTotals, setCalculatedTotals] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    loadQuotations();
  }, []);

  const calculateQuotationTotal = async (quotationId: string, globalDiscount: number) => {
    const { data: items, error } = await supabase
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', quotationId);

    if (error || !items) {
      return null;
    }

    const totalTTC = items.reduce((sum, item) => {
      const totalDiscount = (item.discount_percent || 0) + globalDiscount;
      const adjustedUnitPrice = item.unit_price * (1 - totalDiscount / 100);
      const adjustedAmountHT = adjustedUnitPrice * item.quantity;
      const adjustedAmountTTC = adjustedAmountHT * (1 + (item.vat_percent || 20) / 100);
      return sum + adjustedAmountTTC;
    }, 0);

    return totalTTC;
  };

  const loadQuotations = async () => {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading quotations:', error);
    } else {
      console.log('QuotationList - Loaded quotations:', data?.length, 'quotations');
      if (data && data.length > 0) {
        console.log('QuotationList - First quotation sample:', {
          id: data[0].id,
          quotation_number: data[0].quotation_number,
          study_objectives: data[0].study_objectives,
          product_description: data[0].product_description,
          skin_types: data[0].skin_types
        });
      }
      setQuotations(data || []);

      // Calculate totals for all quotations
      const totalsMap = new Map<string, number>();
      if (data) {
        await Promise.all(
          data.map(async (quotation) => {
            const calculatedTotal = await calculateQuotationTotal(
              quotation.id,
              quotation.global_discount_percent || 0
            );
            if (calculatedTotal !== null) {
              totalsMap.set(quotation.id, calculatedTotal);
            }
          })
        );
      }
      setCalculatedTotals(totalsMap);
    }
  };

  const loadQuotationItems = async (quotationId: string) => {
    const { data, error } = await supabase
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', quotationId);

    if (error) {
      console.error('Error loading quotation items:', error);
    } else {
      setQuotationItems(data || []);
    }
  };

  const handleView = async (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    await loadQuotationItems(quotation.id);
    setShowPreview(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this quotation?')) {
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting quotation:', error);
      } else {
        loadQuotations();
      }
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('quotations')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating status:', error);
    } else {
      loadQuotations();
    }
  };

  const filteredQuotations = quotations.filter((q) => {
    const matchesSearch =
      q.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm print:hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Historique des Devis</h2>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom de client, email ou numéro de devis..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les Statuts</option>
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyé</option>
              <option value="accepted">Accepté</option>
              <option value="rejected">Rejeté</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Voir
                </th>
                <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Devis #
                </th>
                <th className="w-48 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="w-40 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Société
                </th>
                <th className="w-28 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valide Jusqu'au
                </th>
                <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supprimer
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredQuotations.map((quotation) => (
                <tr key={quotation.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <button
                      onClick={() => handleView(quotation)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Voir"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900 truncate">
                    {quotation.quotation_number}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900 truncate">{quotation.customer_name}</div>
                    <div className="text-sm text-gray-500 truncate">{quotation.customer_email}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 truncate">
                    {quotation.customer_company || '-'}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                    {formatCurrency(calculatedTotals.get(quotation.id) ?? quotation.total_amount)} €
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={quotation.status}
                      onChange={(e) => handleStatusChange(quotation.id, e.target.value)}
                      className={`w-full px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        quotation.status
                      )}`}
                    >
                      <option value="draft">Brouillon</option>
                      <option value="sent">Envoyé</option>
                      <option value="accepted">Accepté</option>
                      <option value="rejected">Rejeté</option>
                    </select>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {new Date(quotation.valid_until).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEditQuotation && onEditQuotation(quotation.id)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Modifier"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(quotation.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredQuotations.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>Aucun devis trouvé.</p>
          </div>
        )}
      </div>

      {showPreview && selectedQuotation && (
        <QuotationPreview
          quotation={selectedQuotation}
          items={quotationItems}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
