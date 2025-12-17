export interface ServiceInstance {
  instanceId: string;
  serviceId: string;
  customName?: string;
}

export interface StudyObjective {
  id: string;
  name: string;
  timepoints: string[];
  serviceIds: string[];
  serviceInstances?: ServiceInstance[];
  customServiceNames?: Record<string, string>;
}

export interface TimepointOption {
  label: string;
  value: string;
}

export const AVAILABLE_TIMEPOINTS: TimepointOption[] = [
  { label: 'T0 (Baseline)', value: 'T0' },
  { label: 'T7 (1 week)', value: 'T7' },
  { label: 'T28 (4 weeks)', value: 'T28' },
  { label: 'T56 (8 weeks)', value: 'T56' },
];
