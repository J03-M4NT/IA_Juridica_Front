import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Obtener las credenciales desde las variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase URL y Anon Key no están definidas en .env. Se usará configuración por defecto.')
}

// Crea y exporta el cliente de Supabase
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

