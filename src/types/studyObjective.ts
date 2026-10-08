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
  { label: 'T Immediat', value: 'T Immediat' },
  { label: 'T imm', value: 'T imm' },
  { label: 'T0 (Baseline)', value: 'T0' },
  { label: 'T15min', value: 'T15min' },
  { label: 'T30min', value: 'T30min' },
  { label: '2H', value: 'T2H' },
  { label: '4H', value: 'T4H' },
  { label: '8H', value: 'T8H' },
  { label: '24H', value: 'T24H' },
  { label: 'T7 (1 week)', value: 'T7' },
  { label: 'T14 (2 weeks)', value: 'T14' },
  { label: 'T21 (3 weeks)', value: 'T21' },
  { label: 'T28 (4 weeks)', value: 'T28' },
  { label: 'T56 (8 weeks)', value: 'T56' },
];
