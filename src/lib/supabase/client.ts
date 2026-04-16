import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // During SSR this fires when .env.local is absent — log clearly instead of crashing with a cryptic message.
  // In the browser (runtime), the values are injected at build time from .env.local, so this never runs in production.
  console.error(
    '[NaBrasa] Variáveis de ambiente ausentes.\n' +
    'Crie o arquivo .env.local na raiz do projeto com:\n' +
    '  NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co\n' +
    '  NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-chave-anon>'
  )
}

// Use placeholders when env vars are absent so the module loads without crash.
// All Supabase calls will simply fail with a network error until .env.local is configured.
export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key'
)
