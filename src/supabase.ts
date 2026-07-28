import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Interfaces for V.O.T.E Database Objects
export interface Candidate {
  id: string;
  name: string;
  political_party: string;
  party_logo: string;
  photo: string;
  vidhan_sabha: string;
  rajya_sabha: string;
  created_at?: string;
}

export interface Voter {
  id: string;
  full_name: string;
  father_name: string;
  pin_code: string;
  address: string;
  ward_number: string;
  rajya_sabha: string;
  vidhan_sabha: string;
  phone_number: string;
  voter_id_number: string;
  document_hash: string;
  document_url: string;
  is_verified: boolean;
  has_voted: boolean;
  created_at?: string;
}

export interface VoteRecord {
  id: string;
  candidate_id: string;
  political_party: string;
  vidhan_sabha: string;
  rajya_sabha: string;
  transaction_hash: string;
  block_height: number;
  created_at?: string;
}

export interface ElectionSettings {
  id: number;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  result_release_date: string;
  result_release_time: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  event: string;
  details: string;
  block_hash: string;
  created_at?: string;
}

// Utility: Browser SHA-256 Hashing helper using Web Crypto API
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
