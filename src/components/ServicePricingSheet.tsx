import { useState, useEffect } from 'react';
import { Search, Euro } from 'lucide-react';
import { supabase, Service } from '../lib/supabase';
import { formatCurrency } from '../utils/numberFormat';

export default function ServicePricingSheet() {
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

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

  const categories = ['general', 'skincare', 'treatment', 'product', 'consultation', 'other'];

  const filteredServices = services.filter((service) => {
    let matchesSearch = true;
    if (searchTerm !== '') {
      const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 0);
      const searchableText = `${service.name} ${service.appareil || ''} ${service.langues || ''}`.toLowerCase();
      matchesSearch = searchWords.every(word => searchableText.includes(word));
    }
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
    const matchesType = typeFilter === 'all' || service.service_type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="bg-white rounded-lg shadow-sm h-[calc(100vh-120px)] flex flex-col">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Euro size={20} className="text-blue-600" />
          Tarifs des Services
        </h3>

        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher des services..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les Types</option>
            <option value="recurring">Récurrent</option>
            <option value="one_time">Ponctuel</option>
          </select>
        </div>

        <div className="mt-3 text-xs text-gray-600">
          {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''} trouvé{filteredServices.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-sm font-medium text-gray-900 leading-tight">
                {service.name}
              </h4>
              <div className="text-sm font-semibold text-blue-600 whitespace-nowrap">
                {formatCurrency(service.base_price)} €
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
              {service.appareil}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                service.service_type === 'recurring'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {service.service_type === 'recurring' ? 'Récurrent' : 'Ponctuel'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                {service.category}
              </span>
            </div>
          </div>
        ))}

        {filteredServices.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            Aucun service trouvé
          </div>
        )}
      </div>
    </div>
  );
}
