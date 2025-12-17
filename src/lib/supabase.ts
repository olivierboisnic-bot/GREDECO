import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Service {
  id: string;
  name: string;
  appareil: string;
  langues?: string;
  base_price: number;
  tva_rate?: number;
  unit: string;
  category: string;
  type?: 'optional' | 'mandatory_all' | 'mandatory_clinical' | 'mandatory_lab';
  multiplier_type?: 'none' | 'panelists' | 'timepoints' | 'both' | 'skin_and_condition';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_email: string;
  customer_company: string;
  customer_address: string;
  postal_code?: string;
  city?: string;
  country?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  valid_until: string;
  notes: string;
  total_amount: number;
  study_title: string;
  quotation_date: string;
  product_description: string;
  product_quantity: number;
  number_of_volunteers: number;
  study_objectives?: string;
  objectives_data?: any;
  methodology?: string;
  inclusion_criteria: string;
  exclusion_criteria: string;
  skin_types?: string;
  timepoints: string;
  vat_rate: number;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  service_id?: string;
  service_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  vat_percent: number;
  amount_without_tax: number;
  subtotal: number;
  objective_name?: string;
  objective_timepoints?: string;
  created_at: string;
}
