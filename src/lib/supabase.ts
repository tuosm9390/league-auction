import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

// You must create a Supabase project and provide the URL and Anon Key via .env.local
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
