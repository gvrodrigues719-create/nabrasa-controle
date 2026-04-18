import { NextResponse } from 'next/server'
import { generateText, streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { createClient } from '@supabase/supabase-js'

import { getAuthenticatedUserContext } from '@/lib/auth-utils'

export const maxDuration = 30; // max vercel timeout

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: 'Falta GOOGLE_GENERATIVE_AI_API_KEY no Vercel.' }, { status: 500 })
    }

    // SEGURANÇA: Validar Autenticação no Servidor
    const context = await getAuthenticatedUserContext()
    if (!context) {
        return NextResponse.json({ error: 'Acesso negado: Sessão inválida ou expirada.' }, { status: 401 })
    }

    const body = await req.json()
    const { messages, userId: clientUserId } = body

    // SEGURANÇA: Anti-Spoofing (Cross-user block)
    // Se o cliente passar um userId diferente do autenticado, bloqueia ou força o autenticado.
    if (clientUserId && clientUserId !== context.userId) {
        return NextResponse.json({ error: 'Acesso negado: Tentativa de acesso a contexto de outro usuário.' }, { status: 403 })
    }

    const userId = context.userId // Forçar ID do servidor
    const today = new Date().toISOString().split('T')[0]

    // 1. CONTEXTO VIVO: Busca de dados reais da operação
    let userContext = `Usuário não autenticado no MOC.`
    
    if (userId) {
      try {
        // A. Perfil Operacional
        const { data: user } = await supabase
          .from('users')
          .select('name, position, shift, sector')
          .eq('id', userId)
          .single()

        // B. Checklists do Usuário (Pendentes e Atrasados)
        const { data: sessions } = await supabase
          .from('checklist_sessions')
          .select('scheduled_for, checklist_templates(name, priority)')
          .eq('user_id', userId)
          .eq('status', 'in_progress')
          .order('scheduled_for', { ascending: true })

        const pendingToday = sessions?.filter(s => s.scheduled_for === today) || []
        const lateSessions = sessions?.filter(s => (s.scheduled_for && s.scheduled_for < today) || !s.scheduled_for) || []

        const checklistContext = `
CHECKLISTS PARA HOJE (${today}):
${pendingToday.length > 0 ? pendingToday.map((s: any) => `- [PENDENTE] ${s.checklist_templates?.name}`).join('\n') : '- Nenhuma tarefa agendada para hoje.'}

CHECKLISTS ATRASADOS (PENDÊNCIAS ANTIGAS):
${lateSessions.length > 0 ? lateSessions.map((s: any) => `- [ATRASADO] ${s.checklist_templates?.name} (Agendado em: ${s.scheduled_for || 'Sem data'})`).join('\n') : '- Nenhuma pendência de dias anteriores.'}
`

        // C. Perdas Recentes (Últimas 24h)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { data: losses } = await supabase
          .from('inventory_losses')
          .select('quantity, category, observation, items(name)')
          .gte('created_at', yesterday)
          .order('created_at', { ascending: false })
          .limit(5)

        const lossesContext = `
PERDAS RELATADAS RECENTEMENTE (ÚLTIMAS 24H):
${losses && losses.length > 0 ? (losses as any[]).map(l => `- ${l.items?.name}: ${l.quantity} (${l.category})${l.observation ? ` - Obs: ${l.observation}` : ''}`).join('\n') : '- Nenhuma perda relatada na unidade nas últimas 24h.'}
`

        userContext = `
=== SNAPSHOT OPERACIONAL DO USUÁRIO ===
NOME: ${user?.name || 'Operador'}
CARGO/POSIÇÃO: ${user?.position || 'Colaborador'}
TURNO: ${user?.shift || 'Não definido'}
SETOR: ${user?.sector || 'Geral'}

${checklistContext}
${lossesContext}
`
      } catch (err) {
        console.error(`[Copilot][${requestId}] Erro no Contexto Vivo:`, err)
        userContext = "Contexto operacional indisponível no momento."
      }
    }

    // 2. Base de Conhecimento (FAQ)
    const { data: faqRows } = await supabase.from('knowledge_faq').select('question, answer').limit(20)
    const faqContext = faqRows && faqRows.length > 0 
      ? faqRows.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
      : 'FAQ não disponível.'

    // 3. System Prompt (Sidekick Persona)
    const systemPrompt = `
Você é a "Ajuda da Operação" do NaBrasa Controle. 
Sua missão é ser um Sidekick (parceiro) operacional curto, objetivo e prestativo.

DIRETRIZES:
1. Use o SNAPSHOT OPERACIONAL para responder sobre pendências ("o que falta?", "tenho algo atrasado?").
2. Se o usuário perguntar sobre perdas, use a seção de PERDAS RECENTES.
3. Se a pergunta for técnica/geral, use a BASE DE CONHECIMENTO.
4. NUNCA invente dados. Se não houver pendências, diga que a "mesa está limpa" ou que "está tudo em dia".
5. Respostas sempre em Português do Brasil, tom profissional mas próximo (estilo conversa de shift).

${userContext}

=== BASE DE CONHECIMENTO (FAQ) ===
${faqContext}
`

    // 4. Mapeamento CoreMessage (Ultra-safe)
    const coreMessages = messages
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => {
        let text = ''
        if (Array.isArray(m.parts)) {
          text = m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join('')
        } else if (typeof m.content === 'string') {
          text = m.content
        }
        return { role: m.role as 'user' | 'assistant', content: text }
      })
      .filter((m: any) => m.content.trim() !== '')

    console.log(`[Copilot][${requestId}] 🚀 StreamText (Gemini 2.5)`)

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      messages: coreMessages,
      temperature: 0.1, // Mais preciso para dados operacionais
    })

    return result.toUIMessageStreamResponse()

  } catch (error: any) {
    console.error(`[Copilot][${requestId}] Erro:`, error)
    return NextResponse.json({ error: 'Erro na IA', diagnosticId: requestId }, { status: 500 })
  }
}
