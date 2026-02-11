export type Language = 'fr' | 'en';

interface Translations {
  date: string;
  quoteNumber: string;
  study: string;
  client: string;
  studyDesign: string;
  studyObjectives: string;
  numberOfPanelists: string;
  numberOfSkinFibroblast: string;
  description: string;
  unit: string;
  unitPriceExclTax: string;
  totalPriceExclTax: string;
  vat: string;
  objective: string;
  mandatoryServices: string;
  measurementTimeDuration: string;
  panelistsCompensationProvidedByClient: string;
  totalExclTax: string;
  totalVat: string;
  totalInclTax: string;
  taxCreditText: string;
  agreementForApproval: string;
  investigatorSignature: string;
  promoterSignature: string;
  bankingInformation: string;
  bankAccount: string;
  contact: string;
  termsAndConditionsTitle: string;
  termsAndConditions: Array<{ title: string; text: string }>;
}

export const translations: Record<Language, Translations> = {
  fr: {
    date: 'Date:',
    quoteNumber: 'N° Devis:',
    study: 'Étude:',
    client: 'Client:',
    studyDesign: 'DESIGN DE L\'ÉTUDE',
    studyObjectives: 'Objectifs de l\'Étude:',
    numberOfPanelists: 'Nombre de Panélistes:',
    numberOfSkinFibroblast: 'Nombre de Peau/Fibroblaste:',
    description: 'Description',
    unit: 'Unité',
    unitPriceExclTax: 'Prix U HT',
    totalPriceExclTax: 'Prix T HT',
    vat: 'TVA',
    objective: 'OBJECTIF',
    mandatoryServices: 'SERVICES OBLIGATOIRES',
    measurementTimeDuration: 'Temps de mesure/Durée:',
    panelistsCompensationProvidedByClient: 'Indemnisation des panélistes - Fournis par le client',
    totalExclTax: 'Total HT',
    totalVat: 'Total TVA',
    totalInclTax: 'Total TTC',
    taxCreditText: 'GREDECO a reçu l\'agrément en ce qui concerne le crédit d\'impôt en faveur de la recherche de 2022 à 2026',
    agreementForApproval: 'Bon pour accord',
    investigatorSignature: 'Signature Investigateur',
    promoterSignature: 'Signature promoteur',
    bankingInformation: 'Informations bancaires',
    bankAccount: 'Compte Crédit Agricole de Normandie-Seine',
    contact: 'Contact',
    termsAndConditionsTitle: 'CONDITIONS GÉNÉRALES DE VENTE',
    termsAndConditions: [
      {
        title: 'Article 1 - Objet',
        text: 'Les présentes conditions générales de vente s\'appliquent à toutes les prestations de services effectuées par GREDECO. Toute commande implique l\'acceptation sans réserve par l\'acheteur et son adhésion pleine et entière aux présentes conditions générales de vente qui prévalent sur tout autre document de l\'acheteur.'
      },
      {
        title: 'Article 2 - Prix',
        text: 'Les prix des prestations sont ceux en vigueur au jour de la prise de commande. Ils sont libellés en euros et calculés hors taxes. Par voie de conséquence, ils seront majorés du taux de TVA et des frais de transport applicables au jour de la commande. GREDECO s\'accorde le droit de modifier ses tarifs à tout moment. Toutefois, elle s\'engage à facturer les marchandises commandées aux prix indiqués lors de l\'enregistrement de la commande.'
      },
      {
        title: 'Article 3 - Escompte',
        text: 'Aucun escompte ne sera consenti en cas de paiement anticipé.'
      },
      {
        title: 'Article 4 - Modalités de paiement',
        text: 'Les modalités de règlement du montant total du devis s\'établiront comme suit :\n\nAcompte : Un acompte de 50% du montant total du devis sera exigible à la signature du devis, paiement sous quinzaine.\n\nSolde : Le solde restant, soit 50% du montant total, sera réglé à 30 jours à compter de la date d\'émission du rapport d\'étude final.\n\nMoyens de Paiement : Les règlements peuvent être effectués :\n* Soit par chèque\n* Soit par virement bancaire'
      },
      {
        title: 'Article 5 - Retard de paiement',
        text: 'En cas de défaut de paiement total ou partiel des marchandises livrées au jour de la réception, l\'acheteur doit verser à la société GREDECO une pénalité de retard égale à trois fois le taux de l\'intérêt légal. Le taux de l\'intérêt légal retenu est celui en vigueur au jour de la livraison des marchandises. Cette pénalité est calculée sur le montant TTC de la somme restant due, et court à compter de la date d\'échéance du prix sans qu\'aucune mise en demeure préalable ne soit nécessaire.'
      },
      {
        title: 'Article 6 - Clause résolutoire',
        text: 'Si dans les quinze jours qui suivent la mise en œuvre de la clause « Retard de paiement », l\'acheteur ne s\'est pas acquitté des sommes restant dues, la vente sera résolue de plein droit et pourra ouvrir droit à l\'allocation de dommages et intérêts au profit de la société GREDECO.'
      },
      {
        title: 'Article 7 - Clause de réserve de propriété',
        text: 'La société GREDECO conserve la propriété des biens vendus jusqu\'au paiement intégral du prix, en principal et accessoires. À ce titre, si l\'acheteur fait l\'objet d\'un redressement ou d\'une liquidation judiciaire, la société GREDECO se réserve le droit de revendiquer, dans le cadre de la procédure collective, les marchandises vendues et restées impayées.'
      },
      {
        title: 'Article 8 - Clause de compétence territoriale',
        text: 'Tout litige relatif à l\'interprétation et à l\'exécution des présentes conditions générales de vente est soumis au droit français. À défaut de résolution amiable, le litige sera porté devant le Tribunal de Commerce de Paris.'
      },
      {
        title: 'Article 9 - Force majeure',
        text: 'La responsabilité de GREDECO ne pourra pas être mise en œuvre si la non-exécution ou le retard dans l\'exécution de l\'une de ses obligations découle d\'un cas de force majeure. À ce titre, la force majeure s\'entend de tout événement extérieur, imprévisible et irrésistible au sens de l\'article 1148 du Code civil.'
      },
      {
        title: 'Article 10 - Acceptation du client',
        text: 'Les présentes conditions générales de vente constituent le socle de la négociation commerciale et sont systématiquement adressées ou remises à chaque acheteur pour lui permettre de passer commande. Toute commande passée constitue une acceptation sans réserve par l\'acheteur des présentes conditions générales de vente.'
      }
    ]
  },
  en: {
    date: 'Date:',
    quoteNumber: 'Quote No:',
    study: 'Study:',
    client: 'Client:',
    studyDesign: 'STUDY DESIGN',
    studyObjectives: 'Study Objectives:',
    numberOfPanelists: 'Number of Panelists:',
    numberOfSkinFibroblast: 'Number of Skin/Fibroblast:',
    description: 'Description',
    unit: 'Unit',
    unitPriceExclTax: 'Unit Price Excl. VAT',
    totalPriceExclTax: 'Total Price Excl. VAT',
    vat: 'VAT',
    objective: 'OBJECTIVE',
    mandatoryServices: 'MANDATORY SERVICES',
    measurementTimeDuration: 'Measurement Time/Duration:',
    panelistsCompensationProvidedByClient: 'Panelist compensation - Provided by client',
    totalExclTax: 'Total Excl. VAT',
    totalVat: 'Total VAT',
    totalInclTax: 'Total Incl. VAT',
    taxCreditText: 'GREDECO has received accreditation for the research tax credit from 2022 to 2026',
    agreementForApproval: 'Approved',
    investigatorSignature: 'Investigator Signature',
    promoterSignature: 'Sponsor Signature',
    bankingInformation: 'Banking Information',
    bankAccount: 'Crédit Agricole de Normandie-Seine Account',
    contact: 'Contact',
    termsAndConditionsTitle: 'GENERAL TERMS AND CONDITIONS OF SALE',
    termsAndConditions: [
      {
        title: 'Article 1 - Purpose',
        text: 'These general terms and conditions of sale apply to all services provided by GREDECO. Any order implies unreserved acceptance by the buyer and full adherence to these general terms and conditions of sale, which prevail over any other document from the buyer.'
      },
      {
        title: 'Article 2 - Prices',
        text: 'Service prices are those in effect on the day the order is placed. They are quoted in euros and calculated excluding taxes. Consequently, they will be increased by the applicable VAT rate and transport costs on the day of the order. GREDECO reserves the right to modify its prices at any time. However, it undertakes to invoice ordered goods at the prices indicated when the order is registered.'
      },
      {
        title: 'Article 3 - Early Payment Discount',
        text: 'No discount will be granted in case of early payment.'
      },
      {
        title: 'Article 4 - Payment Terms',
        text: 'Payment terms for the total quote amount are as follows:\n\nDeposit: A deposit of 50% of the total quote amount will be due upon signing the quote, payable within two weeks.\n\nBalance: The remaining balance, i.e., 50% of the total amount, will be paid within 30 days from the date of issuance of the final study report.\n\nPayment Methods: Payments can be made:\n* By check\n* By bank transfer'
      },
      {
        title: 'Article 5 - Late Payment',
        text: 'In case of total or partial non-payment of delivered goods on the day of receipt, the buyer must pay GREDECO a late payment penalty equal to three times the legal interest rate. The legal interest rate applied is that in effect on the day of delivery of the goods. This penalty is calculated on the VAT-inclusive amount of the outstanding sum and runs from the price due date without any prior formal notice being necessary.'
      },
      {
        title: 'Article 6 - Termination Clause',
        text: 'If within fifteen days following the implementation of the "Late Payment" clause, the buyer has not paid the outstanding sums, the sale will be automatically terminated and may give rise to the allocation of damages in favor of GREDECO.'
      },
      {
        title: 'Article 7 - Retention of Title Clause',
        text: 'GREDECO retains ownership of the sold goods until full payment of the price, in principal and accessories. As such, if the buyer is subject to reorganization or liquidation proceedings, GREDECO reserves the right to reclaim, within the framework of collective proceedings, sold goods that remain unpaid.'
      },
      {
        title: 'Article 8 - Territorial Jurisdiction Clause',
        text: 'Any dispute relating to the interpretation and execution of these general terms and conditions of sale is subject to French law. In the absence of an amicable resolution, the dispute will be brought before the Paris Commercial Court.'
      },
      {
        title: 'Article 9 - Force Majeure',
        text: 'GREDECO\'s liability cannot be invoked if the non-performance or delay in the performance of one of its obligations results from a case of force majeure. For this purpose, force majeure means any external, unforeseeable, and irresistible event within the meaning of Article 1148 of the Civil Code.'
      },
      {
        title: 'Article 10 - Customer Acceptance',
        text: 'These general terms and conditions of sale constitute the basis of commercial negotiation and are systematically sent or given to each buyer to enable them to place an order. Any order placed constitutes unreserved acceptance by the buyer of these general terms and conditions of sale.'
      }
    ]
  }
};

export const getTranslations = (language: Language): Translations => {
  return translations[language] || translations.fr;
};
