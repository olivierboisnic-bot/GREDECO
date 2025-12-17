import { useState, useEffect } from 'react';
import { FileText, Euro, ListChecks, Users, HelpCircle, LogOut, Receipt } from 'lucide-react';
import ServiceManager from './components/ServiceManager';
import QuotationGenerator from './components/QuotationGenerator';
import QuotationList from './components/QuotationList';
import CustomerManager from './components/CustomerManager';
import InvoiceManager from './components/InvoiceManager';
import GredecoLogo from './components/GredecoLogo';
import HelpGuide from './components/HelpGuide';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { LoginPage } from './components/LoginPage';
import { UpdatePasswordPage } from './components/UpdatePasswordPage';
import { supabase } from './lib/supabase';

type Tab = 'services' | 'generate' | 'history' | 'customers' | 'invoices';

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [hasUnsavedData, setHasUnsavedData] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    return hashParams.get('type') === 'recovery';
  });

  useEffect(() => {
    const checkRecoveryMode = () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      if (hashParams.get('type') === 'recovery') {
        setIsPasswordRecovery(true);
      }
    };

    checkRecoveryMode();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleQuotationCreated = () => {
    setHasUnsavedData(false);
    setActiveTab('history');
    setRefreshKey((prev) => prev + 1);
    setEditingQuotationId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditQuotation = (quotationId: string) => {
    setEditingQuotationId(quotationId);
    setActiveTab('generate');
  };

  const handleCancelEdit = () => {
    setEditingQuotationId(null);
  };

  const handleTabChange = (newTab: Tab) => {
    if (activeTab === 'generate' && hasUnsavedData && newTab !== 'generate') {
      const confirmed = window.confirm(
        '⚠️ Attention : Vous avez des données non sauvegardées dans le générateur de devis.\n\n' +
        'Si vous changez d\'onglet maintenant, toutes les données saisies (objectifs, services sélectionnés, etc.) seront perdues.\n\n' +
        'Voulez-vous vraiment quitter sans sauvegarder ?'
      );

      if (!confirmed) {
        return;
      }

      setHasUnsavedData(false);
    }

    setActiveTab(newTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      await signOut();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (isPasswordRecovery) {
    return <UpdatePasswordPage />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div id="app-main" className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <GredecoLogo size={60} />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Générateur de Devis GREDECO</h1>
                <p className="text-sm text-gray-600 mt-1">Système automatisé de génération de devis</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end mr-4">
                <p className="text-sm text-gray-700 font-medium">{user.email}</p>
                <p className="text-xs text-gray-500">Connecté</p>
              </div>
              <button
                onClick={() => setShowHelp(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-medium"
              >
                <HelpCircle size={20} />
                Guide
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
                title="Se déconnecter"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            <button
              onClick={() => handleTabChange('generate')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
                activeTab === 'generate'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <FileText size={20} />
              Générer un Devis
            </button>
            <button
              onClick={() => handleTabChange('history')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <ListChecks size={20} />
              Historique des Devis
            </button>
            <button
              onClick={() => handleTabChange('customers')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
                activeTab === 'customers'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Users size={20} />
              Clients
            </button>
            <button
              onClick={() => handleTabChange('invoices')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
                activeTab === 'invoices'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Receipt size={20} />
              Factures
            </button>
            <button
              onClick={() => handleTabChange('services')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
                activeTab === 'services'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Euro size={20} />
              Services & Tarifs
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'services' && <ServiceManager />}
        {activeTab === 'generate' && (
          <QuotationGenerator
            onQuotationCreated={handleQuotationCreated}
            editingQuotationId={editingQuotationId}
            onCancelEdit={handleCancelEdit}
            onDataChange={setHasUnsavedData}
          />
        )}
        {activeTab === 'history' && <QuotationList key={refreshKey} onEditQuotation={handleEditQuotation} />}
        {activeTab === 'customers' && <CustomerManager />}
        {activeTab === 'invoices' && <InvoiceManager />}
      </main>

      {showHelp && <HelpGuide onClose={() => setShowHelp(false)} />}

      <footer className="bg-white border-t border-gray-200 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>Générateur de Devis GREDECO</p>
            <p className="mt-1 text-xs text-gray-500">Optimisez votre processus de devis avec une automatisation intelligente</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
