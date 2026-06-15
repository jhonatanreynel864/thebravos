import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export const DOMINIO_PERMITIDO = import.meta.env.VITE_DOMINIO_UNIVERSITARIO || 'pascualbravo.edu.co'

export function esCorreoValido(email) {
  return email.toLowerCase().endsWith('@' + DOMINIO_PERMITIDO.toLowerCase())
}