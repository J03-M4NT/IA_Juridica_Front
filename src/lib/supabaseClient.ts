import { createClient } from '@supabase/supabase-js'

// Obtener las credenciales desde las variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Valida que las credenciales existan
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required.')
}

// Crea y exporta el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
