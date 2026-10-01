// =============================================================================
// ATS PLURIX 360° | Cliente Supabase (PostgreSQL Serverless)
// =============================================================================

import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignore error in non-Vite context
  }
  return typeof process !== 'undefined' && process.env ? process.env[key] : undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Inicializa a instância se as variáveis de ambiente estiverem configuradas
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabase);
};

