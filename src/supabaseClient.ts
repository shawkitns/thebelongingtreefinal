import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://smeykwjvyigbuostyqft.supabase.co'
const supabaseAnonKey = 'sb_publishable_LROEC86J0nwONscZCklGYA_gr8zINQQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)