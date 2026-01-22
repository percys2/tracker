import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para las tablas en espanol
export interface Vendedor {
  id: number
  nombre: string
  telefono: string | null
  correo: string | null
  latitud: number | null
  longitud: number | null
  estado: string
  ultima_actualizacion: string | null
  fecha_creacion: string
}

export interface Visita {
  id: number
  vendedor_id: number
  nombre_cliente: string
  direccion: string | null
  latitud: number | null
  longitud: number | null
  notas: string | null
  tipo_visita: string
  estado: string
  fecha_creacion: string
  fecha_completado: string | null
}

export interface Pedido {
  id: number
  vendedor_id: number
  visita_id: number | null
  nombre_cliente: string
  productos: string | null
  monto_total: number
  estado: string
  fecha_creacion: string
}

export interface Ubicacion {
  id: number
  vendedor_id: number
  latitud: number
  longitud: number
  precision_metros: number | null
  fecha_registro: string
}
