import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, X, Upload } from 'lucide-react';
import { supabase, Service, QuotationItem } from '../lib/supabase';
import { StudyDesign } from '../services/aiQuotationService';
import ObjectiveManager from './ObjectiveManager';
import { StudyObjective } from '../types/studyObjective';
import { generateStableObjectiveId } from '../utils/objectiveId';
import { useNotification } from '../hooks/useNotification';
import { formatCurrency } from '../utils/numberFormat';
import { importQuotationFromExcel } from '../services/excelImporter';

interface QuotationGeneratorProps {
  onQuotationCreated?: () => void;
  editingQuotationId?: string | null;
  onCancelEdit?: () => void;
  onDataChange?: (hasData: boolean) => void;
}

export default function QuotationGenerator({ onQuotationCreated, editingQuotationId, onCancelEdit, onDataChange }: QuotationGeneratorProps) {
  const { showNotification, NotificationComponent } = useNotification();
  const [services, setServices] = useState<Service[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    contact: '',
    emails: [] as string[],
    phone: '',
    address: '',
    postal_code: '',
    city: '',
    country: 'France',
  });
  const [quotationInfo, setQuotationInfo] = useState({
    studyTitle: '',
    quotationNumber: '',
    productDescription: '',
  });
  const [pdfLanguage, setPdfLanguage] = useState<'fr' | 'en'>('fr');
  const [items, setItems] = useState<Omit<QuotationItem, 'id' | 'quotation_id' | 'created_at'>[]>([]);
  const [itemTimepoints, setItemTimepoints] = useState<{ [key: number]: string[] }>({});
  const [itemInstanceIds, setItemInstanceIds] = useState<Map<number, string>>(new Map());
  const [manualTimepointOverrides, setManualTimepointOverrides] = useState<Set<number>>(new Set());
  const [manualTimepointsByItemKey, setManualTimepointsByItemKey] = useState<Map<string, string[]>>(new Map());
  const [manuallyEditedItems, setManuallyEditedItems] = useState<Set<string>>(new Set());
  const [manuallyEditedPrices, setManuallyEditedPrices] = useState<Map<string, number>>(new Map());
  const [manuallyEditedQuantities, setManuallyEditedQuantities] = useState<Map<string, number>>(new Map());
  const [manuallyEditedServiceNames, setManuallyEditedServiceNames] = useState<Map<string, string>>(new Map());
  const [instanceCustomNames, setInstanceCustomNames] = useState<Map<string, string>>(new Map());
  const [removedMandatoryServices, setRemovedMandatoryServices] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState(30);
  const [vatRate, setVatRate] = useState(20);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [studyDesign, setStudyDesign] = useState<StudyDesign | null>({
    studyType: 'in_vivo',
    numberOfPanelists: 30,
    numberOfTimepoints: 2,
    studyDuration: '',
    objectives: [],
    inclusionCriteria: [],
    exclusionCriteria: [],
    skinTypes: [],
    methodology: '',
    expectedOutcomes: [],
  });
  const [numberOfConditions, setNumberOfConditions] = useState<number>(1);
  const [objectives, setObjectives] = useState<StudyObjective[]>([]);
  const [previousQuotations, setPreviousQuotations] = useState<any[]>([]);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [emailSearchTerm, setEmailSearchTerm] = useState('');
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [addressSearchTerm, setAddressSearchTerm] = useState('');
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalQuotationNumber, setOriginalQuotationNumber] = useState<string>('');
  const [mandatoryServices, setMandatoryServices] = useState<string[]>([]);
  const [loadedItemKeys, setLoadedItemKeys] = useState<Set<string>>(new Set());
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(false);
  const [hasLoadedQuotation, setHasLoadedQuotation] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(new Set(['FR']));
  const studyDesignRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  const manuallyEditedQuantitiesRef = useRef<Map<string, number>>(new Map());
  const manuallyEditedPricesRef = useRef<Map<string, number>>(new Map());
  const manuallyEditedServiceNamesRef = useRef<Map<string, string>>(new Map());
  const manuallyEditedItemsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // DON'T sync ref from state - causes race conditions
  // The ref is the source of truth, state is only for debugging

  useEffect(() => {
    manuallyEditedPricesRef.current = manuallyEditedPrices;
  }, [manuallyEditedPrices]);

  useEffect(() => {
    manuallyEditedItemsRef.current = manuallyEditedItems;
  }, [manuallyEditedItems]);

  useEffect(() => {
    loadServices();
    loadPreviousQuotations();
    loadCustomers();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.customer-autocomplete')) {
        setShowCustomerDropdown(false);
        setShowEmailDropdown(false);
        setShowCompanyDropdown(false);
        setShowAddressDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingQuotationId) {
      loadQuotationForEdit(editingQuotationId);
    }
  }, [editingQuotationId]);

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


  const loadServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading services:', error);
      return [];
    } else {
      setServices(data || []);
      return data || [];
    }
  };

  const loadPreviousQuotations = async () => {
    const { data, error } = await supabase
      .from('quotations')
      .select('id, quotation_number, study_title, customer_name, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading previous quotations:', error);
      return;
    }
    setPreviousQuotations(data || []);
  };

  const getItemKey = (item: any, itemIndex?: number): string => {
    if (!item.service_id) return 'no_service';

    // Check if it's a mandatory service
    if (item.description?.includes('MANDATORY FOR ALL STUDIES')) {
      return `${item.service_id}_mandatory_all`;
    } else if (item.description?.includes('MANDATORY FOR CLINICAL TRIALS')) {
      return `${item.service_id}_mandatory_clinical`;
    } else if (item.description?.includes('MANDATORY FOR LABORATORY TRIALS')) {
      return `${item.service_id}_mandatory_lab`;
    }

    // For objective-based services, use service_id + objective_id + instanceId if exists
    if (item.objective_id) {
      const instanceId = itemIndex !== undefined ? itemInstanceIds.get(itemIndex) : undefined;
      if (instanceId) {
        return `${item.service_id}_${item.objective_id}_${instanceId}`;
      }
      return `${item.service_id}_${item.objective_id}`;
    }

    return item.service_id;
  };

  const cleanupObjectiveData = (objectiveName: string) => {
    // Remove all manually edited quantities and prices for this objective
    setManuallyEditedQuantities(prev => {
      const newMap = new Map(prev);
      const keysToDelete: string[] = [];
      newMap.forEach((_, key) => {
        if (key.endsWith(`_${objectiveName}`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => newMap.delete(key));
      return newMap;
    });

    setManuallyEditedPrices(prev => {
      const newMap = new Map(prev);
      const keysToDelete: string[] = [];
      newMap.forEach((_, key) => {
        if (key.endsWith(`_${objectiveName}`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => newMap.delete(key));
      return newMap;
    });
  };

  const loadQuotationForEdit = async (quotationId: string) => {
    setIsEditMode(true);
    setEditingId(quotationId);
    await loadQuotationById(quotationId);
  };

  const loadQuotationById = async (quotationId: string) => {
    setIsLoadingQuotation(true);

    // Make sure services are loaded first and get them directly
    const loadedServices = services.length === 0 ? await loadServices() : services;

    // Clear all manually edited values before loading
    setManuallyEditedQuantities(new Map());
    setManuallyEditedPrices(new Map());
    setManuallyEditedItems(new Set());
    setManuallyEditedServiceNames(new Map());
    setManualTimepointsByItemKey(new Map());

    // Reset refs too
    manuallyEditedQuantitiesRef.current = new Map();
    manuallyEditedPricesRef.current = new Map();
    manuallyEditedServiceNamesRef.current = new Map();
    manuallyEditedItemsRef.current = new Set();

    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', quotationId)
      .maybeSingle();

    if (quotationError || !quotation) {
      console.error('Error loading quotation:', quotationError);
      showNotification({ message: 'Erreur lors du chargement du devis', type: 'error' });
      return;
    }

    const { data: items, error: itemsError } = await supabase
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', quotationId)
      .order('order_index', { ascending: true });

    if (itemsError) {
      console.error('Error loading quotation items:', itemsError);
      showNotification({ message: 'Erreur lors du chargement des services du devis', type: 'error' });
      return;
    }

    console.log('=== LOADING QUOTATION ===');
    console.log('Loaded services count:', loadedServices.length);
    console.log('Loaded items count:', items?.length || 0);
    console.log('Items:', items);

    const emailsArray = quotation.customer_email
      ? quotation.customer_email.split(',').map((e: string) => e.trim()).filter((e: string) => e !== '')
      : [];

    setCustomerInfo({
      name: quotation.customer_company || '',
      contact: quotation.customer_name || '',
      emails: emailsArray,
      phone: '',
      address: quotation.customer_address || '',
      postal_code: quotation.postal_code || '',
      city: quotation.city || '',
      country: quotation.country || '',
    });

    setQuotationInfo({
      studyTitle: quotation.study_title || '',
      quotationNumber: quotation.quotation_number || '',
      productDescription: quotation.product_description || '',
    });

    setPdfLanguage(quotation.language || 'fr');

    // Store the original quotation number for validation later
    setOriginalQuotationNumber(quotation.quotation_number || '');

    const inclusionCriteria = quotation.inclusion_criteria ? quotation.inclusion_criteria.split(';').map((c: string) => c.trim()) : [];
    const exclusionCriteria = quotation.exclusion_criteria ? quotation.exclusion_criteria.split(';').map((c: string) => c.trim()) : [];

    const studyObjectivesArray = quotation.study_objectives ? quotation.study_objectives.split(',').map((o: string) => o.trim()) : [];

    // Clean up skin_types by removing "Phototypes" or "Phototype" prefix from each entry
    const skinTypesArray = quotation.skin_types
      ? quotation.skin_types
          .split(',')
          .map((s: string) => s.trim())
          .map((s: string) => s.replace(/^Phototypes?\s*/i, '')) // Remove "Phototype" or "Phototypes" prefix
          .filter((s: string) => s.length > 0) // Remove empty strings
      : [];

    let numberOfTimepoints = 2;
    if (quotation.timepoints) {
      const timepointsArray = quotation.timepoints.split(',').map((tp: string) => tp.trim());
      numberOfTimepoints = timepointsArray.length;
    }

    setNumberOfConditions(quotation.number_of_conditions || 1);

    // Use study_type from database, default to in_vivo if not present
    const studyType = (quotation.study_type === 'ex_vivo' || quotation.study_type === 'in_vivo')
      ? quotation.study_type
      : 'in_vivo';

    setStudyDesign({
      studyType: studyType,
      numberOfPanelists: quotation.number_of_volunteers || (studyType === 'ex_vivo' ? 3 : 20),
      numberOfTimepoints: numberOfTimepoints,
      studyDuration: '12 to 16 weeks',
      objectives: studyObjectivesArray,
      inclusionCriteria: inclusionCriteria,
      exclusionCriteria: exclusionCriteria,
      skinTypes: skinTypesArray,
      methodology: quotation.methodology || '',
      expectedOutcomes: [],
    });

    const objectivesMap = new Map<string, StudyObjective>();
    const objectiveTimepointsSet = new Map<string, Set<string>>(); // objective_name -> Set of all unique timepoints

    // First pass: collect ALL unique timepoints for each objective
    items.forEach((item: any) => {
      if (item.objective_name && !item.objective_name.toLowerCase().includes('recrutement') && !item.objective_name.toLowerCase().includes('recruitment')) {
        if (item.objective_timepoints) {
          if (!objectiveTimepointsSet.has(item.objective_name)) {
            objectiveTimepointsSet.set(item.objective_name, new Set());
          }
          const timepointsSet = objectiveTimepointsSet.get(item.objective_name)!;
          const itemTimepoints = item.objective_timepoints.split(',').map((tp: string) => tp.trim());
          itemTimepoints.forEach((tp: string) => timepointsSet.add(tp));
        }
      }
    });

    // Second pass: create objectives using all unique timepoints
    items.forEach((item: any, index: number) => {
      if (item.objective_name && !item.objective_name.toLowerCase().includes('recrutement') && !item.objective_name.toLowerCase().includes('recruitment')) {
        if (!objectivesMap.has(item.objective_name)) {
          // Collect all unique timepoints for this objective
          let allTimepoints = ['T0', 'T7', 'T14'];
          const timepointsSet = objectiveTimepointsSet.get(item.objective_name);
          if (timepointsSet && timepointsSet.size > 0) {
            allTimepoints = Array.from(timepointsSet);

            // Sort timepoints to maintain a logical order
            const sortOrder = ['T0', 'T2H', 'T4H', 'T7', 'T8H', 'T14', 'T21', 'T24H', 'T28', 'T56'];
            allTimepoints.sort((a, b) => {
              const indexA = sortOrder.indexOf(a);
              const indexB = sortOrder.indexOf(b);
              if (indexA !== -1 && indexB !== -1) return indexA - indexB;
              if (indexA !== -1) return -1;
              if (indexB !== -1) return 1;
              return a.localeCompare(b);
            });
          }

          // Create a stable ID based on the objective name
          const stableId = generateStableObjectiveId(item.objective_name, objectivesMap.size);
          console.log('📌 Generated stable ID for objective:', item.objective_name, '→', stableId);
          console.log('📌 Objective timepoints (ALL unique):', allTimepoints);

          objectivesMap.set(item.objective_name, {
            id: stableId,
            name: item.objective_name,
            timepoints: allTimepoints,
            serviceIds: [],
            serviceInstances: [],
            customServiceNames: {},
          });
        }

        const objective = objectivesMap.get(item.objective_name)!;

        // Add serviceId if not already present
        if (item.service_id && !objective.serviceIds.includes(item.service_id)) {
          objective.serviceIds.push(item.service_id);
        }

        // Create an instance for each item (handles multiple instances of same service)
        if (item.service_id) {
          const standardService = loadedServices.find(s => s.id === item.service_id);
          const instanceId = item.instance_id || `instance-${Date.now()}-${index}-${Math.random().toString(36).substring(7)}`;

          objective.serviceInstances = objective.serviceInstances || [];

          const customName = (standardService && item.service_name !== standardService.name)
            ? item.service_name
            : undefined;

          objective.serviceInstances.push({
            instanceId: instanceId,
            serviceId: item.service_id,
            customName: customName,
          });
        }
      }
    });

    const finalObjectives = Array.from(objectivesMap.values());
    console.log('Final objectives to set:', finalObjectives);
    console.log('Objectives count:', finalObjectives.length);
    finalObjectives.forEach(obj => {
      console.log(`Objective "${obj.name}":`, {
        serviceIds: obj.serviceIds,
        serviceInstances: obj.serviceInstances
      });
    });

    if (objectivesMap.size > 0) {
      setObjectives(finalObjectives);

      // Populate instanceCustomNames from loaded objectives
      const customNamesMap = new Map<string, string>();
      finalObjectives.forEach(objective => {
        objective.serviceInstances?.forEach(instance => {
          if (instance.customName) {
            customNamesMap.set(instance.instanceId, instance.customName);
          }
        });
      });
      setInstanceCustomNames(customNamesMap);
    }

    const loadedItems = items.map((item: any) => ({
      service_id: item.service_id,
      service_name: item.service_name,
      description: item.description,
      objective_name: item.objective_name,
      objective_timepoints: item.objective_timepoints,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent || 0,
      vat_percent: item.vat_percent || 20,
      amount_without_tax: item.amount_without_tax,
      subtotal: item.subtotal,
    }));

    // Extract mandatory service IDs from loaded items
    const loadedMandatoryServiceIds: string[] = [];
    items.forEach((item: any) => {
      if (item.description?.includes('MANDATORY FOR ALL STUDIES') ||
          item.description?.includes('MANDATORY FOR CLINICAL TRIALS') ||
          item.description?.includes('MANDATORY FOR LABORATORY TRIALS')) {
        if (item.service_id && !loadedMandatoryServiceIds.includes(item.service_id)) {
          loadedMandatoryServiceIds.push(item.service_id);
        }
      }
    });
    setMandatoryServices(loadedMandatoryServiceIds);

    // Mark loaded prices and quantities as manually edited to prevent overwriting
    const loadedPricesMap = new Map<string, number>();
    const loadedQuantitiesMap = new Map<string, number>();
    const loadedDescriptionsSet = new Set<string>();
    const loadedServiceNamesMap = new Map<string, string>();
    const loadedTimepointsByItemKey = new Map<string, string[]>();

    items.forEach((item: any) => {
      console.log('📦 Processing item from DB:', {
        service_id: item.service_id,
        service_name: item.service_name,
        objective_name: item.objective_name,
        quantity: item.quantity,
        hasMandatory: item.description?.includes('MANDATORY')
      });

      if (item.service_id) {
        let itemKey: string;

        // Handle mandatory services differently
        if (item.description?.includes('MANDATORY FOR ALL STUDIES')) {
          itemKey = `${item.service_id}_mandatory_all`;
        } else if (item.description?.includes('MANDATORY FOR CLINICAL TRIALS')) {
          itemKey = `${item.service_id}_mandatory_clinical`;
        } else if (item.description?.includes('MANDATORY FOR LABORATORY TRIALS')) {
          itemKey = `${item.service_id}_mandatory_lab`;
        } else if (item.objective_name) {
          const matchedObjective = finalObjectives.find(obj => obj.name === item.objective_name);
          const objectiveId = matchedObjective?.id || item.objective_name;
          itemKey = `${item.service_id}_${objectiveId}`;

          console.log('🔑 Loading item - Objective:', item.objective_name);
          console.log('🔑 Matched in finalObjectives?', !!matchedObjective, 'ID:', objectiveId);
          console.log('🔑 Item key generated:', itemKey);
        } else {
          return;
        }

        const service = loadedServices.find(s => s.id === item.service_id);

        // If price differs from base price, mark as manually edited
        if (service && item.unit_price !== service.base_price) {
          loadedPricesMap.set(itemKey, item.unit_price);
        }

        // If service name differs from default name, mark as manually edited
        if (service && item.service_name && item.service_name !== service.name) {
          loadedServiceNamesMap.set(itemKey, item.service_name);
        }

        // Only save quantity if it differs from what would be calculated
        if (service && item.objective_name) {
          const objective = finalObjectives.find(obj => obj.name === item.objective_name);
          console.log('Checking if should save quantity for:', item.objective_name, 'found:', !!objective);
          if (objective) {
            const timepoints = item.objective_timepoints
              ? item.objective_timepoints.split(',').map((tp: string) => tp.trim())
              : objective.timepoints || [];

            let expectedQuantity = 1;
            const panelists = quotation.number_of_volunteers || 30;
            const numberOfConditions = quotation.number_of_conditions || 2;
            const isInVivo = quotation.study_type === 'in_vivo';
            const skinTypesCount = quotation.skin_types
              ? quotation.skin_types.split(',').filter((s: string) => s.trim()).length
              : 1;

            console.log('🔍 RAW VALUES FROM QUOTATION:', {
              rawNumberOfConditions: quotation.number_of_conditions,
              rawNumberOfVolunteers: quotation.number_of_volunteers,
              rawStudyType: quotation.study_type,
              rawSkinTypes: quotation.skin_types,
              computedNumberOfConditions: numberOfConditions,
              computedPanelists: panelists,
              computedSkinTypesCount: skinTypesCount,
              computedIsInVivo: isInVivo
            });

            console.log('🔍 LOADING QUANTITY CHECK:', {
              serviceName: item.service_name,
              objectiveName: item.objective_name,
              itemKey: itemKey,
              savedQuantity: item.quantity,
              multiplierType: service.multiplier_type,
              panelists: panelists,
              timepointsFromItem: item.objective_timepoints,
              timepointsArray: timepoints,
              timepointsLength: timepoints.length,
              numberOfConditions: numberOfConditions,
              skinTypesCount: skinTypesCount,
              isInVivo: isInVivo
            });

            if (service.multiplier_type === 'panelists') {
              expectedQuantity = panelists;
            } else if (service.multiplier_type === 'timepoints') {
              expectedQuantity = timepoints.length;
            } else if (service.multiplier_type === 'both') {
              if (isInVivo) {
                expectedQuantity = panelists * timepoints.length;
              } else {
                expectedQuantity = (panelists * numberOfConditions) * timepoints.length;
              }
            } else if (service.multiplier_type === 'skin_and_condition') {
              if (isInVivo) {
                expectedQuantity = panelists;
              } else {
                expectedQuantity = skinTypesCount * numberOfConditions;
              }
            }

            console.log('🔍 Expected quantity:', expectedQuantity, '= panelists:', panelists, '× timepoints:', timepoints.length, '× conditions:', numberOfConditions, '(isInVivo:', isInVivo, ')');

            // Only save the quantity if it was manually edited (differs from expected)
            if (item.quantity !== expectedQuantity) {
              console.log('📥 Loading MANUALLY EDITED quantity from DB:', item.quantity, 'for key:', itemKey, '(expected would be:', expectedQuantity, ')');
              loadedQuantitiesMap.set(itemKey, item.quantity);
            } else {
              console.log('✅ Quantity matches expected, will allow auto-recalculation on panelist/condition changes');
            }

            // Also save price if it was modified
            if (item.unit_price !== service.base_price) {
              loadedPricesMap.set(itemKey, item.unit_price);
            }

            // Save custom timepoints if they differ from objective's default
            if (item.objective_timepoints) {
              const objectiveTimepointsStr = objective.timepoints.join(', ');
              if (objectiveTimepointsStr !== item.objective_timepoints) {
                console.log('🕐 Saving custom timepoints for item:', itemKey, '→', item.objective_timepoints);
                loadedTimepointsByItemKey.set(itemKey, timepoints);
              }
            }
          }
        } else {
          // For mandatory services or services without objectives, check if quantity was manually edited
          if (service) {
            let expectedQuantity = 1;
            const panelists = quotation.number_of_volunteers || 30;
            const numberOfConditions = quotation.number_of_conditions || 2;
            const isInVivo = quotation.study_type === 'in_vivo';
            const skinTypesCount = quotation.skin_types
              ? quotation.skin_types.split(',').filter((s: string) => s.trim()).length
              : 1;

            if (service.multiplier_type === 'panelists') {
              expectedQuantity = panelists;
            } else if (service.multiplier_type === 'both') {
              if (isInVivo) {
                expectedQuantity = panelists;
              } else {
                expectedQuantity = panelists * numberOfConditions;
              }
            } else if (service.multiplier_type === 'skin_and_condition') {
              if (isInVivo) {
                expectedQuantity = panelists;
              } else {
                expectedQuantity = skinTypesCount * numberOfConditions;
              }
            }

            // Only save quantity if it differs from expected
            if (item.quantity !== expectedQuantity) {
              console.log('📥 Loading MANUALLY EDITED quantity for mandatory service:', item.service_name, item.quantity, '(expected:', expectedQuantity, ')');
              loadedQuantitiesMap.set(itemKey, item.quantity);
            } else {
              console.log('✅ Mandatory service quantity matches expected, will allow auto-recalculation');
            }
          } else {
            // Service not found, preserve quantity
            loadedQuantitiesMap.set(itemKey, item.quantity);
          }
        }

        // If description differs from service description, mark as manually edited
        if (service && item.description !== service.description) {
          loadedDescriptionsSet.add(item.service_id);
        }
      }
    });

    console.log('=== RESTORED MANUAL EDITS ===');
    console.log('Manual quantities map:', Array.from(loadedQuantitiesMap.entries()));
    console.log('Manual prices map:', Array.from(loadedPricesMap.entries()));
    console.log('Manual timepoints by item key:', Array.from(loadedTimepointsByItemKey.entries()));

    // Migrate old format keys to new format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleanedQuantitiesMap = new Map();
    const cleanedPricesMap = new Map();

    // Helper to convert old format keys to new format
    const migrateKey = (oldKey: string): string => {
      if (oldKey.includes('_mandatory_') || uuidPattern.test(oldKey)) {
        return oldKey; // Already correct format
      }

      // Old format: serviceId_old-objective-id-with-dashes-N
      // New format: serviceId_new-objective-id-N
      const parts = oldKey.split('_');
      if (parts.length !== 2) return oldKey;

      const serviceId = parts[0];
      const oldObjectiveId = parts[1];

      // Extract the base part (without the trailing -N index)
      const lastDashIndex = oldObjectiveId.lastIndexOf('-');
      const oldBasePart = lastDashIndex > 0 ? oldObjectiveId.substring(0, lastDashIndex) : oldObjectiveId;
      const oldBasePartNormalized = oldBasePart.replace(/--+/g, '-').replace(/^-+|-+$/g, '');

      console.log(`🔍 Trying to migrate: ${oldKey}`);
      console.log(`  Old base part: "${oldBasePart}" → normalized: "${oldBasePartNormalized}"`);

      // Find matching objective by comparing the base parts
      const matchingObjective = finalObjectives.find(obj => {
        const objBasePart = obj.id.substring(0, obj.id.lastIndexOf('-'));
        const objBasePartNormalized = objBasePart.replace(/--+/g, '-').replace(/^-+|-+$/g, '');

        console.log(`  Comparing with objective "${obj.name}" (ID: ${obj.id})`);
        console.log(`    Obj base part: "${objBasePart}" → normalized: "${objBasePartNormalized}"`);
        console.log(`    Match? ${objBasePartNormalized === oldBasePartNormalized}`);

        return objBasePartNormalized === oldBasePartNormalized;
      });

      if (matchingObjective) {
        const newKey = `${serviceId}_${matchingObjective.id}`;
        console.log(`🔄 Migrating key: ${oldKey} → ${newKey}`);
        return newKey;
      }

      console.log(`⚠️ Could not migrate key: ${oldKey}`);
      return oldKey; // Keep as-is if we can't migrate
    };

    loadedQuantitiesMap.forEach((value, key) => {
      const migratedKey = migrateKey(key);
      // Keep ALL quantities when loading a quotation to preserve the exact state
      cleanedQuantitiesMap.set(migratedKey, value);
      console.log('💾 Keeping loaded quantity:', value, 'for key:', migratedKey);
    });

    loadedPricesMap.forEach((value, key) => {
      const migratedKey = migrateKey(key);
      cleanedPricesMap.set(migratedKey, value);
    });

    console.log('Cleaned quantities map:', Array.from(cleanedQuantitiesMap.entries()));

    // Track all loaded item keys to prevent recalculation
    const loadedKeys = new Set<string>();
    loadedQuantitiesMap.forEach((_, key) => {
      loadedKeys.add(migrateKey(key));
    });

    // Initialize itemTimepoints from objective_timepoints BEFORE setting items
    const initialItemTimepoints: { [key: number]: string[] } = {};
    const manualOverrides = new Set<number>();

    loadedItems.forEach((item, index) => {
      if (item.objective_timepoints) {
        const timepoints = item.objective_timepoints.split(',').map((tp: string) => tp.trim());
        initialItemTimepoints[index] = timepoints;

        // Only mark as manual if timepoints differ from the objective's timepoints
        if (item.objective_name) {
          const objective = objectivesMap.get(item.objective_name);
          if (objective) {
            const objectiveTimepointsStr = objective.timepoints.join(', ');
            const itemTimepointsStr = item.objective_timepoints;

            // Mark as manual only if they're different
            if (objectiveTimepointsStr !== itemTimepointsStr) {
              manualOverrides.add(index);
            }
          }
        }
      }
    });

    // CRITICAL: Set manual edits, items, and other state together, then mark as loaded
    // This ensures manual quantities are available when recalculation happens
    setManuallyEditedPrices(cleanedPricesMap);
    setManuallyEditedQuantities(cleanedQuantitiesMap);
    setManuallyEditedItems(loadedDescriptionsSet);
    setManuallyEditedServiceNames(loadedServiceNamesMap);

    // Update refs immediately to ensure consistency
    manuallyEditedPricesRef.current = cleanedPricesMap;
    manuallyEditedQuantitiesRef.current = cleanedQuantitiesMap;
    manuallyEditedServiceNamesRef.current = loadedServiceNamesMap;
    manuallyEditedItemsRef.current = loadedDescriptionsSet;

    setItemTimepoints(initialItemTimepoints);
    setManualTimepointOverrides(manualOverrides);
    setManualTimepointsByItemKey(loadedTimepointsByItemKey);
    setItems(loadedItems);
    setVatRate(quotation.vat_rate || 20);
    setGlobalDiscountPercent(quotation.global_discount_percent || 0);
    setNotes(quotation.notes || '');
    setLoadedItemKeys(loadedKeys);

    // Use setTimeout to ensure all state updates are applied before marking as loaded
    setTimeout(() => {
      setHasLoadedQuotation(true);
      setIsLoadingQuotation(false);

      if (onDataChange) {
        onDataChange(false);
      }

      // Scroll to study design section after loading
      setTimeout(() => {
        if (studyDesignRef.current) {
          studyDesignRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }, 0);

    showNotification({ message: 'Devis précédent chargé avec succès', type: 'success' });
  };

  const recalculateItemsFromObjectives = useCallback(() => {
    console.log('🔄 recalculateItemsFromObjectives called', {
      objectivesLength: objectives.length,
      servicesLength: services.length,
      manualQuantitiesSize: manuallyEditedQuantitiesRef.current.size,
      manualQuantitiesEntries: Array.from(manuallyEditedQuantitiesRef.current.entries())
    });
    if (objectives.length === 0 || services.length === 0) return;

    const newItems: Omit<QuotationItem, 'id' | 'quotation_id' | 'created_at'>[] = [];
    const newItemInstanceIds = new Map<number, string>();
    const panelists = studyDesign?.numberOfPanelists || 30;
    const isInVivo = !studyDesign || studyDesign?.studyType === 'in_vivo';
    const addedServiceIds = new Set<string>();
    const mandatoryServiceIds: string[] = [];

    console.log('📊 CRITICAL VALUES AT START:', {
      numberOfConditions,
      skinTypes: studyDesign?.skinTypes,
      numberOfSkinTypes: studyDesign?.skinTypes?.length,
      panelists,
      isInVivo,
      studyType: studyDesign?.studyType
    });

    // Check if we have loaded mandatory services from a quotation
    const hasLoadedMandatoryServices = itemsRef.current.some(item =>
      item.description?.includes('MANDATORY FOR ALL STUDIES') ||
      item.description?.includes('MANDATORY FOR CLINICAL TRIALS') ||
      item.description?.includes('MANDATORY FOR LABORATORY TRIALS')
    );

    // Add mandatory services for all studies (skip if we loaded them from a quotation)
    if (!hasLoadedMandatoryServices) {
      const allStudiesMandatory = services.filter(s => s.type === 'mandatory_all');
      allStudiesMandatory.forEach(service => {
      const itemKey = `${service.id}_mandatory_all`;

      // Skip if this service was manually removed
      if (removedMandatoryServices.has(itemKey)) {
        return;
      }

      // Check if quantity was manually edited
      const manualQuantity = manuallyEditedQuantitiesRef.current.get(itemKey);
      const manualPrice = manuallyEditedPricesRef.current.get(itemKey);

      const unitPrice = manualPrice !== undefined ? manualPrice : service.base_price;
      let quantity = 1;

      if (manualQuantity !== undefined) {
        // Use manually edited quantity
        quantity = manualQuantity;
      } else {
        // Apply multiplier if specified
        const avgTimepoints = objectives.length > 0
          ? Math.max(...objectives.map(obj => (obj.timepoints || []).length))
          : 1;

        if (service.multiplier_type === 'panelists') {
          quantity = panelists;
        } else if (service.multiplier_type === 'timepoints') {
          quantity = avgTimepoints;
        } else if (service.multiplier_type === 'both') {
          if (isInVivo) {
            quantity = panelists * avgTimepoints;
          } else {
            quantity = (panelists * numberOfConditions) * avgTimepoints;
          }
        } else if (service.multiplier_type === 'skin_and_condition') {
          if (isInVivo) {
            quantity = panelists;
          } else {
            const numberOfSkinTypes = studyDesign?.skinTypes?.length || panelists;
            quantity = numberOfSkinTypes * numberOfConditions;
            console.log('🔍 SKIN_AND_CONDITION calculation:', {
              serviceName: service.name,
              studyType: studyDesign?.studyType,
              isInVivo,
              skinTypes: studyDesign?.skinTypes,
              numberOfSkinTypes,
              numberOfConditions,
              panelists,
              calculatedQuantity: quantity
            });
          }
        }
      }

      const amountWithoutTax = quantity * unitPrice;
      const subtotal = amountWithoutTax * (1 + vatRate / 100);

      const manualServiceName = manuallyEditedServiceNamesRef.current.get(itemKey);
      const serviceName = manualServiceName || service.name;

      newItems.push({
        service_id: service.id,
        service_name: serviceName,
        description: `${service.description || service.name} - MANDATORY FOR ALL STUDIES`,
        image_url: service.image_url,
        quantity,
        unit_price: unitPrice,
        discount_percent: 0,
        vat_percent: vatRate,
        amount_without_tax: amountWithoutTax,
        subtotal,
      });
      addedServiceIds.add(service.id);
      mandatoryServiceIds.push(service.id);
    });
    }

    // Add mandatory services for clinical trials (skip if we loaded them from a quotation)
    if (!hasLoadedMandatoryServices && isInVivo) {
      const clinicalMandatory = services.filter(s => s.type === 'mandatory_clinical');
      clinicalMandatory.forEach(service => {
        if (addedServiceIds.has(service.id)) return;

        const itemKey = `${service.id}_mandatory_clinical`;

        // Skip if this service was manually removed
        if (removedMandatoryServices.has(itemKey)) {
          return;
        }

        // Check if quantity was manually edited
        const manualQuantity = manuallyEditedQuantitiesRef.current.get(itemKey);
        const manualPrice = manuallyEditedPricesRef.current.get(itemKey);

        const unitPrice = manualPrice !== undefined ? manualPrice : service.base_price;
        let quantity = 1;

        if (manualQuantity !== undefined) {
          // Use manually edited quantity
          quantity = manualQuantity;
        } else {
          // Apply multiplier if specified
          const avgTimepoints = objectives.length > 0
            ? Math.max(...objectives.map(obj => (obj.timepoints || []).length))
            : 1;

          if (service.multiplier_type === 'panelists') {
            quantity = panelists;
          } else if (service.multiplier_type === 'timepoints') {
            quantity = avgTimepoints;
          } else if (service.multiplier_type === 'both') {
            if (isInVivo) {
              quantity = panelists * avgTimepoints;
            } else {
              quantity = (panelists * numberOfConditions) * avgTimepoints;
            }
          } else if (service.multiplier_type === 'skin_and_condition') {
            if (isInVivo) {
              quantity = panelists;
            } else {
              const numberOfSkinTypes = studyDesign?.skinTypes?.length || panelists;
              quantity = numberOfSkinTypes * numberOfConditions;
            }
          }
        }

        const amountWithoutTax = quantity * unitPrice;
        const subtotal = amountWithoutTax * (1 + vatRate / 100);

        const manualServiceName = manuallyEditedServiceNames.get(itemKey);
        const serviceName = manualServiceName || service.name;

        newItems.push({
          service_id: service.id,
          service_name: serviceName,
          description: `${service.description || service.name} - MANDATORY FOR CLINICAL TRIALS`,
          image_url: service.image_url,
          quantity,
          unit_price: unitPrice,
          discount_percent: 0,
          vat_percent: vatRate,
          amount_without_tax: amountWithoutTax,
          subtotal,
        });
        addedServiceIds.add(service.id);
        mandatoryServiceIds.push(service.id);
      });
    }

    // Add mandatory services for laboratory trials (skip if we loaded them from a quotation)
    if (!hasLoadedMandatoryServices && !isInVivo) {
      const labMandatory = services.filter(s => s.type === 'mandatory_lab');
      labMandatory.forEach(service => {
        if (addedServiceIds.has(service.id)) return;

        const itemKey = `${service.id}_mandatory_lab`;

        // Skip if this service was manually removed
        if (removedMandatoryServices.has(itemKey)) {
          return;
        }

        // Check if quantity was manually edited
        const manualQuantity = manuallyEditedQuantitiesRef.current.get(itemKey);
        const manualPrice = manuallyEditedPricesRef.current.get(itemKey);

        const unitPrice = manualPrice !== undefined ? manualPrice : service.base_price;
        let quantity = 1;

        if (manualQuantity !== undefined) {
          // Use manually edited quantity
          quantity = manualQuantity;
        } else {
          // Apply multiplier if specified
          const avgTimepoints = objectives.length > 0
            ? Math.max(...objectives.map(obj => (obj.timepoints || []).length))
            : 1;

          if (service.multiplier_type === 'panelists') {
            quantity = panelists;
          } else if (service.multiplier_type === 'timepoints') {
            quantity = avgTimepoints;
          } else if (service.multiplier_type === 'both') {
            if (!isInVivo) {
              quantity = (panelists * numberOfConditions) * avgTimepoints;
            } else {
              quantity = panelists * avgTimepoints;
            }
          }
        }

        const amountWithoutTax = quantity * unitPrice;
        const subtotal = amountWithoutTax * (1 + vatRate / 100);

        const manualServiceName = manuallyEditedServiceNames.get(itemKey);
        const serviceName = manualServiceName || service.name;

        newItems.push({
          service_id: service.id,
          service_name: serviceName,
          description: `${service.description || service.name} - MANDATORY FOR LABORATORY TRIALS`,
          image_url: service.image_url,
          quantity,
          unit_price: unitPrice,
          discount_percent: 0,
          vat_percent: vatRate,
          amount_without_tax: amountWithoutTax,
          subtotal,
        });
        addedServiceIds.add(service.id);
        mandatoryServiceIds.push(service.id);
      });
    }

    objectives.forEach((objective) => {
      console.log('Processing objective:', objective.name, 'with', objective.serviceIds.length, 'services');

      const serviceInstances = objective.serviceInstances || [];
      const instancesGroupedByService = new Map<string, typeof serviceInstances>();

      serviceInstances.forEach(inst => {
        if (!instancesGroupedByService.has(inst.serviceId)) {
          instancesGroupedByService.set(inst.serviceId, []);
        }
        instancesGroupedByService.get(inst.serviceId)!.push(inst);
      });

      objective.serviceIds.forEach((serviceId) => {
        const service = services.find(s => s.id === serviceId);
        if (!service) {
          console.log('Service not found:', serviceId);
          return;
        }

        // Skip if this service was already added as a mandatory service
        if (addedServiceIds.has(service.id)) {
          console.log('Skipping service already added as mandatory:', service.name);
          return;
        }

        const itemKey = `${service.id}_${objective.id}`;

        // Check if there are manually overridden timepoints for this specific item
        const manualTimepoints = manualTimepointsByItemKey.get(itemKey);
        const timepoints = manualTimepoints || objective.timepoints || [];
        console.log('Adding service:', service.name, 'to objective:', objective.name, {
          timepoints,
          timepointsLength: timepoints.length,
          multiplierType: service.multiplier_type,
          panelists
        });

        console.log('=== CHECKING QUANTITY ===');
        console.log('Service:', service.name);
        console.log('Objective:', objective.name, 'ID:', objective.id);
        console.log('Item key:', itemKey);
        console.log('Manual quantities map has', manuallyEditedQuantitiesRef.current.size, 'entries');
        console.log('Map keys are:', Array.from(manuallyEditedQuantitiesRef.current.keys()));

        // Check if quantity was manually edited
        const manualQuantity = manuallyEditedQuantitiesRef.current.get(itemKey);
        let quantity = 1;

        console.log('Manual quantity for this key:', manualQuantity);
        console.log('Is loaded item?', loadedItemKeys.has(itemKey));

        // Priority: 1) Manual edit, 2) Loaded from quotation, 3) Calculate
        if (manualQuantity !== undefined) {
          // Use manually edited quantity (highest priority)
          quantity = manualQuantity;
          console.log('✓ Using manual quantity:', quantity);
        } else if (loadedItemKeys.has(itemKey)) {
          // This item was loaded from a quotation - keep its quantity from manuallyEditedQuantities
          // Even though we checked manualQuantity above, we need to preserve loaded quantities
          const loadedQuantity = manuallyEditedQuantitiesRef.current.get(itemKey);
          if (loadedQuantity !== undefined) {
            quantity = loadedQuantity;
            console.log('✓ Using loaded quantity (preserved):', quantity);
          } else {
            // Fallback to calculation if somehow the loaded quantity is missing
            if (service.multiplier_type === 'panelists') {
              quantity = panelists;
            } else if (service.multiplier_type === 'timepoints') {
              quantity = timepoints.length;
            } else if (service.multiplier_type === 'both') {
              if (isInVivo) {
                quantity = panelists * timepoints.length;
              } else {
                quantity = (panelists * numberOfConditions) * timepoints.length;
              }
            } else if (service.multiplier_type === 'skin_and_condition') {
              if (isInVivo) {
                quantity = panelists;
              } else {
                const numberOfSkinTypes = studyDesign?.skinTypes?.length || panelists;
                quantity = numberOfSkinTypes * numberOfConditions;
                console.log('🔍 [LOADED FALLBACK] SKIN_AND_CONDITION:', {
                  serviceName: service.name,
                  objectiveName: objective?.name,
                  studyType: studyDesign?.studyType,
                  isInVivo,
                  skinTypes: studyDesign?.skinTypes,
                  numberOfSkinTypes,
                  numberOfConditions,
                  panelists,
                  calculatedQuantity: quantity
                });
              }
            } else if (service.multiplier_type === 'fixed') {
              // Fixed quantity: always 1
              quantity = 1;
            }
            console.log('⚠️ Loaded item but no quantity found, calculating:', quantity);
          }
        } else {
          // Calculate quantity based on multiplier type (for new items)
          if (service.multiplier_type === 'panelists') {
            quantity = panelists;
          } else if (service.multiplier_type === 'timepoints') {
            quantity = timepoints.length;
          } else if (service.multiplier_type === 'both') {
            if (isInVivo) {
              quantity = panelists * timepoints.length;
            } else {
              quantity = (panelists * numberOfConditions) * timepoints.length;
            }
          } else if (service.multiplier_type === 'skin_and_condition') {
            if (isInVivo) {
              quantity = panelists;
            } else {
              const numberOfSkinTypes = studyDesign?.skinTypes?.length || panelists;
              quantity = numberOfSkinTypes * numberOfConditions;
              console.log('🔍 [NEW ITEM] SKIN_AND_CONDITION:', {
                serviceName: service.name,
                objectiveName: objective?.name,
                studyType: studyDesign?.studyType,
                isInVivo,
                skinTypes: studyDesign?.skinTypes,
                numberOfSkinTypes,
                numberOfConditions,
                panelists,
                calculatedQuantity: quantity
              });
            }
          } else if (service.multiplier_type === 'fixed') {
            // Fixed quantity: always 1
            quantity = 1;
          }
          console.log('Calculated quantity:', quantity, '= panelists:', panelists, '× timepoints:', timepoints.length);
        }

        const manualPrice = manuallyEditedPricesRef.current.get(itemKey);
        const unitPrice = manualPrice !== undefined ? manualPrice : service.base_price;

        const amountWithoutTax = quantity * unitPrice;
        const subtotal = amountWithoutTax * (1 + vatRate / 100);

        const existingItem = itemsRef.current.find(item => item.service_id === service.id && item.objective_name === objective.name);
        const wasManuallyEdited = manuallyEditedItemsRef.current.has(service.id);

        let description: string;
        if (wasManuallyEdited && existingItem) {
          description = existingItem.description || service.description || service.name;
        } else {
          description = service.description || service.name;
        }

        const manualServiceName = manuallyEditedServiceNamesRef.current.get(itemKey);
        const serviceName = manualServiceName || objective.customServiceNames?.[service.id] || service.name;

        const instances = instancesGroupedByService.get(serviceId) || [];

        if (instances.length === 0) {
          newItems.push({
            service_id: service.id,
            service_name: serviceName,
            description,
            image_url: service.image_url,
            objective_id: objective.id,
            objective_name: objective.name,
            objective_timepoints: timepoints.join(', '),
            quantity,
            unit_price: unitPrice,
            discount_percent: 0,
            vat_percent: vatRate,
            amount_without_tax: amountWithoutTax,
            subtotal,
          });
          addedServiceIds.add(service.id);
        } else {
          instances.forEach((instance, idx) => {
            const instanceItemKey = `${service.id}_${objective.id}_${instance.instanceId}`;

            // Check for manually edited service name first, then instance custom name, then serviceName
            const instanceManualServiceName = manuallyEditedServiceNamesRef.current.get(instanceItemKey);
            const customServiceName = instanceManualServiceName || instance.customName || serviceName;

            const instanceManualTimepoints = manualTimepointsByItemKey.get(instanceItemKey);
            const instanceTimepoints = instanceManualTimepoints || objective.timepoints || [];

            // Get manual price and quantity for this specific instance
            const instanceManualPrice = manuallyEditedPricesRef.current.get(instanceItemKey);
            const instanceUnitPrice = instanceManualPrice !== undefined ? instanceManualPrice : service.base_price;

            const instanceManualQuantity = manuallyEditedQuantitiesRef.current.get(instanceItemKey);
            const instanceQuantity = instanceManualQuantity !== undefined ? instanceManualQuantity : quantity;

            const instanceAmountWithoutTax = instanceQuantity * instanceUnitPrice;
            const instanceSubtotal = instanceAmountWithoutTax * (1 + vatRate / 100);

            const itemIdx = newItems.length;
            newItemInstanceIds.set(itemIdx, instance.instanceId);

            // Use custom service name for description if available
            const instanceDescription = instanceManualServiceName || instance.customName || description;

            newItems.push({
              service_id: service.id,
              service_name: customServiceName,
              description: instanceDescription,
              image_url: service.image_url,
              objective_id: objective.id,
              objective_name: objective.name,
              objective_timepoints: instanceTimepoints.join(', '),
              quantity: instanceQuantity,
              unit_price: instanceUnitPrice,
              discount_percent: 0,
              vat_percent: vatRate,
              amount_without_tax: instanceAmountWithoutTax,
              subtotal: instanceSubtotal,
            });
          });
          addedServiceIds.add(service.id);
        }
      });
    });

    // Preserve manually added mandatory services that aren't in the automatic lists
    const existingMandatoryItems = itemsRef.current.filter(item =>
      (item.description?.includes('MANDATORY FOR ALL STUDIES') ||
       item.description?.includes('MANDATORY FOR CLINICAL TRIALS') ||
       item.description?.includes('MANDATORY FOR LABORATORY TRIALS')) &&
      !addedServiceIds.has(item.service_id!)
    );

    existingMandatoryItems.forEach(item => {
      const itemKey = getItemKey(item, itemsRef.current.indexOf(item));

      // Skip if this service was manually removed
      if (removedMandatoryServices.has(itemKey)) {
        return;
      }

      // Preserve manual edits
      const manualQuantity = manuallyEditedQuantitiesRef.current.get(itemKey);
      const manualPrice = manuallyEditedPricesRef.current.get(itemKey);
      const manualServiceName = manuallyEditedServiceNames.get(itemKey);

      const quantity = manualQuantity !== undefined ? manualQuantity : item.quantity;
      const unitPrice = manualPrice !== undefined ? manualPrice : item.unit_price;
      const amountWithoutTax = quantity * unitPrice;
      const subtotal = amountWithoutTax * (1 + vatRate / 100);

      newItems.push({
        ...item,
        service_name: manualServiceName || item.service_name,
        quantity,
        unit_price: unitPrice,
        amount_without_tax: amountWithoutTax,
        subtotal,
      });

      if (item.service_id) {
        mandatoryServiceIds.push(item.service_id);
      }
    });

    console.log('Setting items:', newItems.length, newItems);
    setItems(newItems);
    setItemInstanceIds(newItemInstanceIds);
    setMandatoryServices(mandatoryServiceIds);
  }, [studyDesign, objectives, services, vatRate, numberOfConditions, manualTimepointsByItemKey, loadedItemKeys, removedMandatoryServices]);

  // Wrapper function - now just passes through to setObjectives
  // We no longer reset hasLoadedQuotation because loadedItemKeys tracks which items to preserve
  const handleObjectivesChange = useCallback((newObjectives: StudyObjective[] | ((prev: StudyObjective[]) => StudyObjective[])) => {
    if (typeof newObjectives === 'function') {
      setObjectives(prev => newObjectives(prev));
    } else {
      setObjectives(newObjectives);
    }
  }, []);

  useEffect(() => {
    // Don't recalculate while actively loading a quotation
    // loadedItemKeys will protect loaded items from being recalculated
    if (!isLoadingQuotation) {
      recalculateItemsFromObjectives();
    }
  }, [recalculateItemsFromObjectives, isLoadingQuotation]);

  useEffect(() => {
    // Don't sync timepoints if we're loading a quotation
    if (isLoadingQuotation) {
      return;
    }

    const newItemTimepoints: Record<number, string[]> = {};

    items.forEach((item, index) => {
      const serviceId = item.service_id;

      const itemKey = getItemKey(item, index);
      if (manualTimepointsByItemKey.has(itemKey)) {
        newItemTimepoints[index] = manualTimepointsByItemKey.get(itemKey)!;
        return;
      }

      if (manualTimepointOverrides.has(index)) {
        return;
      }

      // First try to use objective_timepoints field directly
      if (item.objective_timepoints) {
        const objectiveTimepoints = item.objective_timepoints.split(',').map(tp => tp.trim());
        const currentTimepoints = itemTimepoints[index] || [];

        const timepointsChanged =
          objectiveTimepoints.length !== currentTimepoints.length ||
          !objectiveTimepoints.every(tp => currentTimepoints.includes(tp));

        if (timepointsChanged) {
          newItemTimepoints[index] = objectiveTimepoints;
        }
        return;
      }

      // Fallback: Try to find objective from description or objective_name
      const objectiveName = item.objective_name;
      if (objectiveName) {
        const matchedObjective = objectives.find(obj => obj.name === objectiveName);

        if (matchedObjective) {
          const objectiveTimepoints = matchedObjective.timepoints || [];
          const currentTimepoints = itemTimepoints[index] || [];

          const timepointsChanged =
            objectiveTimepoints.length !== currentTimepoints.length ||
            !objectiveTimepoints.every(tp => currentTimepoints.includes(tp));

          if (timepointsChanged) {
            newItemTimepoints[index] = objectiveTimepoints;
          }
        }
      }
    });

    if (Object.keys(newItemTimepoints).length > 0) {
      setItemTimepoints(prev => ({
        ...prev,
        ...newItemTimepoints
      }));
    }
  }, [items, objectives, manualTimepointOverrides, manualTimepointsByItemKey, isLoadingQuotation]);

  useEffect(() => {
    if (objectives.length === 0) {
      if (studyDesign && (studyDesign.studyDuration !== '' || studyDesign.objectives.length > 0)) {
        setStudyDesign(prev => prev ? {
          ...prev,
          studyDuration: '',
          objectives: []
        } : null);
      }
      return;
    }

    const objectiveNames = objectives.map(obj => obj.name);
    const allTimepoints = objectives.flatMap(obj => obj.timepoints);

    if (allTimepoints.length === 0) {
      if (studyDesign && studyDesign.studyDuration !== '') {
        setStudyDesign(prev => prev ? {
          ...prev,
          studyDuration: '',
          objectives: objectiveNames
        } : null);
      }
      return;
    }

    const maxTimepoint = Math.max(...allTimepoints.map(tp => {
      const match = tp.match(/T(\d+)/i);
      return match ? parseInt(match[1]) : 0;
    }));

    if (maxTimepoint > 0) {
      const weeks = Math.ceil(maxTimepoint / 7);
      let durationText = '';

      if (weeks <= 4) {
        durationText = `${weeks} semaine${weeks > 1 ? 's' : ''}`;
      } else if (weeks <= 12) {
        durationText = `${weeks} semaines`;
      } else {
        const months = Math.ceil(weeks / 4);
        durationText = `${months} mois`;
      }

      console.log('Calculating study duration:', {
        maxTimepoint,
        weeks,
        durationText,
        currentDuration: studyDesign?.studyDuration,
        hasStudyDesign: !!studyDesign
      });

      if (!studyDesign) {
        setStudyDesign({
          studyType: 'in_vivo',
          numberOfPanelists: 30,
          numberOfTimepoints: allTimepoints.length,
          studyDuration: durationText,
          objectives: objectiveNames,
          inclusionCriteria: [],
          exclusionCriteria: [],
          skinTypes: [],
          methodology: '',
          expectedOutcomes: [],
        });
      } else if (studyDesign.studyDuration !== durationText || JSON.stringify(studyDesign.objectives) !== JSON.stringify(objectiveNames)) {
        setStudyDesign(prev => prev ? {
          ...prev,
          studyDuration: durationText,
          objectives: objectiveNames
        } : null);
      }
    }
  }, [objectives]);

  useEffect(() => {
    if (!onDataChange) return;

    const hasData =
      objectives.length > 0 ||
      items.length > 0 ||
      customerInfo.name.trim() !== '' ||
      quotationInfo.studyTitle.trim() !== '' ||
      (studyDesign?.skinTypes && studyDesign.skinTypes.length > 0);

    onDataChange(hasData);
  }, [objectives, items, customerInfo, quotationInfo, studyDesign, onDataChange]);

  const addManualItem = () => {
    const newIndex = items.length;
    const defaultTimepoints = objectives.length > 0 && objectives[0].timepoints.length > 0
      ? [...objectives[0].timepoints]
      : ['T0', 'T28'];

    setItemTimepoints({
      ...itemTimepoints,
      [newIndex]: defaultTimepoints,
    });

    setItems([
      ...items,
      {
        service_id: undefined,
        service_name: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        vat_percent: vatRate,
        amount_without_tax: 0,
        subtotal: 0,
      },
    ]);
  };

  const addServiceItem = (service: Service) => {
    const amountWithoutTax = service.base_price;
    const subtotal = amountWithoutTax * (1 + vatRate / 100);
    setItems([
      ...items,
      {
        service_id: service.id,
        service_name: service.name,
        description: service.description,
        quantity: 1,
        unit_price: service.base_price,
        discount_percent: 0,
        vat_percent: vatRate,
        amount_without_tax: amountWithoutTax,
        subtotal: subtotal,
      },
    ]);
  };

  const addExtraServiceToMandatory = (service: Service) => {
    const panelists = studyDesign?.numberOfPanelists || 30;
    const isInVivo = studyDesign?.studyType === 'in_vivo';
    let quantity = 1;

    if (service.multiplier_type === 'panelists') {
      quantity = panelists;
    } else if (service.multiplier_type === 'timepoints') {
      const allTimepoints = objectives.flatMap(obj => obj.timepoints)
        .filter((v, i, a) => a.indexOf(v) === i);
      quantity = allTimepoints.length || 1;
    } else if (service.multiplier_type === 'both') {
      const allTimepoints = objectives.flatMap(obj => obj.timepoints)
        .filter((v, i, a) => a.indexOf(v) === i);
      if (isInVivo) {
        quantity = panelists * (allTimepoints.length || 1);
      } else {
        quantity = (panelists * numberOfConditions) * (allTimepoints.length || 1);
      }
    } else if (service.multiplier_type === 'fixed') {
      quantity = 1;
    } else if (service.multiplier_type === 'skin_and_condition') {
      if (isInVivo) {
        quantity = panelists;
      } else {
        const numberOfSkinTypes = studyDesign?.skinTypes?.length || panelists;
        quantity = numberOfSkinTypes * numberOfConditions;
        console.log('🔍 [ADD MANDATORY] SKIN_AND_CONDITION:', {
          serviceName: service.name,
          studyType: studyDesign?.studyType,
          isInVivo,
          skinTypes: studyDesign?.skinTypes,
          numberOfSkinTypes,
          numberOfConditions,
          panelists,
          calculatedQuantity: quantity
        });
      }
    }

    const amountWithoutTax = quantity * service.base_price;
    const vat = service.vat_percent ?? vatRate;
    const subtotal = amountWithoutTax * (1 + vat / 100);

    const newIndex = items.length;
    const defaultTimepoints = objectives.length > 0 && objectives[0].timepoints.length > 0
      ? [...objectives[0].timepoints]
      : ['T0', 'T28'];

    setItemTimepoints({
      ...itemTimepoints,
      [newIndex]: defaultTimepoints,
    });

    setItems([
      ...items,
      {
        service_id: service.id,
        service_name: service.name,
        description: `${service.description || service.name} - MANDATORY FOR ALL STUDIES`,
        quantity: quantity,
        unit_price: service.base_price,
        discount_percent: 0,
        vat_percent: vat,
        amount_without_tax: amountWithoutTax,
        subtotal: subtotal,
        objective_name: undefined, // No objective name for mandatory services
      },
    ]);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index], [field]: value };

    if (field === 'quantity' || field === 'unit_price' || field === 'discount_percent' || field === 'vat_percent') {
      const qty = Number(item.quantity);
      const price = Number(item.unit_price);
      const discount = Number(item.discount_percent);
      const vat = Number(item.vat_percent || vatRate);
      const amountWithoutTax = qty * price * (1 - discount / 100);
      item.amount_without_tax = amountWithoutTax;
      item.vat_percent = vat;
      item.subtotal = amountWithoutTax * (1 + vat / 100);
    }

    // Mark this item as manually edited if description is changed
    if (field === 'description' && item.service_id) {
      setManuallyEditedItems(prev => {
        const newSet = new Set(prev).add(item.service_id);
        // Update ref immediately to ensure consistency
        manuallyEditedItemsRef.current = newSet;
        return newSet;
      });
    }

    // Mark this item as manually edited if service_name is changed
    if (field === 'service_name' && item.service_id) {
      const itemKey = getItemKey(item, index);
      setManuallyEditedServiceNames(prev => {
        const newMap = new Map(prev);
        newMap.set(itemKey, String(value));
        // Update ref immediately to ensure consistency
        manuallyEditedServiceNamesRef.current = newMap;
        return newMap;
      });

      // Also update the instanceCustomNames map for badge display
      const instanceId = itemInstanceIds.get(index);
      if (instanceId) {
        setInstanceCustomNames(prev => {
          const newMap = new Map(prev);
          newMap.set(instanceId, String(value));
          return newMap;
        });
      }
    }

    // Mark this item as manually edited if unit_price is changed
    if (field === 'unit_price' && item.service_id) {
      const itemKey = getItemKey(item, index);
      setManuallyEditedPrices(prev => {
        const newMap = new Map(prev);
        newMap.set(itemKey, Number(value));
        // Update ref immediately to ensure consistency
        manuallyEditedPricesRef.current = newMap;
        return newMap;
      });
    }

    // Mark this item as manually edited if quantity is changed
    if (field === 'quantity' && item.service_id) {
      const itemKey = getItemKey(item, index);
      setManuallyEditedQuantities(prev => {
        const newMap = new Map(prev);
        newMap.set(itemKey, Number(value));
        // Update ref immediately to ensure consistency
        manuallyEditedQuantitiesRef.current = newMap;
        return newMap;
      });
    }

    updatedItems[index] = item;
    setItems(updatedItems);
  };

  const selectServiceForItem = (index: number, serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const updatedItems = [...items];
    const quantity = updatedItems[index].quantity || 1;
    const amountWithoutTax = quantity * service.base_price;
    const subtotal = amountWithoutTax * (1 + vatRate / 100);

    updatedItems[index] = {
      ...updatedItems[index],
      service_id: service.id,
      service_name: service.name,
      description: service.description,
      unit_price: service.base_price,
      amount_without_tax: amountWithoutTax,
      subtotal: subtotal,
    };

    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
    const item = items[index];

    // If it's a mandatory service, track that it was removed
    if (item.service_id && !item.objective_name) {
      const getItemKey = (item: any): string => {
        if (item.description?.includes('MANDATORY FOR ALL STUDIES')) {
          return `${item.service_id}_mandatory_all`;
        } else if (item.description?.includes('MANDATORY FOR CLINICAL TRIALS')) {
          return `${item.service_id}_mandatory_clinical`;
        } else if (item.description?.includes('MANDATORY FOR LABORATORY TRIALS')) {
          return `${item.service_id}_mandatory_lab`;
        }
        return item.service_id;
      };

      const itemKey = getItemKey(item);
      setRemovedMandatoryServices(prev => new Set(prev).add(itemKey));
    }

    setItems(items.filter((_, i) => i !== index));
    const newItemTimepoints = { ...itemTimepoints };
    delete newItemTimepoints[index];
    const reindexed: { [key: number]: string[] } = {};
    Object.keys(newItemTimepoints).forEach((key) => {
      const oldIndex = parseInt(key);
      const newIndex = oldIndex > index ? oldIndex - 1 : oldIndex;
      reindexed[newIndex] = newItemTimepoints[oldIndex];
    });
    setItemTimepoints(reindexed);

    const newOverrides = new Set<number>();
    manualTimepointOverrides.forEach(overrideIndex => {
      if (overrideIndex !== index) {
        const newIndex = overrideIndex > index ? overrideIndex - 1 : overrideIndex;
        newOverrides.add(newIndex);
      }
    });
    setManualTimepointOverrides(newOverrides);
  };

  const reorderItems = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const updatedItems = [...items];
    const [movedItem] = updatedItems.splice(fromIndex, 1);
    updatedItems.splice(toIndex, 0, movedItem);

    // Assign order_index to all items based on their new position
    const itemsWithOrderIndex = updatedItems.map((item, index) => ({
      ...item,
      order_index: index,
    }));

    setItems(itemsWithOrderIndex);

    // Also update itemTimepoints to reflect the new order
    const newItemTimepoints: { [key: number]: string[] } = {};
    Object.keys(itemTimepoints).forEach((key) => {
      const oldIndex = parseInt(key);
      let newIndex = oldIndex;

      if (oldIndex === fromIndex) {
        newIndex = toIndex;
      } else if (fromIndex < toIndex) {
        if (oldIndex > fromIndex && oldIndex <= toIndex) {
          newIndex = oldIndex - 1;
        }
      } else {
        if (oldIndex >= toIndex && oldIndex < fromIndex) {
          newIndex = oldIndex + 1;
        }
      }

      newItemTimepoints[newIndex] = itemTimepoints[oldIndex];
    });
    setItemTimepoints(newItemTimepoints);

    // Update manual timepoint overrides
    const newOverrides = new Set<number>();
    manualTimepointOverrides.forEach(overrideIndex => {
      let newIndex = overrideIndex;

      if (overrideIndex === fromIndex) {
        newIndex = toIndex;
      } else if (fromIndex < toIndex) {
        if (overrideIndex > fromIndex && overrideIndex <= toIndex) {
          newIndex = overrideIndex - 1;
        }
      } else {
        if (overrideIndex >= toIndex && overrideIndex < fromIndex) {
          newIndex = overrideIndex + 1;
        }
      }

      newOverrides.add(newIndex);
    });
    setManualTimepointOverrides(newOverrides);
  };

  const toggleItemTimepoint = (itemIndex: number, timepoint: string) => {
    const currentTimepoints = itemTimepoints[itemIndex] || [];
    const hasTimepoint = currentTimepoints.includes(timepoint);
    const newTimepoints = hasTimepoint
      ? currentTimepoints.filter(tp => tp !== timepoint)
      : [...currentTimepoints, timepoint].sort((a, b) => {
          const numA = parseInt(a.substring(1));
          const numB = parseInt(b.substring(1));
          return numA - numB;
        });

    setItemTimepoints({
      ...itemTimepoints,
      [itemIndex]: newTimepoints,
    });

    setManualTimepointOverrides(prev => new Set(prev).add(itemIndex));

    const item = items[itemIndex];
    const itemKey = getItemKey(item, itemIndex);

    // Update objective_timepoints in the item
    const updatedItems = [...items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      objective_timepoints: newTimepoints.join(', '),
    };

    const service = services.find(s => s.id === item.service_id);
    const panelists = studyDesign?.numberOfPanelists || 30;
    const isInVivo = studyDesign?.studyType === 'in_vivo';
    let newQuantity = newTimepoints.length;

    console.log('🔍 Toggle timepoint for item:', {
      itemKey,
      hasObjectiveName: !!item.objective_name,
      objectiveName: item.objective_name,
      multiplierType: service?.multiplier_type,
      serviceName: service?.name
    });

    if (service) {
      if (service.multiplier_type === 'timepoints') {
        newQuantity = newTimepoints.length;
      } else if (service.multiplier_type === 'panelists') {
        newQuantity = panelists;
      } else if (service.multiplier_type === 'both') {
        if (isInVivo) {
          newQuantity = panelists * newTimepoints.length;
        } else {
          newQuantity = (panelists * numberOfConditions) * newTimepoints.length;
        }
      } else if (service.multiplier_type === 'fixed' || service.multiplier_type === 'none') {
        newQuantity = 1;
      } else if (service.multiplier_type === 'skin_and_condition') {
        if (isInVivo) {
          newQuantity = panelists;
        } else {
          const numberOfSkinTypes = studyDesign?.skinTypes?.length || panelists;
          newQuantity = numberOfSkinTypes * numberOfConditions;
        }
      }
    }

    updatedItems[itemIndex].quantity = newQuantity;
    const amountWithoutTax = newQuantity * updatedItems[itemIndex].unit_price * (1 - updatedItems[itemIndex].discount_percent / 100);
    updatedItems[itemIndex].amount_without_tax = amountWithoutTax;
    updatedItems[itemIndex].subtotal = amountWithoutTax * (1 + updatedItems[itemIndex].vat_percent / 100);

    // CRITICAL: Update quantity ref BEFORE updating timepoints state
    // This ensures recalculation sees the correct manual quantity
    if (item.objective_id && service?.multiplier_type !== 'fixed' && service?.multiplier_type !== 'none') {
      // Use full itemKey including instance suffix to avoid conflicts
      console.log('💾 Storing manual quantity:', newQuantity, 'for key:', itemKey);
      const newMap = new Map(manuallyEditedQuantitiesRef.current);
      newMap.set(itemKey, newQuantity);
      manuallyEditedQuantitiesRef.current = newMap;
      setManuallyEditedQuantities(newMap);
      console.log('💾 Map now has', newMap.size, 'entries:', Array.from(newMap.keys()));
    }

    // Update timepoints AFTER quantity ref is updated
    setManualTimepointsByItemKey(prev => {
      const newMap = new Map(prev);
      newMap.set(itemKey, newTimepoints);
      return newMap;
    });

    setItems(updatedItems);
  };

  const addCustomItemTimepoint = (itemIndex: number, timepoint: string) => {
    if (!timepoint.trim()) return;

    const timepointPattern = /^T\d+$/i;
    if (!timepointPattern.test(timepoint.toUpperCase())) {
      showNotification({ message: 'Veuillez entrer un format de timepoint valide (ex: T14, T42, T84)', type: 'error' });
      return;
    }

    const formattedTimepoint = timepoint.toUpperCase();
    const currentTimepoints = itemTimepoints[itemIndex] || [];

    if (currentTimepoints.includes(formattedTimepoint)) {
      showNotification({ message: 'Ce timepoint existe déjà', type: 'error' });
      return;
    }

    const newTimepoints = [...currentTimepoints, formattedTimepoint].sort((a, b) => {
      const numA = parseInt(a.substring(1));
      const numB = parseInt(b.substring(1));
      return numA - numB;
    });

    setItemTimepoints({
      ...itemTimepoints,
      [itemIndex]: newTimepoints,
    });

    setManualTimepointOverrides(prev => new Set(prev).add(itemIndex));

    const item = items[itemIndex];
    const itemKey = getItemKey(item, itemIndex);

    // Update objective_timepoints in the item
    const updatedItems = [...items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      objective_timepoints: newTimepoints.join(', '),
    };

    const service = services.find(s => s.id === item.service_id);
    const panelists = studyDesign?.numberOfPanelists || 30;
    const isInVivo = studyDesign?.studyType === 'in_vivo';
    let newQuantity = newTimepoints.length;

    if (service) {
      if (service.multiplier_type === 'timepoints') {
        newQuantity = newTimepoints.length;
      } else if (service.multiplier_type === 'panelists') {
        newQuantity = panelists;
      } else if (service.multiplier_type === 'both') {
        if (isInVivo) {
          newQuantity = panelists * newTimepoints.length;
        } else {
          newQuantity = (panelists * numberOfConditions) * newTimepoints.length;
        }
      } else if (service.multiplier_type === 'fixed' || service.multiplier_type === 'none') {
        newQuantity = 1;
      } else if (service.multiplier_type === 'skin_and_condition') {
        if (isInVivo) {
          newQuantity = panelists;
        } else {
          const numberOfSkinTypes = studyDesign?.skinTypes?.length || panelists;
          newQuantity = numberOfSkinTypes * numberOfConditions;
        }
      }
    }

    updatedItems[itemIndex].quantity = newQuantity;
    const amountWithoutTax = newQuantity * updatedItems[itemIndex].unit_price * (1 - updatedItems[itemIndex].discount_percent / 100);
    updatedItems[itemIndex].amount_without_tax = amountWithoutTax;
    updatedItems[itemIndex].subtotal = amountWithoutTax * (1 + updatedItems[itemIndex].vat_percent / 100);

    // CRITICAL: Update quantity ref BEFORE updating timepoints state
    // This ensures recalculation sees the correct manual quantity
    if (item.objective_id && service?.multiplier_type !== 'fixed' && service?.multiplier_type !== 'none') {
      // Use full itemKey including instance suffix to avoid conflicts
      console.log('💾 Storing manual quantity:', newQuantity, 'for key:', itemKey);
      const newMap = new Map(manuallyEditedQuantitiesRef.current);
      newMap.set(itemKey, newQuantity);
      manuallyEditedQuantitiesRef.current = newMap;
      setManuallyEditedQuantities(newMap);
      console.log('💾 Map now has', newMap.size, 'entries:', Array.from(newMap.keys()));
    }

    // Update timepoints AFTER quantity ref is updated
    setManualTimepointsByItemKey(prev => {
      const newMap = new Map(prev);
      newMap.set(itemKey, newTimepoints);
      return newMap;
    });

    setItems(updatedItems);
  };

  const resetItemTimepointsToObjective = (itemIndex: number) => {
    const item = items[itemIndex];
    const itemKey = getItemKey(item, itemIndex);

    // Remove from manual timepoint overrides
    setManualTimepointOverrides(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemIndex);
      return newSet;
    });

    setManualTimepointsByItemKey(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemKey);
      return newMap;
    });

    // Remove from loadedItemKeys to force recalculation
    setLoadedItemKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemKey);
      return newSet;
    });

    // Reset to objective's timepoints
    const objective = objectives.find(obj => obj.id === item.objective_id);
    if (objective) {
      const objectiveTimepoints = objective.timepoints;

      setItemTimepoints(prev => ({
        ...prev,
        [itemIndex]: objectiveTimepoints,
      }));

      // Recalculate quantity based on objective's timepoints
      const updatedItems = [...items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        objective_timepoints: objectiveTimepoints.join(', '),
      };

      const service = services.find(s => s.id === item.service_id);
      const panelists = studyDesign?.numberOfPanelists || 30;
      const isInVivo = studyDesign?.studyType === 'in_vivo';
      let newQuantity = objectiveTimepoints.length;

      if (service) {
        if (service.multiplier_type === 'timepoints') {
          newQuantity = objectiveTimepoints.length;
        } else if (service.multiplier_type === 'panelists') {
          newQuantity = panelists;
        } else if (service.multiplier_type === 'both') {
          if (isInVivo) {
            newQuantity = panelists * objectiveTimepoints.length;
          } else {
            newQuantity = (panelists * numberOfConditions) * objectiveTimepoints.length;
          }
        } else if (service.multiplier_type === 'fixed' || service.multiplier_type === 'none') {
          newQuantity = 1;
        } else if (service.multiplier_type === 'skin_and_condition') {
          if (isInVivo) {
            newQuantity = panelists;
          } else {
            const numberOfSkinTypes = studyDesign?.skinTypes?.length || panelists;
            newQuantity = numberOfSkinTypes * numberOfConditions;
          }
        }
      }

      updatedItems[itemIndex].quantity = newQuantity;
      const amountWithoutTax = newQuantity * updatedItems[itemIndex].unit_price * (1 - updatedItems[itemIndex].discount_percent / 100);
      updatedItems[itemIndex].amount_without_tax = amountWithoutTax;
      updatedItems[itemIndex].subtotal = amountWithoutTax * (1 + updatedItems[itemIndex].vat_percent / 100);

      // Remove from manually edited quantities
      if (item.objective_name) {
        const newMap = new Map(manuallyEditedQuantitiesRef.current);
        newMap.delete(itemKey);
        manuallyEditedQuantitiesRef.current = newMap;

        // Then update state
        setManuallyEditedQuantities(newMap);
      }

      setItems(updatedItems);
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const totalDiscount = (item.discount_percent || 0) + globalDiscountPercent;
      const adjustedUnitPrice = item.unit_price * (1 - totalDiscount / 100);
      const adjustedAmountHT = adjustedUnitPrice * item.quantity;
      const adjustedAmountTTC = adjustedAmountHT * (1 + (item.vat_percent || 20) / 100);
      return sum + adjustedAmountTTC;
    }, 0);
  };

  const calculateTotalHT = () => {
    return items.reduce((sum, item) => {
      const totalDiscount = (item.discount_percent || 0) + globalDiscountPercent;
      const adjustedUnitPrice = item.unit_price * (1 - totalDiscount / 100);
      const adjustedAmountHT = adjustedUnitPrice * item.quantity;
      return sum + adjustedAmountHT;
    }, 0);
  };

  const calculateTotalTTC = () => {
    return calculateTotal();
  };

  const generateQuotationNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000);
    return `QT-${year}${month}-${String(random).padStart(4, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerInfo.contact || customerInfo.emails.length === 0) {
      showNotification({ message: 'Veuillez remplir le nom du client et au moins un email', type: 'error' });
      return;
    }

    if (!quotationInfo.studyTitle || quotationInfo.studyTitle.trim() === '') {
      showNotification({ message: 'Veuillez remplir le titre de l\'étude', type: 'error' });
      return;
    }

    const emptyObjectives = objectives.filter(obj => !obj.name || obj.name.trim() === '');
    if (emptyObjectives.length > 0) {
      showNotification({ message: 'Veuillez remplir tous les noms des objectifs', type: 'error' });
      return;
    }

    if (items.length === 0) {
      showNotification({ message: 'Veuillez ajouter au moins un service au devis', type: 'error' });
      return;
    }

    // Check for existing customer by email (more reliable than contact name)
    // First, get all customers and check in memory since JSONB queries can be tricky
    const { data: allCustomers, error: customerCheckError } = await supabase
      .from('customers')
      .select('*');

    if (customerCheckError) {
      console.error('Error checking customer:', customerCheckError);
    }

    // Find the customer with matching email
    const existingCustomer = allCustomers && allCustomers.length > 0
      ? allCustomers.find(c => {
          const customerEmails = Array.isArray(c.emails) ? c.emails : [];
          return customerInfo.emails.some(email =>
            customerEmails.some(custEmail =>
              custEmail.toLowerCase().trim() === email.toLowerCase().trim()
            )
          );
        })
      : null;

    if (!existingCustomer) {
      await supabase.from('customers').insert([{
        name: customerInfo.name,
        contact: customerInfo.contact,
        emails: customerInfo.emails,
        phone: customerInfo.phone,
        address: customerInfo.address,
        postal_code: customerInfo.postal_code,
        city: customerInfo.city,
        country: customerInfo.country,
      }]);
    } else {
      await supabase
        .from('customers')
        .update({
          name: customerInfo.name,
          contact: customerInfo.contact,
          emails: customerInfo.emails,
          phone: customerInfo.phone,
          address: customerInfo.address,
          postal_code: customerInfo.postal_code,
          city: customerInfo.city,
          country: customerInfo.country,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCustomer.id);
    }

    const quotationNumber = generateQuotationNumber();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    const quotationPayload = {
      quotation_number: quotationInfo.quotationNumber || quotationNumber,
      customer_name: customerInfo.contact,
      customer_email: customerInfo.emails.join(', '),
      customer_company: customerInfo.name,
      customer_address: customerInfo.address,
      postal_code: customerInfo.postal_code,
      city: customerInfo.city,
      country: customerInfo.country,
      status: 'draft',
      valid_until: validUntil.toISOString().split('T')[0],
      quotation_date: new Date().toISOString().split('T')[0],
      notes,
      total_amount: calculateTotal(),
      study_title: quotationInfo.studyTitle,
      product_description: quotationInfo.productDescription,
      methodology: studyDesign?.methodology || '',
      product_quantity: 0,
      number_of_volunteers: studyDesign?.numberOfPanelists || 0,
      number_of_conditions: numberOfConditions,
      study_type: studyDesign?.studyType || 'in_vivo',
      study_objectives: studyDesign?.objectives?.join(', ') || '',
      objectives_data: JSON.stringify(objectives.map(obj => ({
        id: obj.id,
        name: obj.name,
        timepoints: obj.timepoints
      }))),
      inclusion_criteria: studyDesign?.inclusionCriteria?.filter(c => c.trim()).join('; ') || '',
      exclusion_criteria: studyDesign?.exclusionCriteria?.filter(c => c.trim()).join('; ') || '',
      skin_types: studyDesign?.skinTypes?.length > 0 ? studyDesign.skinTypes.join(', ') : '',
      timepoints: `T0, T${studyDesign?.numberOfTimepoints || 0}`,
      vat_rate: vatRate,
      global_discount_percent: globalDiscountPercent,
      language: pdfLanguage,
    };

    console.log('Quotation payload:', quotationPayload);

    // Simple validation: check if the number conflicts with OTHER quotations
    const currentQuotationNumber = quotationInfo.quotationNumber || quotationNumber;

    const { data: existingQuotation, error: checkError } = await supabase
      .from('quotations')
      .select('id')
      .eq('quotation_number', currentQuotationNumber)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking quotation number:', checkError);
      showNotification({ message: 'Erreur lors de la vérification du numéro de devis', type: 'error' });
      return;
    }

    // Use the prop editingQuotationId directly as it's the source of truth
    const currentEditingId = editingQuotationId || editingId;

    // If editing: allow if no conflict OR if it's the same quotation being edited
    // If creating: block if any conflict exists
    if (existingQuotation) {
      // Convert both IDs to strings for comparison (handles number vs string type mismatches)
      const existingIdStr = String(existingQuotation.id);
      const currentEditingIdStr = currentEditingId ? String(currentEditingId) : null;

      if (currentEditingIdStr && existingIdStr === currentEditingIdStr) {
        // Same quotation - allow overwrite
      } else {
        // Different quotation with same number - block
        showNotification({
          message: `Le numéro de devis ${currentQuotationNumber} est déjà utilisé. Veuillez saisir un numéro unique.`,
          type: 'error'
        });
        return;
      }
    }

    let quotationData;

    if (currentEditingId) {
      const { data, error: quotationError } = await supabase
        .from('quotations')
        .update({ ...quotationPayload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', currentEditingId)
        .select()
        .single();

      if (quotationError) {
        console.error('Error updating quotation:', quotationError);
        showNotification({ message: `Erreur lors de la mise à jour du devis: ${quotationError.message}`, type: 'error' });
        return;
      }
      quotationData = data;

      const { error: deleteItemsError } = await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', currentEditingId);

      if (deleteItemsError) {
        console.error('Error deleting old quotation items:', deleteItemsError);
      }

      const { error: deleteObjectivesError } = await supabase
        .from('study_objectives')
        .delete()
        .eq('quotation_id', currentEditingId);

      if (deleteObjectivesError) {
        console.error('Error deleting old study objectives:', deleteObjectivesError);
      }
    } else {
      const { data, error: quotationError } = await supabase
        .from('quotations')
        .insert([quotationPayload])
        .select()
        .single();

      if (quotationError) {
        console.error('Error creating quotation:', quotationError);
        console.error('Full error details:', JSON.stringify(quotationError, null, 2));
        showNotification({ message: `Erreur lors de la création du devis: ${quotationError.message}`, type: 'error' });
        return;
      }
      quotationData = data;
    }

    const quotationItems = items.map((item, index) => ({
      quotation_id: quotationData.id,
      service_id: item.service_id || null,
      service_name: item.service_name || 'Service sans nom',
      description: item.description || '',
      image_url: item.image_url || null,
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      discount_percent: item.discount_percent || 0,
      vat_percent: item.vat_percent || vatRate,
      amount_without_tax: item.amount_without_tax || 0,
      subtotal: item.subtotal || 0,
      objective_name: item.objective_name || null,
      objective_timepoints: itemTimepoints[index] ? itemTimepoints[index].join(', ') : item.objective_timepoints || null,
      order_index: item.order_index !== undefined ? item.order_index : index,
    }));

    const { error: itemsError } = await supabase
      .from('quotation_items')
      .insert(quotationItems);

    if (itemsError) {
      console.error('Error creating quotation items:', itemsError);
      console.error('Full error details:', JSON.stringify(itemsError, null, 2));
      console.error('Items being inserted:', JSON.stringify(quotationItems, null, 2));
      showNotification({ message: `Erreur lors de la création des services: ${itemsError.message}`, type: 'error' });
      return;
    }

    if (objectives.length > 0) {
      const objectivesData = objectives.map((obj) => ({
        quotation_id: quotationData.id,
        name: obj.name,
        timepoints: obj.timepoints,
        service_ids: obj.serviceIds,
      }));

      const { error: objectivesError } = await supabase
        .from('study_objectives')
        .insert(objectivesData);

      if (objectivesError) {
        console.error('Error creating study objectives:', objectivesError);
      }
    }

    showNotification({ message: `Devis ${isEditMode ? 'mis à jour' : 'créé'} avec succès!`, type: 'success', duration: 3000 });
    resetForm();
    if (onQuotationCreated) {
      onQuotationCreated();
    }
  };

  const resetForm = () => {
    setCustomerInfo({ name: '', contact: '', emails: [], phone: '', address: '', postal_code: '', city: '', country: 'France' });
    setQuotationInfo({ studyTitle: '', quotationNumber: '', productDescription: '' });
    setPdfLanguage('fr');
    setItems([]);
    setNotes('');
    setStudyDesign(null);
    setObjectives([]);
    setIsEditMode(false);
    setEditingId(null);
    setOriginalQuotationNumber('');
    setHasLoadedQuotation(false);
    setLoadedItemKeys(new Set());

    // Reset manual edits
    setManuallyEditedQuantities(new Map());
    setManuallyEditedPrices(new Map());
    setManuallyEditedItems(new Set());
    setManuallyEditedServiceNames(new Map());

    // Reset refs
    manuallyEditedQuantitiesRef.current = new Map();
    manuallyEditedPricesRef.current = new Map();
    manuallyEditedServiceNamesRef.current = new Map();
    manuallyEditedItemsRef.current = new Set();
  };

  const toggleLanguage = (lang: string) => {
    const newLanguages = new Set(selectedLanguages);
    if (newLanguages.has(lang)) {
      if (newLanguages.size > 1) {
        newLanguages.delete(lang);
      }
    } else {
      newLanguages.add(lang);
    }
    setSelectedLanguages(newLanguages);
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedData = await importQuotationFromExcel(file);

      setQuotationInfo({
        quotationNumber: importedData.quotationInfo.quotationNumber,
        studyTitle: importedData.quotationInfo.studyTitle,
        productDescription: '',
      });

      setCustomerInfo({
        name: importedData.customerInfo.name,
        contact: importedData.customerInfo.contact || importedData.customerInfo.name,
        emails: importedData.customerInfo.emails,
        phone: '',
        address: importedData.customerInfo.address,
        postal_code: importedData.customerInfo.postalCode,
        city: importedData.customerInfo.city,
        country: importedData.customerInfo.country,
      });

      setCompanySearchTerm(importedData.customerInfo.company);

      setPdfLanguage(importedData.quotationInfo.language);

      setStudyDesign({
        studyType: importedData.studyDesign.studyType as 'in_vivo' | 'in_vitro' | 'ex_vivo',
        numberOfPanelists: importedData.studyDesign.numberOfPanelists,
        numberOfTimepoints: 2,
        studyDuration: '',
        objectives: importedData.objectives,
        inclusionCriteria: importedData.studyDesign.inclusionCriteria,
        exclusionCriteria: importedData.studyDesign.exclusionCriteria,
        skinTypes: importedData.studyDesign.skinTypes,
        methodology: importedData.studyDesign.methodology,
        expectedOutcomes: [],
      });

      setNumberOfConditions(importedData.studyDesign.numberOfConditions);
      setNotes(importedData.studyDesign.methodology);
      setGlobalDiscountPercent(importedData.globalDiscountPercent);

      // Build objectives with their associated service instances
      let importedObjectives: StudyObjective[] = [];

      if (importedData.objectivesData.length > 0) {
        importedObjectives = importedData.objectivesData.map((objData) => ({
          id: generateStableObjectiveId(objData.name),
          name: objData.name,
          timepoints: objData.timepoints,
          serviceIds: [],
          serviceInstances: [],
        }));
      } else if (importedData.objectives.length > 0) {
        importedObjectives = importedData.objectives.map((objName) => ({
          id: generateStableObjectiveId(objName),
          name: objName,
          timepoints: ['T0'],
          serviceIds: [],
          serviceInstances: [],
        }));
      }

      // Create imported items and link them to objectives
      const importedItems = importedData.items.map((item, index) => {
        const instanceId = `import-${Date.now()}-${index}`;

        // Create a "fake" service_id for imported items
        const fakeServiceId = `imported-${instanceId}`;

        // Link this item to its objective
        if (item.objectiveName) {
          const objective = importedObjectives.find(obj => obj.name === item.objectiveName);
          if (objective) {
            // Add to serviceIds if not already there
            if (!objective.serviceIds.includes(fakeServiceId)) {
              objective.serviceIds.push(fakeServiceId);
            }

            // Add to serviceInstances
            objective.serviceInstances = objective.serviceInstances || [];
            objective.serviceInstances.push({
              instanceId: instanceId,
              serviceId: fakeServiceId,
              customName: item.description,
            });
          }
        }

        return {
          instanceId,
          service_id: fakeServiceId,
          description: item.description,
          service_name: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tva_percent: item.tvaPercent,
          objective_name: item.objectiveName,
          order_index: item.orderIndex,
          image_url: null,
        };
      });

      // Debug: Log objectives before setting
      console.log('Imported objectives with services:', importedObjectives.map(obj => ({
        name: obj.name,
        serviceIdsCount: obj.serviceIds.length,
        serviceInstancesCount: obj.serviceInstances?.length || 0,
        serviceIds: obj.serviceIds,
        serviceInstances: obj.serviceInstances
      })));

      setItems(importedItems);
      setObjectives([...importedObjectives]); // Create new array to ensure React detects the change

      // Set up the itemInstanceIds map
      const instanceIdsMap = new Map<number, string>();
      importedItems.forEach((item, index) => {
        if (item.instanceId) {
          instanceIdsMap.set(index, item.instanceId);
        }
      });
      setItemInstanceIds(instanceIdsMap);

      showNotification('Fichier Excel importé avec succès', 'success');
      event.target.value = '';
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'Erreur lors de l\'import du fichier Excel',
        'error'
      );
      event.target.value = '';
    }
  };

  const filteredServices = services.filter(service => {
    if (selectedLanguages.size === 0) return true;
    const serviceLangues = (service.langues || '').toUpperCase();
    if (!serviceLangues) return true;
    return Array.from(selectedLanguages).some(lang =>
      serviceLangues.includes(lang)
    );
  });

  return (
    <div className="bg-white rounded-lg shadow-lg print:hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? 'Modifier le Devis' : 'Générer un Devis'}
          </h2>
          {isEditMode && onCancelEdit && (
            <button
              onClick={() => {
                resetForm();
                if (onDataChange) onDataChange(false);
                if (onCancelEdit) onCancelEdit();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
          )}
        </div>

        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Filtrer les services par langue
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedLanguages.has('FR')}
                onChange={() => toggleLanguage('FR')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Français (FR)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedLanguages.has('EN')}
                onChange={() => toggleLanguage('EN')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">English (EN)</span>
            </label>
          </div>
        </div>

        <div className="mb-4 p-4 bg-gradient-to-br from-green-50 to-blue-50 border border-green-300 rounded-lg shadow-md">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Charger un Devis Précédent (Optionnel)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedQuotationId}
              onChange={(e) => setSelectedQuotationId(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 overflow-hidden"
              style={{ maxWidth: 'calc(100% - 100px)' }}
            >
              <option value="">Sélectionner un devis précédent...</option>
              {previousQuotations.map((quot) => (
                <option key={quot.id} value={quot.id}>
                  {quot.quotation_number} - {quot.study_title} - {quot.customer_name} ({new Date(quot.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (selectedQuotationId) {
                  loadQuotationById(selectedQuotationId);
                }
              }}
              disabled={!selectedQuotationId}
              className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 text-sm font-medium shadow-md whitespace-nowrap"
            >
              Charger
            </button>
            <label className="shrink-0 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer text-sm font-medium shadow-md inline-flex items-center justify-center gap-2 whitespace-nowrap" title="Importer depuis Excel">
              <Upload className="w-4 h-4" />
              Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
              />
            </label>
          </div>
        </div>

      </div>

      <form onSubmit={handleSubmit} onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }} className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Informations du Devis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de Devis
              </label>
              <input
                type="text"
                value={quotationInfo.quotationNumber}
                onChange={(e) => setQuotationInfo({ ...quotationInfo, quotationNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Généré automatiquement si vide"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre de l'Étude
              </label>
              <input
                type="text"
                value={quotationInfo.studyTitle}
                onChange={(e) => setQuotationInfo({ ...quotationInfo, studyTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ex: Hydratation et taches brunes"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Langue du PDF
              </label>
              <select
                value={pdfLanguage}
                onChange={(e) => setPdfLanguage(e.target.value as 'fr' | 'en')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="fr">🇫🇷 Français</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description du Produit
            </label>
            <input
              type="text"
              value={quotationInfo.productDescription}
              onChange={(e) => setQuotationInfo({ ...quotationInfo, productDescription: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ex: Essai fourni par le client"
            />
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Informations Client</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative customer-autocomplete">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'Entreprise *
              </label>
              <input
                type="text"
                value={customerInfo.name}
                onChange={(e) => {
                  setCustomerInfo({ ...customerInfo, name: e.target.value });
                  setCompanySearchTerm(e.target.value);
                  setShowCompanyDropdown(true);
                }}
                onFocus={() => setShowCompanyDropdown(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              {showCompanyDropdown && companySearchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {customers
                    .filter(c => c.name && c.name.toLowerCase().includes(companySearchTerm.toLowerCase()))
                    .slice(0, 5)
                    .map((customer) => {
                      const emails = Array.isArray(customer.emails) ? customer.emails : [];
                      return (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setCustomerInfo({
                              name: customer.name || '',
                              contact: customer.contact || '',
                              emails: emails,
                              phone: customer.phone || '',
                              address: customer.address || '',
                              postal_code: customer.postal_code || '',
                              city: customer.city || '',
                              country: customer.country || 'France',
                            });
                            setShowCompanyDropdown(false);
                            setCompanySearchTerm('');
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-600">{customer.contact} - {emails[0] || ''}</div>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
            <div className="relative customer-autocomplete">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du Client (Contact) *
              </label>
              <input
                type="text"
                value={customerInfo.contact}
                onChange={(e) => {
                  setCustomerInfo({ ...customerInfo, contact: e.target.value });
                  setCustomerSearchTerm(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              {showCustomerDropdown && customerSearchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {customers
                    .filter(c =>
                      (c.contact && c.contact.toLowerCase().includes(customerSearchTerm.toLowerCase())) ||
                      (c.emails && Array.isArray(c.emails) && c.emails.some((e: string) => e.toLowerCase().includes(customerSearchTerm.toLowerCase()))) ||
                      (c.name && c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()))
                    )
                    .slice(0, 5)
                    .map((customer) => {
                      const emails = Array.isArray(customer.emails) ? customer.emails : [];
                      return (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setCustomerInfo({
                              name: customer.name || '',
                              contact: customer.contact || '',
                              emails: emails,
                              phone: customer.phone || '',
                              address: customer.address || '',
                              postal_code: customer.postal_code || '',
                              city: customer.city || '',
                              country: customer.country || 'France',
                            });
                            setShowCustomerDropdown(false);
                            setCustomerSearchTerm('');
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{customer.contact}</div>
                          <div className="text-sm text-gray-600">{emails[0] || ''}</div>
                          {customer.name && (
                            <div className="text-xs text-gray-500">{customer.name}</div>
                          )}
                        </button>
                      );
                    })}
                  {customers.filter(c =>
                    (c.contact && c.contact.toLowerCase().includes(customerSearchTerm.toLowerCase())) ||
                    (c.emails && Array.isArray(c.emails) && c.emails.some((e: string) => e.toLowerCase().includes(customerSearchTerm.toLowerCase()))) ||
                    (c.name && c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()))
                  ).length === 0 && (
                    <div className="px-4 py-2 text-sm text-gray-500">Aucun client trouvé</div>
                  )}
                </div>
              )}
            </div>
            <div className="relative customer-autocomplete">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email(s) * <span className="text-xs text-gray-500">(séparés par des virgules)</span>
              </label>
              <input
                type="text"
                value={customerInfo.emails.join(', ')}
                onChange={(e) => {
                  const emailsArray = e.target.value.split(',').map(email => email.trim()).filter(email => email !== '');
                  setCustomerInfo({ ...customerInfo, emails: emailsArray });
                  setEmailSearchTerm(e.target.value);
                  setShowEmailDropdown(true);
                }}
                onFocus={() => setShowEmailDropdown(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="email1@example.com, email2@example.com"
                required
              />
              {showEmailDropdown && emailSearchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {customers
                    .filter(c => {
                      if (!c.emails || !Array.isArray(c.emails)) return false;
                      return c.emails.some((email: string) => email.toLowerCase().includes(emailSearchTerm.toLowerCase()));
                    })
                    .slice(0, 5)
                    .map((customer) => {
                      const emails = Array.isArray(customer.emails) ? customer.emails : [];
                      return (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setCustomerInfo({
                              name: customer.name || '',
                              contact: customer.contact || '',
                              emails: emails,
                              phone: customer.phone || '',
                              address: customer.address || '',
                              postal_code: customer.postal_code || '',
                              city: customer.city || '',
                              country: customer.country || 'France',
                            });
                            setShowEmailDropdown(false);
                            setEmailSearchTerm('');
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{emails.length > 0 ? emails.join(', ') : 'No email'}</div>
                          <div className="text-sm text-gray-600">{customer.name} - {customer.contact}</div>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+33 1 23 45 67 89"
              />
            </div>
            <div className="relative customer-autocomplete">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rue
              </label>
              <input
                type="text"
                value={customerInfo.address}
                onChange={(e) => {
                  setCustomerInfo({ ...customerInfo, address: e.target.value });
                  setAddressSearchTerm(e.target.value);
                  setShowAddressDropdown(true);
                }}
                onFocus={() => setShowAddressDropdown(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Numéro et nom de rue"
              />
              {showAddressDropdown && addressSearchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {customers
                    .filter(c => c.address && c.address.toLowerCase().includes(addressSearchTerm.toLowerCase()))
                    .slice(0, 5)
                    .map((customer) => {
                      const emails = Array.isArray(customer.emails) ? customer.emails : [];
                      return (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setCustomerInfo({
                              name: customer.name || '',
                              contact: customer.contact || '',
                              emails: emails,
                              phone: customer.phone || '',
                              address: customer.address || '',
                              postal_code: customer.postal_code || '',
                              city: customer.city || '',
                              country: customer.country || 'France',
                            });
                            setShowAddressDropdown(false);
                            setAddressSearchTerm('');
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{customer.address}</div>
                          <div className="text-sm text-gray-600">{customer.postal_code} {customer.city}, {customer.country || 'France'}</div>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code Postal
              </label>
              <input
                type="text"
                value={customerInfo.postal_code}
                onChange={(e) => setCustomerInfo({ ...customerInfo, postal_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="75001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ville
              </label>
              <input
                type="text"
                value={customerInfo.city}
                onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Paris"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pays
              </label>
              <input
                type="text"
                value={customerInfo.country}
                onChange={(e) => setCustomerInfo({ ...customerInfo, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="France"
              />
            </div>
          </div>
        </div>

        <div ref={studyDesignRef} className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Design de l'Étude</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'Étude</label>
                <select
                  value={studyDesign?.studyType || 'in_vivo'}
                  onChange={(e) => {
                    const newType = e.target.value as 'ex_vivo' | 'in_vivo';
                    const newDefaultValue = newType === 'ex_vivo' ? 3 : 30;
                    const newStudyDesign = studyDesign || {
                      studyType: 'in_vivo' as 'ex_vivo' | 'in_vivo',
                      numberOfPanelists: 30,
                      numberOfTimepoints: 2,
                      studyDuration: '',
                      objectives: [],
                      inclusionCriteria: [],
                      exclusionCriteria: [],
                      skinTypes: [],
                      methodology: '',
                      expectedOutcomes: [],
                    };
                    const updatedDesign = {
                      ...newStudyDesign,
                      studyType: newType,
                      numberOfPanelists: newDefaultValue,
                      skinTypes: newType === 'ex_vivo' ? [] : newStudyDesign.skinTypes
                    };
                    setStudyDesign(updatedDesign);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ex_vivo">Laboratoire (Ex Vivo)</option>
                  <option value="in_vivo">Clinique (In Vivo)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objectif de l'Étude</label>
                <input
                  type="text"
                  value={studyDesign?.objectives?.join(', ') || ''}
                  onChange={(e) => {
                    const objectivesArray = e.target.value.split(',').map(obj => obj.trim()).filter(obj => obj !== '');
                    const newStudyDesign = studyDesign || {
                      studyType: 'in_vivo' as 'ex_vivo' | 'in_vivo',
                      numberOfPanelists: 30,
                      numberOfTimepoints: 2,
                      studyDuration: '',
                      objectives: [],
                      inclusionCriteria: [],
                      exclusionCriteria: [],
                      skinTypes: [],
                      methodology: '',
                      expectedOutcomes: [],
                    };
                    setStudyDesign({ ...newStudyDesign, objectives: objectivesArray });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: Hydratation, Anti-âge"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Durée de l'Étude
                  <span className="ml-2 text-xs font-normal text-blue-600">(calculée automatiquement)</span>
                </label>
                <input
                  type="text"
                  value={studyDesign?.studyDuration || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                  placeholder="Ajoutez des timepoints aux objectifs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {studyDesign?.studyType === 'ex_vivo' ? 'Nombre de Peau/Fibroblaste' : 'Nombre de Panélistes'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={studyDesign?.numberOfPanelists || 30}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      const newStudyDesign = studyDesign || {
                        studyType: 'in_vivo' as 'ex_vivo' | 'in_vivo',
                        numberOfPanelists: 0,
                        numberOfTimepoints: 2,
                        studyDuration: '',
                        objectives: [],
                        inclusionCriteria: [],
                        exclusionCriteria: [],
                        skinTypes: [],
                        methodology: '',
                        expectedOutcomes: [],
                      };
                      setStudyDesign({ ...newStudyDesign, numberOfPanelists: 0 });
                      return;
                    }
                    const newValue = parseInt(value);
                    if (isNaN(newValue) || newValue < 0) return;

                    const newStudyDesign = studyDesign || {
                      studyType: 'in_vivo' as 'ex_vivo' | 'in_vivo',
                      numberOfPanelists: 30,
                      numberOfTimepoints: 2,
                      studyDuration: '',
                      objectives: [],
                      inclusionCriteria: [],
                      exclusionCriteria: [],
                      skinTypes: [],
                      methodology: '',
                      expectedOutcomes: [],
                    };
                    const updatedDesign = { ...newStudyDesign, numberOfPanelists: newValue };
                    setStudyDesign(updatedDesign);

                    const isExVivo = updatedDesign.studyType === 'ex_vivo';
                    const recalculatedItemKeys = new Set<string>();

                    const updatedItems = items.map((item, itemIndex) => {
                      const service = services.find(s => s.id === item.service_id);
                      if (service) {
                        let newQuantity = item.quantity;

                        if (service.multiplier_type === 'panelists') {
                          newQuantity = newValue;
                        } else if (service.multiplier_type === 'timepoints') {
                          const timepoints = itemTimepoints[itemIndex]?.length || 1;
                          newQuantity = timepoints;
                        } else if (service.multiplier_type === 'both') {
                          const timepoints = itemTimepoints[itemIndex]?.length || 1;
                          if (isExVivo) {
                            newQuantity = (newValue * numberOfConditions) * timepoints;
                          } else {
                            newQuantity = newValue * timepoints;
                          }
                        } else if (service.multiplier_type === 'fixed') {
                          newQuantity = 1;
                        } else if (service.multiplier_type === 'skin_and_condition') {
                          if (isExVivo) {
                            const numberOfSkinTypes = newStudyDesign.skinTypes?.length || newValue;
                            newQuantity = numberOfSkinTypes * numberOfConditions;
                          } else {
                            newQuantity = newValue;
                          }
                        } else if (service.service_type === 'recurring') {
                          newQuantity = newValue * (studyDesign?.numberOfTimepoints || 2);
                        }

                        if (newQuantity !== item.quantity) {
                          // Track which items were recalculated
                          const itemKey = item.objective_id
                            ? `${item.service_id}_${item.objective_id}`
                            : item.description?.includes('MANDATORY')
                              ? `${item.service_id}_mandatory_${item.description.includes('CLINICAL') ? 'clinical' : item.description.includes('LABORATORY') ? 'lab' : 'all'}`
                              : '';
                          if (itemKey) recalculatedItemKeys.add(itemKey);

                          const amountWithoutTax = newQuantity * item.unit_price * (1 - item.discount_percent / 100);
                          const subtotal = amountWithoutTax * (1 + item.vat_percent / 100);
                          return {
                            ...item,
                            quantity: newQuantity,
                            amount_without_tax: amountWithoutTax,
                            subtotal: subtotal,
                          };
                        }
                      }
                      return item;
                    });

                    setItems(updatedItems);

                    // Remove recalculated items from manuallyEditedQuantities
                    if (recalculatedItemKeys.size > 0) {
                      setManuallyEditedQuantities(prev => {
                        const newMap = new Map(prev);
                        recalculatedItemKeys.forEach(key => newMap.delete(key));
                        return newMap;
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {studyDesign?.studyType === 'ex_vivo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de Conditions
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={numberOfConditions}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setNumberOfConditions(0);
                        return;
                      }
                      const newValue = parseInt(value);
                      if (isNaN(newValue) || newValue < 0) return;
                      setNumberOfConditions(newValue);

                      const panelists = studyDesign?.numberOfPanelists || 30;
                      const recalculatedItemKeys = new Set<string>();

                      const updatedItems = items.map((item, itemIndex) => {
                        const service = services.find(s => s.id === item.service_id);
                        if (service && (service.multiplier_type === 'both' || service.multiplier_type === 'skin_and_condition')) {
                          const timepoints = itemTimepoints[itemIndex]?.length || 1;
                          const isExVivo = studyDesign?.studyType === 'ex_vivo';
                          const numberOfSkinTypes = studyDesign?.skinTypes?.length || panelists;
                          const newQuantity = service.multiplier_type === 'skin_and_condition'
                            ? (isExVivo ? numberOfSkinTypes * newValue : panelists)
                            : (panelists * newValue) * timepoints;

                          // Track which items were recalculated
                          const itemKey = item.objective_id
                            ? `${item.service_id}_${item.objective_id}`
                            : item.description?.includes('MANDATORY')
                              ? `${item.service_id}_mandatory_${item.description.includes('CLINICAL') ? 'clinical' : item.description.includes('LABORATORY') ? 'lab' : 'all'}`
                              : '';
                          if (itemKey) recalculatedItemKeys.add(itemKey);

                          const amountWithoutTax = newQuantity * item.unit_price * (1 - item.discount_percent / 100);
                          const subtotal = amountWithoutTax * (1 + item.vat_percent / 100);
                          return {
                            ...item,
                            quantity: newQuantity,
                            amount_without_tax: amountWithoutTax,
                            subtotal: subtotal,
                          };
                        }
                        return item;
                      });

                      setItems(updatedItems);

                      // Remove recalculated items from manuallyEditedQuantities
                      if (recalculatedItemKeys.size > 0) {
                        setManuallyEditedQuantities(prev => {
                          const newMap = new Map(prev);
                          recalculatedItemKeys.forEach(key => newMap.delete(key));
                          return newMap;
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {studyDesign?.studyType !== 'ex_vivo' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Types de Peau (Phototypes)</label>
                <div className="flex flex-wrap gap-2">
                  {['I', 'II', 'III', 'IV', 'V', 'VI'].map((type) => {
                    const skinTypes = studyDesign?.skinTypes || [];
                    const isSelected = skinTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          const newStudyDesign = studyDesign || {
                            studyType: 'in_vivo' as 'ex_vivo' | 'in_vivo',
                            numberOfPanelists: 20,
                            numberOfTimepoints: 2,
                            studyDuration: '12 to 16 weeks',
                            objectives: [],
                            inclusionCriteria: [],
                            exclusionCriteria: [],
                            skinTypes: [],
                            methodology: '',
                            expectedOutcomes: [],
                          };
                          const currentSkinTypes = newStudyDesign.skinTypes || [];
                          const updatedSkinTypes = isSelected
                            ? currentSkinTypes.filter(t => t !== type)
                            : [...currentSkinTypes, type];
                          setStudyDesign({ ...newStudyDesign, skinTypes: updatedSkinTypes });

                          // Recalculate quantities for services with skin_and_condition multiplier
                          const isExVivo = newStudyDesign.studyType === 'ex_vivo';
                          if (isExVivo) {
                            const recalculatedItemKeys = new Set<string>();
                            const updatedItems = items.map((item, itemIndex) => {
                              const service = services.find(s => s.id === item.service_id);
                              if (service && service.multiplier_type === 'skin_and_condition') {
                                const newQuantity = updatedSkinTypes.length * numberOfConditions;

                                // Track which items were recalculated
                                const itemKey = item.objective_id
                                  ? `${item.service_id}_${item.objective_id}`
                                  : item.description?.includes('MANDATORY')
                                    ? `${item.service_id}_mandatory_${item.description.includes('CLINICAL') ? 'clinical' : item.description.includes('LABORATORY') ? 'lab' : 'all'}`
                                    : '';
                                if (itemKey) recalculatedItemKeys.add(itemKey);

                                const amountWithoutTax = newQuantity * item.unit_price * (1 - item.discount_percent / 100);
                                const subtotal = amountWithoutTax * (1 + item.vat_percent / 100);
                                return {
                                  ...item,
                                  quantity: newQuantity,
                                  amount_without_tax: amountWithoutTax,
                                  subtotal: subtotal,
                                };
                              }
                              return item;
                            });

                            setItems(updatedItems);

                            // Remove recalculated items from manual edits
                            if (recalculatedItemKeys.size > 0) {
                              setManuallyEditedQuantities(prev => {
                                const newMap = new Map(prev);
                                recalculatedItemKeys.forEach(key => newMap.delete(key));
                                return newMap;
                              });
                            }
                          }
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Phototype {type}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Inclusion Criteria</label>
              <textarea
                value={studyDesign?.inclusionCriteria?.join('\n') || ''}
                onChange={(e) => {
                  const newStudyDesign = studyDesign || {
                    studyType: 'in_vivo' as 'ex_vivo' | 'in_vivo',
                    numberOfPanelists: 20,
                    numberOfTimepoints: 2,
                    studyDuration: '12 to 16 weeks',
                    objectives: [],
                    inclusionCriteria: [],
                    exclusionCriteria: [],
                    skinTypes: [],
                    methodology: '',
                    expectedOutcomes: [],
                  };
                  const criteria = e.target.value.split('\n');
                  setStudyDesign({ ...newStudyDesign, inclusionCriteria: criteria });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Entrez chaque critère sur une nouvelle ligne&#10;ex: Âge 18-65&#10;Peau en bonne santé&#10;Aucune allergie connue"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Exclusion Criteria</label>
              <textarea
                value={studyDesign?.exclusionCriteria?.join('\n') || ''}
                onChange={(e) => {
                  const newStudyDesign = studyDesign || {
                    studyType: 'in_vivo' as 'ex_vivo' | 'in_vivo',
                    numberOfPanelists: 20,
                    numberOfTimepoints: 2,
                    studyDuration: '12 to 16 weeks',
                    objectives: [],
                    inclusionCriteria: [],
                    exclusionCriteria: [],
                    skinTypes: [],
                    methodology: '',
                    expectedOutcomes: [],
                  };
                  const criteria = e.target.value.split('\n');
                  setStudyDesign({ ...newStudyDesign, exclusionCriteria: criteria });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Entrez chaque critère sur une nouvelle ligne&#10;ex: Grossesse ou allaitement&#10;Procédures cosmétiques récentes&#10;Maladies de peau"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Methodology</label>
              <textarea
                value={studyDesign?.methodology || ''}
                onChange={(e) => {
                  const newStudyDesign = studyDesign || {
                    studyType: 'in_vivo' as 'ex_vivo' | 'in_vivo',
                    numberOfPanelists: 20,
                    numberOfTimepoints: 2,
                    studyDuration: '12 to 16 weeks',
                    objectives: [],
                    inclusionCriteria: [],
                    exclusionCriteria: [],
                    skinTypes: [],
                    methodology: '',
                    expectedOutcomes: [],
                  };
                  setStudyDesign({ ...newStudyDesign, methodology: e.target.value });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Describe the study methodology, procedures, and measurements"
              />
            </div>
          </div>

          <ObjectiveManager
              objectives={objectives}
              services={filteredServices}
              onObjectivesChange={handleObjectivesChange}
              items={items}
              itemTimepoints={itemTimepoints}
              onToggleItemTimepoint={toggleItemTimepoint}
              onResetItemTimepoints={resetItemTimepointsToObjective}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
              onReorderItems={reorderItems}
              instanceCustomNames={instanceCustomNames}
              onUpdateInstanceCustomName={(instanceId, customName) => {
                setInstanceCustomNames(prev => {
                  const newMap = new Map(prev);
                  newMap.set(instanceId, customName);
                  return newMap;
                });

                // Also update the service_name in the items array
                const itemIndex = Array.from(itemInstanceIds.entries()).find(([_, id]) => id === instanceId)?.[0];
                if (itemIndex !== undefined) {
                  updateItem(itemIndex, 'service_name', customName);
                }
              }}
              studyDesign={studyDesign}
              studyTitle={quotationInfo.studyTitle}
              manualTimepointOverrides={manualTimepointOverrides}
              manualTimepointsByItemKey={manualTimepointsByItemKey}
              mandatoryServices={mandatoryServices}
              onCleanupObjective={cleanupObjectiveData}
              onAddExtraService={addExtraServiceToMandatory}
            />

        {/* Items are now integrated in ObjectiveManager */}

        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Additional Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valide pendant (jours)
              </label>
              <input
                type="number"
                value={validDays}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setValidDays(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
              />
            </div>
          </div>
        </div>

        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Remise Globale (%)
          </label>
          <input
            type="number"
            value={globalDiscountPercent}
            onChange={(e) => setGlobalDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
            className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            min="0"
            max="100"
            step="0.1"
            placeholder="0"
          />
          <p className="text-xs text-gray-600 mt-1">
            Cette remise s'appliquera à tous les services du devis
          </p>
        </div>

        <div className="flex justify-between items-center pt-6 border-t-2 border-gray-300">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <span className="text-lg font-semibold text-gray-700">Total HT:</span>
              <span className="text-xl font-bold text-gray-900">{formatCurrency(calculateTotalHT())} €</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-semibold text-gray-700">Total TTC:</span>
              <span className="text-2xl font-bold text-green-600">{formatCurrency(calculateTotalTTC())} €</span>
            </div>
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
          >
            Créer le Devis
          </button>
        </div>
      </form>
      {NotificationComponent}
    </div>
  );
}
