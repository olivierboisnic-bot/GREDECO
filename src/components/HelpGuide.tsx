import { FileText, Euro, ListChecks, Users, BookOpen, ArrowRight, CheckCircle, AlertCircle, HelpCircle, X, Lock, Receipt } from 'lucide-react';
import { useState } from 'react';

interface HelpGuideProps {
  onClose: () => void;
}

export default function HelpGuide({ onClose }: HelpGuideProps) {
  const [activeSection, setActiveSection] = useState<string>('overview');

  const sections = [
    { id: 'overview', title: 'Vue d\'ensemble', icon: BookOpen },
    { id: 'generate', title: 'Générer un Devis', icon: FileText },
    { id: 'history', title: 'Historique', icon: ListChecks },
    { id: 'invoices', title: 'Factures', icon: Receipt },
    { id: 'customers', title: 'Clients', icon: Users },
    { id: 'services', title: 'Services & Tarifs', icon: Euro },
    { id: 'security', title: 'Sécurité', icon: Lock },
    { id: 'tips', title: 'Astuces', icon: HelpCircle },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen size={32} />
            <div>
              <h2 className="text-2xl font-bold">Guide d'Utilisation</h2>
              <p className="text-blue-100 text-sm mt-1">Générateur de Devis GREDECO</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <nav className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
            <div className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                      activeSection === section.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium text-sm">{section.title}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="flex-1 overflow-y-auto p-8">
            {activeSection === 'overview' && <OverviewSection />}
            {activeSection === 'generate' && <GenerateSection />}
            {activeSection === 'history' && <HistorySection />}
            {activeSection === 'invoices' && <InvoicesSection />}
            {activeSection === 'customers' && <CustomersSection />}
            {activeSection === 'services' && <ServicesSection />}
            {activeSection === 'security' && <SecuritySection />}
            {activeSection === 'tips' && <TipsSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Bienvenue dans le Générateur de Devis GREDECO</h3>
        <p className="text-gray-600 leading-relaxed">
          Cet outil vous permet de créer des devis professionnels pour des études cliniques et cosmétiques
          de manière rapide et automatisée. Il gère automatiquement les calculs de quantités, les prix,
          et génère des PDF prêts à être envoyés à vos clients.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <FileText className="text-blue-600 mb-2" size={28} />
          <h4 className="font-semibold text-gray-900 mb-1">Générer un Devis</h4>
          <p className="text-sm text-gray-600">Créez des devis personnalisés avec objectifs et services</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <ListChecks className="text-green-600 mb-2" size={28} />
          <h4 className="font-semibold text-gray-900 mb-1">Historique</h4>
          <p className="text-sm text-gray-600">Consultez, modifiez et exportez vos devis passés</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <Users className="text-purple-600 mb-2" size={28} />
          <h4 className="font-semibold text-gray-900 mb-1">Clients</h4>
          <p className="text-sm text-gray-600">Gérez votre base de données clients</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <Euro className="text-orange-600 mb-2" size={28} />
          <h4 className="font-semibold text-gray-900 mb-1">Services & Tarifs</h4>
          <p className="text-sm text-gray-600">Administrez le catalogue de services et prix</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <Lock className="text-red-600 mb-2" size={28} />
          <h4 className="font-semibold text-gray-900 mb-1">Sécurité</h4>
          <p className="text-sm text-gray-600">Authentification sécurisée et gestion de mot de passe</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <HelpCircle className="text-gray-600 mb-2" size={28} />
          <h4 className="font-semibold text-gray-900 mb-1">Astuces</h4>
          <p className="text-sm text-gray-600">Conseils et bonnes pratiques pour optimiser votre utilisation</p>
        </div>

        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <Receipt className="text-teal-600 mb-2" size={28} />
          <h4 className="font-semibold text-gray-900 mb-1">Factures</h4>
          <p className="text-sm text-gray-600">Créez et gérez des factures d'acompte et finales pour vos devis</p>
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-yellow-900 mb-1">Conseil de démarrage</h4>
            <p className="text-sm text-yellow-800">
              Commencez par ajouter vos clients dans la section "Clients", puis créez votre premier devis
              dans "Générer un Devis". Le système calculera automatiquement les quantités selon le type d'étude.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GenerateSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Générer un Devis</h3>
        <p className="text-gray-600">Cette section vous permet de créer un nouveau devis étape par étape.</p>
      </div>

      <div className="space-y-4">
        <StepCard
          number={1}
          title="Filtrer les Services par Langue"
          description="En haut du formulaire, sélectionnez les langues des services que vous souhaitez afficher :"
          details={[
            'Français (FR) : Affiche les services en français (coché par défaut)',
            'English (EN) : Affiche les services en anglais',
            'Vous pouvez sélectionner les deux langues simultanément',
            'Au moins une langue doit être sélectionnée',
          ]}
        />

        <StepCard
          number={2}
          title="Charger un Devis Précédent (Optionnel)"
          description="Gagnez du temps en important les données d'un devis existant :"
          details={[
            'Sélectionnez un devis dans la liste déroulante',
            'Cliquez sur "Charger ce Devis"',
            'Toutes les informations (client, étude, objectifs, services) seront pré-remplies',
            'Vous pouvez ensuite modifier n\'importe quel élément selon vos besoins',
            'Idéal pour des études similaires ou des clients récurrents',
          ]}
        />

        <StepCard
          number={3}
          title="Informations du Client"
          description="Sélectionnez un client existant ou créez-en un nouveau. Le système récupère automatiquement ses coordonnées."
        />

        <StepCard
          number={4}
          title="Design de l'Étude"
          description="Configurez les paramètres de base de votre étude :"
          details={[
            'Type d\'étude : In Vivo (études cliniques) ou Ex Vivo (tests en laboratoire)',
            'Nombre de panélistes : Définit le nombre de sujets/échantillons',
            'Nombre de conditions : Pour les études Ex Vivo uniquement',
            'Méthodologie : Description de l\'approche de l\'étude',
          ]}
        />

        <StepCard
          number={5}
          title="Objectifs de l'Étude"
          description="Définissez ce que vous souhaitez évaluer :"
          details={[
            'Utilisez les boutons rapides (Blanchissement, Anti-âge, etc.) pour ajouter des objectifs prédéfinis',
            'Ou créez des objectifs personnalisés',
            'Associez des services à chaque objectif',
            'Définissez les timepoints pour chaque service',
            'Utilisez les timepoints raccourcis (T0, T7, T28, T56) ou créez des timepoints personnalisés',
            'Timepoints personnalisés : jours (T1, T14, T42) ou heures (T2H, T8H, T24H)',
            'Le système trie automatiquement les timepoints dans l\'ordre chronologique',
          ]}
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Calcul Automatique des Quantités</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p><strong>Services "timepoints"</strong> : Quantité = Nombre de timepoints</p>
                <p><strong>Services "panelists"</strong> : Quantité = Nombre de panélistes</p>
                <p><strong>Services "both"</strong> :</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>In Vivo : Quantité = Panélistes × Timepoints</li>
                  <li>Ex Vivo : Quantité = (Panélistes × Conditions) × Timepoints</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <StepCard
          number={6}
          title="Révision et Ajustements"
          description="Avant de sauvegarder :"
          details={[
            'Vérifiez toutes les quantités calculées automatiquement',
            'Modifiez manuellement les quantités si nécessaire',
            'Ajoutez des remises sur les services',
            'Ajoutez des notes supplémentaires',
            'Définissez la période de validité du devis',
          ]}
        />

        <StepCard
          number={7}
          title="Sauvegarder et Exporter"
          description="Une fois satisfait, cliquez sur 'Sauvegarder le Devis'. Vous serez redirigé vers l'historique où vous pourrez télécharger le PDF."
        />
      </div>

      <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-green-900 mb-1">Astuce Pro</h4>
            <p className="text-sm text-green-800">
              Utilisez la fonction "Charger un Devis Précédent" en haut du formulaire pour reprendre un devis similaire et gagner du temps.
              Toutes les données seront pré-remplies et modifiables. Vous pouvez également utiliser "Importer ce devis" depuis l'historique.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistorySection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Historique des Devis</h3>
        <p className="text-gray-600">Gérez tous vos devis créés depuis cette interface.</p>
      </div>

      <div className="space-y-4">
        <FeatureCard
          icon={<ListChecks className="text-blue-600" size={24} />}
          title="Visualisation"
          description="Consultez la liste complète de tous vos devis avec leurs informations clés : client, montant total, date de création."
        />

        <FeatureCard
          icon={<FileText className="text-green-600" size={24} />}
          title="Aperçu et Téléchargement"
          description="Cliquez sur 'Aperçu' pour voir le devis formaté. Utilisez 'Télécharger PDF' pour obtenir un document professionnel prêt à envoyer."
        />

        <FeatureCard
          icon={<ArrowRight className="text-purple-600" size={24} />}
          title="Édition"
          description="Modifiez un devis existant en cliquant sur 'Modifier'. Vous serez redirigé vers la page de génération avec toutes les données pré-remplies."
        />

        <FeatureCard
          icon={<Users className="text-orange-600" size={24} />}
          title="Import"
          description="Utilisez 'Importer ce devis' pour créer un nouveau devis basé sur un devis existant. Pratique pour des clients récurrents ou des études similaires."
        />

        <FeatureCard
          icon={<Receipt className="text-teal-600" size={24} />}
          title="Gérer les Factures"
          description="Cliquez sur 'Gérer factures' pour accéder à la gestion des factures associées à un devis. Créez des factures d'acompte ou finales."
        />
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-yellow-900 mb-1">Note importante</h4>
            <p className="text-sm text-yellow-800">
              Les devis sont automatiquement sauvegardés dans la base de données.
              Assurez-vous de bien vérifier les informations avant de télécharger le PDF final.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoicesSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Gestion des Factures</h3>
        <p className="text-gray-600">Créez et gérez des factures d'acompte et finales pour vos devis validés.</p>
      </div>

      <div className="space-y-4">
        <FeatureCard
          icon={<Receipt className="text-blue-600" size={24} />}
          title="Accès aux Factures"
          description="Pour gérer les factures d'un devis :"
          details={[
            'Allez dans la section "Historique des Devis"',
            'Cliquez sur le bouton "Gérer factures" du devis concerné',
            'Vous accéderez à la liste de toutes les factures liées à ce devis',
          ]}
        />

        <FeatureCard
          icon={<FileText className="text-green-600" size={24} />}
          title="Facture d'Acompte"
          description="Créez une facture pour un paiement partiel :"
          details={[
            'Cliquez sur "Nouvelle Facture" puis "Facture d\'acompte"',
            'Définissez le pourcentage de l\'acompte (ex: 30%, 50%)',
            'Le montant sera automatiquement calculé',
            'Ajoutez une date d\'échéance et des notes si nécessaire',
            'La facture sera générée en PDF avec un en-tête violet élégant',
          ]}
        />

        <FeatureCard
          icon={<CheckCircle className="text-purple-600" size={24} />}
          title="Facture Finale"
          description="Créez la facture de solde une fois l'acompte reçu :"
          details={[
            'Cliquez sur "Nouvelle Facture" puis "Facture finale"',
            'Le système déduit automatiquement l\'acompte déjà versé',
            'Le solde restant à payer est calculé automatiquement',
            'Si aucun acompte n\'a été versé, le montant total du devis sera facturé',
          ]}
        />

        <FeatureCard
          icon={<AlertCircle className="text-orange-600" size={24} />}
          title="Suivi des Paiements"
          description="Gérez le statut de vos factures :"
          details={[
            'Marquez une facture comme "Payée" une fois le paiement reçu',
            'Enregistrez la date de paiement',
            'Consultez l\'historique complet des factures d\'un devis',
            'Téléchargez les PDFs à tout moment pour envoi ou archivage',
          ]}
        />

        <FeatureCard
          icon={<Euro className="text-red-600" size={24} />}
          title="Calculs Automatiques"
          description="Le système gère automatiquement :"
          details={[
            'Calcul du montant HT et TVA selon le taux du devis',
            'Déduction des acomptes versés dans la facture finale',
            'Numérotation automatique des factures (format : FA-YYYY-XXXX)',
            'Affichage détaillé avec référence au devis d\'origine',
          ]}
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Design de la Facture</h4>
            <p className="text-sm text-blue-800">
              Les factures sont générées avec un design professionnel incluant :
              un en-tête avec fond violet doux, le logo GREDECO, les informations complètes
              du client et de l'entreprise, un tableau détaillé des montants, et toutes les
              mentions légales requises.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-green-900 mb-1">Bonnes Pratiques</h4>
            <p className="text-sm text-green-800">
              Commencez par créer une facture d'acompte (généralement 30-50% du montant total).
              Une fois l'acompte reçu et le travail terminé, créez la facture finale qui calculera
              automatiquement le solde restant. Marquez chaque facture comme payée dès réception du paiement
              pour un suivi optimal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomersSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Gestion des Clients</h3>
        <p className="text-gray-600">Centralisez les informations de vos clients pour une utilisation facile lors de la création de devis.</p>
      </div>

      <div className="space-y-4">
        <FeatureCard
          icon={<Users className="text-blue-600" size={24} />}
          title="Ajouter un Client"
          description="Créez une fiche client avec les informations essentielles :"
          details={[
            'Nom complet du client',
            'Nom de l\'entreprise',
            'Adresse email (peut en ajouter plusieurs)',
            'Numéro de téléphone',
            'Adresse complète',
          ]}
        />

        <FeatureCard
          icon={<FileText className="text-green-600" size={24} />}
          title="Modifier un Client"
          description="Mettez à jour les informations d'un client existant à tout moment. Les modifications seront automatiquement reflétées dans les nouveaux devis."
        />

        <FeatureCard
          icon={<AlertCircle className="text-red-600" size={24} />}
          title="Supprimer un Client"
          description="Supprimez un client de votre base de données. Attention : cette action est irréversible."
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Emails Multiples</h4>
            <p className="text-sm text-blue-800">
              Vous pouvez ajouter plusieurs adresses email pour un même client.
              Appuyez sur "Entrée" après chaque email pour l'ajouter à la liste.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServicesSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Services & Tarifs</h3>
        <p className="text-gray-600">Gérez votre catalogue de services, prix et configurations.</p>
      </div>

      <div className="space-y-4">
        <FeatureCard
          icon={<Euro className="text-blue-600" size={24} />}
          title="Catalogue de Services"
          description="Consultez et gérez tous les services disponibles avec leurs prix de base, descriptions et configurations."
        />

        <FeatureCard
          icon={<FileText className="text-green-600" size={24} />}
          title="Types de Services"
          description="Les services sont organisés par types :"
          details={[
            'Mandatory All : Services obligatoires pour toutes les études',
            'Mandatory Clinical : Services obligatoires uniquement pour les études In Vivo',
            'Optional : Services optionnels que vous pouvez ajouter selon les besoins',
          ]}
        />

        <FeatureCard
          icon={<AlertCircle className="text-purple-600" size={24} />}
          title="Types de Multiplicateurs"
          description="Détermine comment les quantités sont calculées :"
          details={[
            'Panelists : Quantité = Nombre de panélistes',
            'Timepoints : Quantité = Nombre de timepoints',
            'Both : Quantité calculée selon panélistes ET timepoints (différent pour In Vivo / Ex Vivo)',
          ]}
        />

        <FeatureCard
          icon={<CheckCircle className="text-orange-600" size={24} />}
          title="TVA, Langues et Conditions"
          description="Chaque service peut avoir une TVA spécifique (20% par défaut). Les langues disponibles (FR/EN) permettent de filtrer les services. Les conditions d'utilisation peuvent être ajoutées pour clarifier les prérequis."
        />
      </div>

      <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-green-900 mb-1">Recherche de Services</h4>
            <p className="text-sm text-green-800">
              Utilisez la barre de recherche pour trouver rapidement un service par nom, description ou type.
              La recherche est instantanée et fonctionne sur tous les champs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Sécurité et Authentification</h3>
        <p className="text-gray-600">Gérez votre compte et votre accès à l'application en toute sécurité.</p>
      </div>

      <div className="space-y-4">
        <FeatureCard
          icon={<Lock className="text-blue-600" size={24} />}
          title="Connexion Sécurisée"
          description="L'application utilise un système d'authentification sécurisé :"
          details={[
            'Authentification par email et mot de passe',
            'Seuls les emails autorisés peuvent créer un compte',
            'Session sécurisée avec tokens cryptés',
            'Déconnexion automatique après inactivité',
          ]}
        />

        <FeatureCard
          icon={<Lock className="text-green-600" size={24} />}
          title="Première Connexion"
          description="Pour votre première connexion :"
          details={[
            'Cliquez sur l\'onglet "Inscription" sur la page de connexion',
            'Entrez votre email professionnel autorisé',
            'Choisissez un mot de passe sécurisé (minimum 6 caractères)',
            'Votre compte sera créé et vous serez connecté automatiquement',
          ]}
        />

        <FeatureCard
          icon={<AlertCircle className="text-orange-600" size={24} />}
          title="Mot de Passe Oublié"
          description="Si vous avez oublié votre mot de passe :"
          details={[
            'Cliquez sur "Mot de passe oublié ?" sur la page de connexion',
            'Entrez votre adresse email',
            'Vous recevrez un email avec un lien de réinitialisation',
            'Cliquez sur le lien dans l\'email',
            'Vous serez redirigé vers un formulaire pour définir un nouveau mot de passe',
            'Entrez et confirmez votre nouveau mot de passe',
            'Vous serez automatiquement connecté avec votre nouveau mot de passe',
          ]}
        />

        <FeatureCard
          icon={<CheckCircle className="text-purple-600" size={24} />}
          title="Se Souvenir de Moi"
          description="Pour faciliter vos connexions futures :"
          details={[
            'Cochez la case "Se souvenir de mes identifiants" lors de la connexion',
            'Vos identifiants seront sauvegardés de manière sécurisée sur cet appareil',
            'Vous pourrez vous reconnecter rapidement sans ressaisir vos informations',
            'Cette option est recommandée uniquement sur vos appareils personnels',
          ]}
        />
      </div>

      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-red-900 mb-1">Sécurité Importante</h4>
            <p className="text-sm text-red-800">
              Ne partagez jamais vos identifiants de connexion avec d'autres personnes.
              Si vous pensez que votre compte a été compromis, réinitialisez immédiatement votre mot de passe
              et contactez l'administrateur système.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Conseils de Sécurité</h4>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• Utilisez un mot de passe unique et complexe</li>
              <li>• Ne réutilisez pas un mot de passe utilisé sur d'autres sites</li>
              <li>• Déconnectez-vous toujours après avoir fini d'utiliser l'application sur un appareil partagé</li>
              <li>• Vérifiez l'URL de l'application avant d'entrer vos identifiants</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function TipsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Astuces et Bonnes Pratiques</h3>
        <p className="text-gray-600">Optimisez votre utilisation du générateur de devis avec ces conseils.</p>
      </div>

      <div className="space-y-4">
        <TipCard
          number={1}
          title="Utilisez les Raccourcis d'Objectifs"
          description="Les boutons 'Ajout Rapide d'Objectifs' (Blanchissement, Anti-âge, etc.) pré-remplissent automatiquement les services les plus courants pour ces types d'études."
        />

        <TipCard
          number={2}
          title="Vérifiez Toujours les Quantités"
          description="Bien que le système calcule automatiquement les quantités, vérifiez-les toujours avant de sauvegarder. Vous pouvez les modifier manuellement si nécessaire."
        />

        <TipCard
          number={3}
          title="Dupliquez les Devis Similaires"
          description="Pour gagner du temps, utilisez la fonction 'Charger un Devis Précédent' en haut du formulaire de génération, ou cliquez sur 'Importer ce devis' dans l'historique pour créer un nouveau devis basé sur un devis existant."
        />

        <TipCard
          number={4}
          title="Timepoints Personnalisés"
          description="Vous pouvez définir des timepoints spécifiques pour chaque service. Utilisez les raccourcis T0, T7, T28, T56 ou créez vos propres timepoints personnalisés en jours (T14, T42) ou en heures (T2H, T8H, T24H). Le système les triera automatiquement dans l'ordre chronologique."
        />

        <TipCard
          number={5}
          title="Remises et Notes"
          description="N'oubliez pas d'ajouter des remises si nécessaire et utilisez la section 'Notes' pour des informations complémentaires importantes."
        />

        <TipCard
          number={6}
          title="Différence In Vivo / Ex Vivo"
          description="Comprendre la différence est crucial : In Vivo = études cliniques sur personnes, Ex Vivo = tests en laboratoire. Cela impacte le calcul des quantités."
        />

        <TipCard
          number={7}
          title="Filtrage par Langue"
          description="Utilisez le filtre de langue en haut du formulaire pour afficher uniquement les services en français ou en anglais selon vos besoins. Cela réduit la liste et facilite la sélection."
        />

        <TipCard
          number={8}
          title="Sauvegarde Automatique"
          description="Tous vos devis sont automatiquement sauvegardés dans la base de données. Vous pouvez les retrouver à tout moment dans l'historique."
        />
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={24} />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2 text-lg">Besoin d'Aide ?</h4>
            <p className="text-sm text-blue-800">
              Si vous rencontrez des problèmes ou avez des questions sur l'utilisation de cet outil,
              n'hésitez pas à contacter le support technique GREDECO. L'équipe est là pour vous aider
              à tirer le meilleur parti de ce système de génération de devis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({ number, title, description, details }: { number: number; title: string; description: string; details?: string[] }) {
  return (
    <div className="flex gap-4 bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
          {number}
        </div>
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
        <p className="text-sm text-gray-600 mb-2">{description}</p>
        {details && (
          <ul className="space-y-1 mt-2">
            {details.map((detail, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                <ArrowRight className="flex-shrink-0 text-blue-600 mt-0.5" size={16} />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, details }: { icon: React.ReactNode; title: string; description: string; details?: string[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
          {details && (
            <ul className="space-y-1 mt-2">
              {details.map((detail, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                  <CheckCircle className="flex-shrink-0 text-green-600 mt-0.5" size={14} />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function TipCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
          {number}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );
}
