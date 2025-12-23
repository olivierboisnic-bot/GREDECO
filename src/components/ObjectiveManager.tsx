import { Plus, Trash2, X, Search, ChevronDown, ChevronUp, RefreshCw, Copy, GripVertical } from 'lucide-react';
import { StudyObjective, AVAILABLE_TIMEPOINTS, ServiceInstance } from '../types/studyObjective';
import { Service } from '../lib/supabase';
import { useState, useEffect, useRef } from 'react';
import { generateStableObjectiveId } from '../utils/objectiveId';
import { formatCurrency } from '../utils/numberFormat';

interface ObjectiveManagerProps {
  objectives: StudyObjective[];
  services: Service[];
  onObjectivesChange: (objectives: StudyObjective[]) => void;
  items: any[];
  itemTimepoints: Record<number, string[]>;
  onToggleItemTimepoint: (itemIndex: number, timepoint: string) => void;
  onResetItemTimepoints: (itemIndex: number) => void;
  onUpdateItem: (itemIndex: number, field: string, value: any) => void;
  onRemoveItem: (itemIndex: number) => void;
  onReorderItems?: (fromIndex: number, toIndex: number) => void;
  studyDesign?: any;
  studyTitle?: string;
  manualTimepointOverrides: Set<number>;
  manualTimepointsByItemKey: Map<string, string[]>;
  mandatoryServices?: string[];
  onCleanupObjective?: (objectiveName: string) => void;
  onAddExtraService?: (service: Service) => void;
  instanceCustomNames: Map<string, string>;
  onUpdateInstanceCustomName: (instanceId: string, customName: string) => void;
}

export default function ObjectiveManager({ objectives, services, onObjectivesChange, items, itemTimepoints, onToggleItemTimepoint, onResetItemTimepoints, onUpdateItem, onRemoveItem, onReorderItems, studyDesign, studyTitle, manualTimepointOverrides, manualTimepointsByItemKey, mandatoryServices = [], onCleanupObjective, onAddExtraService, instanceCustomNames, onUpdateInstanceCustomName }: ObjectiveManagerProps) {
  const [customTimepoints, setCustomTimepoints] = useState<Record<string, string>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [expandedObjectives, setExpandedObjectives] = useState<Record<string, boolean>>({});
  const [expandedMandatory, setExpandedMandatory] = useState(true);
  const [showExtraServiceSelector, setShowExtraServiceSelector] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [draggedObjectiveId, setDraggedObjectiveId] = useState<string | null>(null);
  const [draggedObjectiveIndex, setDraggedObjectiveIndex] = useState<number | null>(null);

  const getItemKey = (item: any): string => {
    if (!item.service_id) return 'no_service';

    // Check if it's a mandatory service
    if (item.description?.includes('MANDATORY FOR ALL STUDIES')) {
      return `${item.service_id}_mandatory_all`;
    } else if (item.description?.includes('MANDATORY FOR CLINICAL TRIALS')) {
      return `${item.service_id}_mandatory_clinical`;
    } else if (item.description?.includes('MANDATORY FOR LABORATORY TRIALS')) {
      return `${item.service_id}_mandatory_lab`;
    }

    // For objective-based services, use service_id + objective_name
    if (item.objective_name) {
      const objectiveId = objectives.find(obj => obj.name === item.objective_name)?.id || item.objective_name;
      return `${item.service_id}_${objectiveId}`;
    }

    return item.service_id;
  };
  const [extraServiceSearch, setExtraServiceSearch] = useState('');
  const objectiveRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const newExpanded: Record<string, boolean> = {};
    objectives.forEach(obj => {
      if (obj.serviceIds && obj.serviceIds.length > 0) {
        newExpanded[obj.id] = true;
      }
    });
    if (Object.keys(newExpanded).length > 0) {
      setExpandedObjectives(prev => ({ ...prev, ...newExpanded }));
    }
  }, [objectives.length]);

  const addObjective = () => {
    const newObjective: StudyObjective = {
      id: `obj-temp-${Date.now()}`,
      name: '',
      timepoints: ['T0', 'T28'],
      serviceIds: [],
      serviceInstances: [],
    };
    onObjectivesChange([...objectives, newObjective]);

    // Scroll to the new objective after a short delay to allow rendering
    setTimeout(() => {
      const element = objectiveRefs.current[newObjective.id];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const removeObjective = (id: string) => {
    const objectiveToRemove = objectives.find(obj => obj.id === id);
    if (objectiveToRemove?.name && onCleanupObjective) {
      onCleanupObjective(objectiveToRemove.name);
    }
    onObjectivesChange(objectives.filter(obj => obj.id !== id));
  };

  const updateObjective = (id: string, updates: Partial<StudyObjective>, regenerateId: boolean = false) => {
    const updatedObjectives = objectives.map(obj => {
      if (obj.id === id) {
        const updated = { ...obj, ...updates };
        // If name is being updated and it's not empty, regenerate stable ID only when explicitly requested
        if (regenerateId && updates.name !== undefined && updates.name.trim() && obj.id.startsWith('obj-temp-')) {
          const index = objectives.filter(o => o.name.trim() && o.id !== id).length;
          updated.id = generateStableObjectiveId(updates.name, index);
        }
        return updated;
      }
      // CRITICAL: Always create a new copy to avoid reference sharing
      return {
        ...obj,
        serviceIds: [...obj.serviceIds],
        serviceInstances: obj.serviceInstances ? obj.serviceInstances.map(inst => ({ ...inst })) : [],
        timepoints: [...obj.timepoints]
      };
    });
    onObjectivesChange(updatedObjectives);
  };

  const sortTimepoints = (timepoints: string[]): string[] => {
    const getTimepointValueInMinutes = (timepoint: string): number => {
      // Remove the 'T' prefix
      const value = timepoint.substring(1);

      // Check for minutes (min or m)
      if (value.endsWith('min')) {
        return parseInt(value);
      }
      if (value.match(/^\d+m$/i)) {
        return parseInt(value);
      }

      // Check for hours (H)
      if (value.endsWith('H')) {
        return parseInt(value) * 60;
      }

      // Otherwise, it's days - convert to minutes
      const num = parseInt(value);
      return num * 24 * 60;
    };
    return timepoints.sort((a, b) => getTimepointValueInMinutes(a) - getTimepointValueInMinutes(b));
  };

  const toggleTimepoint = (objectiveId: string, timepoint: string) => {
    const objective = objectives.find(obj => obj.id === objectiveId);
    if (!objective) return;

    const hasTimepoint = objective.timepoints.includes(timepoint);
    const newTimepoints = hasTimepoint
      ? objective.timepoints.filter(tp => tp !== timepoint)
      : sortTimepoints([...objective.timepoints, timepoint]);

    if (!hasTimepoint) {
      const objectiveItems = items.filter(item => {
        const description = item.description || '';
        const objectivePattern = new RegExp(`Objective:[^)]*\\b${objective.name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i');
        return objectivePattern.test(description);
      });

      objectiveItems.forEach(item => {
        const itemIndex = items.indexOf(item);
        if (itemIndex !== -1 && !(itemTimepoints[itemIndex] || []).includes(timepoint)) {
          onToggleItemTimepoint(itemIndex, timepoint);
        }
      });
    }

    updateObjective(objectiveId, { timepoints: newTimepoints });
  };

  const toggleService = (objectiveId: string, serviceId: string) => {
    const objective = objectives.find(obj => obj.id === objectiveId);
    if (!objective) return;

    const hasService = objective.serviceIds.includes(serviceId);

    let updatedObjectives;
    if (hasService) {
      // Remove service and its instances
      const newServiceIds = objective.serviceIds.filter(sid => sid !== serviceId);
      const newServiceInstances = (objective.serviceInstances || []).filter(inst => inst.serviceId !== serviceId);
      updatedObjectives = objectives.map(obj =>
        obj.id === objectiveId
          ? { ...obj, serviceIds: newServiceIds, serviceInstances: newServiceInstances }
          : { ...obj, serviceIds: [...obj.serviceIds], serviceInstances: obj.serviceInstances ? [...obj.serviceInstances] : [] }
      );
    } else {
      // Add service with first instance
      const newServiceIds = [...objective.serviceIds, serviceId];
      const firstInstance: ServiceInstance = {
        instanceId: `instance-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        serviceId: serviceId,
      };
      const newServiceInstances = [...(objective.serviceInstances || []), firstInstance];
      updatedObjectives = objectives.map(obj =>
        obj.id === objectiveId
          ? { ...obj, serviceIds: newServiceIds, serviceInstances: newServiceInstances }
          : { ...obj, serviceIds: [...obj.serviceIds], serviceInstances: obj.serviceInstances ? [...obj.serviceInstances] : [] }
      );
    }

    // Update objectives - recalculation happens automatically via useEffect
    onObjectivesChange(updatedObjectives);
  };

  const addServiceInstance = (objectiveId: string, serviceId: string) => {
    const objective = objectives.find(obj => obj.id === objectiveId);
    if (!objective) return;

    const serviceInstances = objective.serviceInstances || [];
    const newInstance: ServiceInstance = {
      instanceId: `instance-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      serviceId: serviceId,
    };

    const newServiceIds = objective.serviceIds.includes(serviceId)
      ? objective.serviceIds
      : [...objective.serviceIds, serviceId];

    const updatedObjectives = objectives.map(obj =>
      obj.id === objectiveId
        ? { ...obj, serviceIds: newServiceIds, serviceInstances: [...serviceInstances, newInstance] }
        : { ...obj, serviceIds: [...obj.serviceIds], serviceInstances: obj.serviceInstances ? [...obj.serviceInstances] : [] }
    );

    onObjectivesChange(updatedObjectives);
  };

  const removeServiceInstance = (objectiveId: string, instanceId: string) => {
    const objective = objectives.find(obj => obj.id === objectiveId);
    if (!objective) return;

    const serviceInstances = (objective.serviceInstances || []).filter(
      inst => inst.instanceId !== instanceId
    );

    const instance = objective.serviceInstances?.find(inst => inst.instanceId === instanceId);
    if (!instance) return;

    const remainingInstancesOfService = serviceInstances.filter(
      inst => inst.serviceId === instance.serviceId
    );

    const newServiceIds = remainingInstancesOfService.length === 0
      ? objective.serviceIds.filter(sid => sid !== instance.serviceId)
      : objective.serviceIds;

    const updatedObjectives = objectives.map(obj =>
      obj.id === objectiveId
        ? { ...obj, serviceIds: newServiceIds, serviceInstances }
        : { ...obj, serviceIds: [...obj.serviceIds], serviceInstances: obj.serviceInstances ? [...obj.serviceInstances] : [] }
    );

    onObjectivesChange(updatedObjectives);
  };


  const toggleObjectiveExpansion = (objectiveId: string) => {
    setExpandedObjectives({
      ...expandedObjectives,
      [objectiveId]: !expandedObjectives[objectiveId]
    });
  };

  const addCustomTimepoint = (objectiveId: string) => {
    const customValue = customTimepoints[objectiveId]?.trim();
    if (!customValue) return;

    const timepointPattern = /^T\d+(H|min|m)?$/i;
    if (!timepointPattern.test(customValue.toUpperCase())) {
      alert('Veuillez entrer un format de timepoint valide (ex: T14, T8H, T24H, T30min, T15m)');
      return;
    }

    const formattedTimepoint = customValue.toUpperCase();
    const objective = objectives.find(obj => obj.id === objectiveId);
    if (!objective) return;

    if (objective.timepoints.includes(formattedTimepoint)) {
      alert('Ce timepoint existe déjà');
      return;
    }

    const newTimepoints = sortTimepoints([...objective.timepoints, formattedTimepoint]);

    const objectiveItems = items.filter(item => {
      const description = item.description || '';
      const objectivePattern = new RegExp(`Objective:[^)]*\\b${objective.name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i');
      return objectivePattern.test(description);
    });

    objectiveItems.forEach(item => {
      const itemIndex = items.indexOf(item);
      if (itemIndex !== -1 && !(itemTimepoints[itemIndex] || []).includes(formattedTimepoint)) {
        onToggleItemTimepoint(itemIndex, formattedTimepoint);
      }
    });

    updateObjective(objectiveId, { timepoints: newTimepoints });
    setCustomTimepoints({ ...customTimepoints, [objectiveId]: '' });
  };

  const getObjectiveItems = (objectiveId: string) => {
    const objective = objectives.find(obj => obj.id === objectiveId);
    if (!objective) return [];

    // Filter items by checking if the service_id is in the objective's serviceIds
    // AND if the item belongs to this specific objective
    return items.filter(item => {
      if (!item.service_id || !objective.serviceIds.includes(item.service_id)) {
        return false;
      }

      // Check if item belongs to this objective by comparing IDs
      // This properly handles duplicate objective names
      if (item.objective_id) {
        return item.objective_id === objectiveId;
      }

      // Fallback to name comparison for backward compatibility
      if (item.objective_name) {
        return item.objective_name === objective.name;
      }

      // Items without objective info are mandatory services (not objective-specific)
      return false;
    });
  };

  const getMandatoryItems = () => {
    return items.filter(item =>
      (item.service_id && mandatoryServices.includes(item.service_id)) ||
      item.description?.includes('MANDATORY FOR ALL STUDIES') ||
      item.description?.includes('MANDATORY FOR CLINICAL TRIALS') ||
      item.description?.includes('MANDATORY FOR LABORATORY TRIALS')
    );
  };

  const handleDragStart = (itemIndex: number, objectiveId: string) => {
    setDraggedItemIndex(itemIndex);
    setDraggedObjectiveId(objectiveId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetItemIndex: number, targetObjectiveId: string) => {
    if (draggedItemIndex === null || draggedObjectiveId === null) return;
    if (draggedObjectiveId !== targetObjectiveId) return; // Only allow reordering within the same objective
    if (draggedItemIndex === targetItemIndex) return;

    if (onReorderItems) {
      onReorderItems(draggedItemIndex, targetItemIndex);
    }

    setDraggedItemIndex(null);
    setDraggedObjectiveId(null);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
    setDraggedObjectiveId(null);
  };

  const handleObjectiveDragStart = (index: number) => {
    setDraggedObjectiveIndex(index);
  };

  const handleObjectiveDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleObjectiveDrop = (targetIndex: number) => {
    if (draggedObjectiveIndex === null) return;
    if (draggedObjectiveIndex === targetIndex) return;

    const reorderedObjectives = [...objectives];
    const [movedObjective] = reorderedObjectives.splice(draggedObjectiveIndex, 1);
    reorderedObjectives.splice(targetIndex, 0, movedObjective);

    onObjectivesChange(reorderedObjectives);
    setDraggedObjectiveIndex(null);
  };

  const handleObjectiveDragEnd = () => {
    setDraggedObjectiveIndex(null);
  };

  const removeCustomTimepoint = (objectiveId: string, timepoint: string) => {
    const objective = objectives.find(obj => obj.id === objectiveId);
    if (!objective) return;

    const newTimepoints = objective.timepoints.filter(tp => tp !== timepoint);
    updateObjective(objectiveId, { timepoints: newTimepoints });
  };

  const getFilteredServices = (objectiveId: string) => {
    const searchTerm = searchTerms[objectiveId] || '';

    return services.filter((service) => {
      if (searchTerm === '') {
        return true;
      }

      const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 0);
      const searchableText = `${service.name} ${service.appareil || ''} ${service.langues || ''}`.toLowerCase();

      return searchWords.every(word => searchableText.includes(word));
    });
  };

  const addPresetObjective = (presetName: string, presetServices: string[]) => {
    let newObjectiveId = '';

    onObjectivesChange((prevObjectives) => {
      const matchedServices: string[] = [];
      const serviceInstances: ServiceInstance[] = [];
      const baseTimestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);

      for (let i = 0; i < presetServices.length; i++) {
        const keyword = presetServices[i];
        const service = services.find(s => {
          const name = s.name.toLowerCase();
          const desc = (s.appareil || '').toLowerCase();
          const matchesKeyword = desc.includes(keyword.toLowerCase()) || name.includes(keyword.toLowerCase());
          const isNotPostProcedure = !name.includes('post procedure') && !name.includes('post-procedure');
          const isNotCorps = !name.includes('corps');
          return matchesKeyword && isNotPostProcedure && isNotCorps;
        });
        if (service && !matchedServices.includes(service.id)) {
          matchedServices.push(service.id);
          serviceInstances.push({
            instanceId: `instance-${baseTimestamp}-${prevObjectives.length}-${i}-${randomSuffix}`,
            serviceId: service.id,
          });
        }
      }

      // Use total objectives length to ensure unique IDs even for duplicate names
      const index = prevObjectives.length;
      const newObjective: StudyObjective = {
        id: generateStableObjectiveId(presetName, index),
        name: presetName,
        timepoints: ['T0', 'T28'],
        serviceIds: [...matchedServices], // Create new array to avoid reference sharing
        serviceInstances: serviceInstances.map(inst => ({ ...inst })), // Deep copy instances
      };

      newObjectiveId = newObjective.id;
      return [...prevObjectives, newObjective];
    });

    // Scroll to the new objective after a short delay to allow rendering
    setTimeout(() => {
      const element = objectiveRefs.current[newObjectiveId];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const addPresetObjectiveByIds = (presetName: string, serviceIds: string[]) => {
    let newObjectiveId = '';

    onObjectivesChange((prevObjectives) => {
      const matchedServices: string[] = [];
      const serviceInstances: ServiceInstance[] = [];
      const baseTimestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);

      for (let i = 0; i < serviceIds.length; i++) {
        const serviceId = serviceIds[i];
        const service = services.find(s => s.id === serviceId);
        if (service && !matchedServices.includes(service.id)) {
          matchedServices.push(service.id);
          serviceInstances.push({
            instanceId: `instance-${baseTimestamp}-${prevObjectives.length}-${i}-${randomSuffix}`,
            serviceId: service.id,
          });
        }
      }

      // Use total objectives length to ensure unique IDs even for duplicate names
      const index = prevObjectives.length;
      const newObjective: StudyObjective = {
        id: generateStableObjectiveId(presetName, index),
        name: presetName,
        timepoints: ['T0', 'T28'],
        serviceIds: [...matchedServices], // Create new array to avoid reference sharing
        serviceInstances: serviceInstances.map(inst => ({ ...inst })), // Deep copy instances
      };

      newObjectiveId = newObjective.id;
      return [...prevObjectives, newObjective];
    });

    // Scroll to the new objective after a short delay to allow rendering
    setTimeout(() => {
      const element = objectiveRefs.current[newObjectiveId];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Objectifs de l'Étude</h3>
        <button
          type="button"
          onClick={addObjective}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-md"
        >
          <Plus size={16} />
          Ajouter un Objectif
        </button>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-white p-3 rounded-lg border border-blue-300 shadow-md">
        <p className="text-xs font-medium text-blue-900 mb-2">Ajout Rapide d'Objectifs:</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addPresetObjectiveByIds('Blanchissement/Éclaircissement de la peau', ['3506f3a4-2d60-4d1d-ad7a-ea13c5b191c7'])}
            className="px-3 py-1.5 bg-white text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium border border-blue-300 shadow-sm"
          >
            Blanchissement/Éclaircissement
          </button>
          <button
            type="button"
            onClick={() => addPresetObjective('Anti-âge', ['cutometer', 'primos', 'visioscan', 'photography', 'visia'])}
            className="px-3 py-1.5 bg-white text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium border border-blue-300 shadow-sm"
          >
            Anti-âge
          </button>
          <button
            type="button"
            onClick={() => addPresetObjective('Hydratation', ['corneometer', 'tewl', 'skicon'])}
            className="px-3 py-1.5 bg-white text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium border border-blue-300 shadow-sm"
          >
            Hydratation
          </button>
        </div>
      </div>

      {objectives.length === 0 && (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          Aucun objectif pour le moment. Cliquez sur "Ajouter un Objectif" pour en créer un.
        </div>
      )}

      <div className="space-y-4">
        {objectives.map((objective, index) => {
          const objectiveItems = getObjectiveItems(objective.id);
          console.log('🎯 Objective Display:', {
            id: objective.id,
            name: objective.name,
            serviceIds: objective.serviceIds,
            itemsFound: objectiveItems.length,
            totalItems: items.length
          });
          const isExpanded = expandedObjectives[objective.id] ?? true;
          const isDraggingObjective = draggedObjectiveIndex === index;

          return (
          <div
            key={objective.id}
            ref={(el) => objectiveRefs.current[objective.id] = el}
            onDragOver={handleObjectiveDragOver}
            onDrop={() => handleObjectiveDrop(index)}
            className={`border border-blue-300 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-white shadow-md transition-opacity ${
              isDraggingObjective ? 'opacity-50' : 'opacity-100'
            }`}
          >
            <div className="flex items-start gap-2 mb-4">
              <div
                draggable
                onDragStart={() => handleObjectiveDragStart(index)}
                onDragEnd={handleObjectiveDragEnd}
                className="flex-shrink-0 pt-1 text-blue-400 hover:text-blue-600 cursor-grab active:cursor-grabbing"
              >
                <GripVertical size={20} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de l'Objectif {index + 1}
                </label>
                <input
                  type="text"
                  value={objective.name}
                  onChange={(e) => updateObjective(objective.id, { name: e.target.value }, false)}
                  onBlur={(e) => updateObjective(objective.id, { name: e.target.value }, true)}
                  placeholder="ex: Efficacité anti-âge, Blanchissement, Hydratation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 ml-3">
                <button
                  type="button"
                  onClick={() => toggleObjectiveExpansion(objective.id)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  title={isExpanded ? "Réduire" : "Développer"}
                >
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                <button
                  type="button"
                  onClick={() => removeObjective(objective.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer l'objectif"
                >
                  <Trash2 size={18} />
                </button>
              </div>
                  </div>
                </div>
              </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temps (Sélection multiple)
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {AVAILABLE_TIMEPOINTS.map((tp) => (
                  <button
                    type="button"
                    key={tp.value}
                    onClick={() => toggleTimepoint(objective.id, tp.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      objective.timepoints.includes(tp.value)
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tp.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 items-center mb-2">
                <input
                  type="text"
                  value={customTimepoints[objective.id] || ''}
                  onChange={(e) => setCustomTimepoints({ ...customTimepoints, [objective.id]: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomTimepoint(objective.id);
                    }
                  }}
                  placeholder="Ajouter un temps personnalisé (ex: T14, T8H, T30min, T15m)"
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => addCustomTimepoint(objective.id)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shadow-md"
                >
                  Ajouter
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {objective.timepoints.map((tp) => (
                  <div
                    key={tp}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium"
                  >
                    {tp}
                    <button
                      type="button"
                      onClick={() => removeCustomTimepoint(objective.id, tp)}
                      className="ml-1 hover:text-blue-900"
                      title="Supprimer le temps"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500">
                Sélectionné: {objective.timepoints.length} temps ({sortTimepoints([...objective.timepoints]).join(', ')})
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Services Sélectionnés
              </label>
              {objective.serviceIds.length === 0 ? (
                <p className="text-xs text-gray-500 italic">Aucun service sélectionné</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {objective.serviceIds.map((serviceId, idx) => {
                    const service = services.find(s => s.id === serviceId);
                    const instances = (objective.serviceInstances || []).filter(inst => inst.serviceId === serviceId);
                    const colors = [
                      'bg-green-100 text-green-700 hover:bg-green-200',
                      'bg-purple-100 text-purple-700 hover:bg-purple-200',
                      'bg-orange-100 text-orange-700 hover:bg-orange-200',
                      'bg-blue-100 text-blue-700 hover:bg-blue-200',
                      'bg-pink-100 text-pink-700 hover:bg-pink-200',
                      'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
                    ];

                    if (!service) return null;

                    return instances.map((instance, instanceIdx) => {
                      const instanceColor = colors[(idx + instanceIdx) % colors.length];
                      return (
                        <div
                          key={instance.instanceId}
                          className="mb-3 border border-gray-200 rounded-lg p-3 bg-white"
                        >
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${instanceColor}`}>
                            <span className="max-w-[200px] truncate" title={service.name}>
                              {instanceCustomNames.get(instance.instanceId) || service.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeServiceInstance(objective.id, instance.instanceId)}
                              className="ml-1 hover:opacity-70"
                              title="Supprimer cette instance"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder={`Nom personnalisé (défaut: ${service.name})`}
                            value={instanceCustomNames.get(instance.instanceId) || ''}
                            onChange={(e) => onUpdateInstanceCustomName(instance.instanceId, e.target.value)}
                            className="mt-1 w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          />
                          <div className="mt-2 text-xs font-medium text-gray-700">
                            {formatCurrency(service.base_price)} € HT par {service.unit || 'unit'}
                          </div>
                        </div>
                      );
                    });
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ajouter des Services à cet Objectif
              </label>

              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={searchTerms[objective.id] || ''}
                    onChange={(e) => setSearchTerms({ ...searchTerms, [objective.id]: e.target.value })}
                    placeholder="Rechercher des services par nom..."
                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
                {services.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">Aucun service disponible</p>
                ) : getFilteredServices(objective.id).length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">Aucun service ne correspond à votre recherche</p>
                ) : (
                  getFilteredServices(objective.id).map((service) => {
                    const isSelected = objective.serviceIds.includes(service.id);

                    return (
                      <label key={service.id} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer border border-transparent hover:border-gray-200">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleService(objective.id, service.id)}
                          className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{service.name}</p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {formatCurrency(service.base_price || 0)} € HT par {service.unit || 'unit'}
                            {service.service_type === 'recurring' && objective.timepoints && objective.timepoints.length > 0 && (
                              <span className="ml-1 text-blue-600">(×{objective.timepoints.length} temps)</span>
                            )}
                          </p>
                        </div>
                        {isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addServiceInstance(objective.id, service.id);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            title="Ajouter une instance supplémentaire de ce service"
                          >
                            <Copy size={12} />
                            Dupliquer
                          </button>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {isExpanded && objectiveItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Éléments du Devis pour cet Objectif ({objectiveItems.length})</h4>
                <div className="space-y-2">
                  {objectiveItems.map((item, idx) => {
                    const itemIndex = items.indexOf(item);
                    const service = services.find(s => s.id === item.service_id);
                    const isRecurring = service?.service_type === 'recurring';
                    const isDragging = draggedItemIndex === itemIndex;

                    return (
                      <div
                        key={idx}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(itemIndex, objective.id)}
                        className={`p-3 bg-white border border-gray-200 rounded-lg shadow-sm transition-opacity ${
                          isDragging ? 'opacity-50' : 'opacity-100'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            draggable
                            onDragStart={() => handleDragStart(itemIndex, objective.id)}
                            onDragEnd={handleDragEnd}
                            className="flex-shrink-0 pt-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical size={16} />
                          </div>
                          <div className="flex-1">
                            <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Nom du Service
                          </label>
                          <input
                            type="text"
                            value={item.service_name || ''}
                            onChange={(e) => onUpdateItem(itemIndex, 'service_name', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Quantité
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.quantity || 0}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => onUpdateItem(itemIndex, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            {isRecurring && (
                              <p className="text-xs text-gray-500 mt-1">
                                Auto: {studyDesign?.numberOfPanelists || 0} × {(itemTimepoints[itemIndex] || []).length} = {(studyDesign?.numberOfPanelists || 0) * (itemTimepoints[itemIndex] || []).length}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Prix Unitaire (€ HT)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.unit_price}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => onUpdateItem(itemIndex, 'unit_price', parseFloat(e.target.value))}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Remise (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.discount_percent}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => onUpdateItem(itemIndex, 'discount_percent', parseFloat(e.target.value))}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Total HT
                            </label>
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-900 bg-gray-100 rounded-lg border border-gray-300">
                              {formatCurrency(item.amount_without_tax)} €
                            </div>
                          </div>
                        </div>

                        <div className="p-2 bg-gray-50 rounded border border-gray-200">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                                Temps:
                              </label>
                              {(() => {
                                const itemKey = getItemKey(item);
                                const hasOverride = manualTimepointOverrides.has(itemIndex) || manualTimepointsByItemKey.has(itemKey);
                                if (hasOverride) {
                                  console.log('Manual override detected:', {
                                    itemIndex,
                                    itemKey,
                                    inOverrides: manualTimepointOverrides.has(itemIndex),
                                    inByItemKey: manualTimepointsByItemKey.has(itemKey),
                                    allOverrides: Array.from(manualTimepointOverrides),
                                    allByItemKey: Array.from(manualTimepointsByItemKey.entries())
                                  });
                                }
                                return hasOverride ? (
                                  <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded font-medium whitespace-nowrap">
                                    Manuel
                                  </span>
                                ) : null;
                              })()}
                              {(manualTimepointOverrides.has(itemIndex) || manualTimepointsByItemKey.has(getItemKey(item))) && (
                                <button
                                  type="button"
                                  onClick={() => onResetItemTimepoints(itemIndex)}
                                  className="flex items-center gap-1 px-2 py-0.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors whitespace-nowrap"
                                  title="Réinitialiser aux timepoints de l'objectif"
                                >
                                  <RefreshCw size={12} />
                                  Réinit.
                                </button>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 flex-1">
                              {(() => {
                                // Show all timepoints: union of objective timepoints and item's custom timepoints
                                const itemTps = itemTimepoints[itemIndex] || [];
                                const allTimepoints = [...new Set([...objective.timepoints, ...itemTps])];

                                // Sort timepoints using the same logic as the main sort function
                                const sorted = sortTimepoints(allTimepoints);

                                return sorted.map((tp) => {
                                  const isSelected = itemTps.includes(tp);
                                  const isFromObjective = objective.timepoints.includes(tp);
                                  return (
                                    <button
                                      type="button"
                                      key={tp}
                                      onClick={() => onToggleItemTimepoint(itemIndex, tp)}
                                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                        isSelected
                                          ? 'bg-blue-600 text-white shadow-md'
                                          : isFromObjective
                                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'
                                      }`}
                                      title={!isFromObjective ? 'Timepoint personnalisé' : ''}
                                    >
                                      {tp}
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                            {isRecurring && (
                              <span className="text-xs text-gray-600 whitespace-nowrap">
                                ({(studyDesign?.numberOfPanelists && studyDesign.numberOfPanelists > 0) ? studyDesign.numberOfPanelists : 30} × {(itemTimepoints[itemIndex] || []).length})
                              </span>
                            )}
                          </div>
                        </div>
                            </div>
                          </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
        })}
      </div>

      {(getMandatoryItems().length > 0 || onAddExtraService) && (
        <div className="mt-6 border border-orange-300 rounded-lg p-4 bg-gradient-to-br from-orange-50 to-white shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="px-3 py-1 bg-orange-600 text-white text-xs rounded-full font-bold">
                ⚠️ OBLIGATOIRE
              </span>
              Services Obligatoires
            </h3>
            <button
              type="button"
              onClick={() => setExpandedMandatory(!expandedMandatory)}
              className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
              title={expandedMandatory ? "Réduire" : "Développer"}
            >
              {expandedMandatory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>

          {expandedMandatory && (
            <div className="space-y-2">
              {getMandatoryItems().map((item, idx) => {
                const itemIndex = items.indexOf(item);
                const service = services.find(s => s.id === item.service_id);
                const isRecurring = service?.service_type === 'recurring';
                const isDragging = draggedItemIndex === itemIndex;
                const allTimepoints = objectives.flatMap(obj => obj.timepoints).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => {
                  const numA = parseInt(a.substring(1));
                  const numB = parseInt(b.substring(1));
                  return numA - numB;
                });

                return (
                  <div
                    key={idx}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(itemIndex, 'mandatory')}
                    className={`p-3 bg-white border border-orange-200 rounded-lg shadow-sm relative transition-opacity ${
                      isDragging ? 'opacity-50' : 'opacity-100'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        draggable
                        onDragStart={() => handleDragStart(itemIndex, 'mandatory')}
                        onDragEnd={handleDragEnd}
                        className="flex-shrink-0 pt-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical size={16} />
                      </div>
                      <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce service obligatoire ?')) {
                          onRemoveItem(itemIndex);
                        }
                      }}
                      className="absolute top-2 right-2 p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Supprimer ce service"
                    >
                      <X size={16} />
                    </button>

                    <div className="mb-3 pr-8">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nom du Service
                      </label>
                      <input
                        type="text"
                        value={item.service_name || ''}
                        onChange={(e) => onUpdateItem(itemIndex, 'service_name', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Quantité
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.quantity || 0}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => onUpdateItem(itemIndex, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Prix Unitaire (€ HT)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price || 0}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => onUpdateItem(itemIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Remise (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.discount_percent || 0}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => onUpdateItem(itemIndex, 'discount_percent', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Total HT
                        </label>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-900 bg-gray-100 rounded-lg border border-gray-300">
                          {formatCurrency(item.amount_without_tax || 0)} €
                        </div>
                      </div>
                    </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {onAddExtraService && (
                <div className="mt-4 pt-4 border-t border-orange-200">
                  {!showExtraServiceSelector ? (
                    <button
                      type="button"
                      onClick={() => setShowExtraServiceSelector(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
                    >
                      <Plus size={18} />
                      Ajouter un service supplémentaire
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Search size={16} className="text-gray-400" />
                        <input
                          type="text"
                          value={extraServiceSearch}
                          onChange={(e) => setExtraServiceSearch(e.target.value)}
                          placeholder="Rechercher un service..."
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowExtraServiceSelector(false);
                            setExtraServiceSearch('');
                          }}
                          className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1 bg-white border border-gray-300 rounded-lg p-2">
                        {services
                          .filter(service =>
                            service.name.toLowerCase().includes(extraServiceSearch.toLowerCase()) ||
                            (service.appareil && service.appareil.toLowerCase().includes(extraServiceSearch.toLowerCase()))
                          )
                          .map(service => (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => {
                                onAddExtraService(service);
                                setShowExtraServiceSelector(false);
                                setExtraServiceSearch('');
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-orange-50 rounded-lg transition-colors group"
                            >
                              <div className="font-medium text-sm text-gray-900 group-hover:text-orange-600">
                                {service.name}
                              </div>
                              {service.appareil && (
                                <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                  {service.appareil}
                                </div>
                              )}
                              <div className="text-xs text-gray-600 mt-1">
                                {formatCurrency(service.base_price)} € HT
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
