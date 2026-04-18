import { NextResponse } from 'next/server'
import { generateText, streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30; // max vercel timeout

// Setup Supabase (Service Role to safely query all user context)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7)
  console.log(`[Copilot][${requestId}] ▶ POST recebido`)
  
  try {
    // Verificação de Segurança de Configuração
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error(`[Copilot][${requestId}] ❌ CRÍTICO: GOOGLE_GENERATIVE_AI_API_KEY não configurada no ambiente.`)
      return NextResponse.json({ 
        error: 'Configuração de IA pendente (API Key ausente). Favor verificar se GOOGLE_GENERATIVE_AI_API_KEY está no Vercel.' 
      }, { status: 500 })
    }

    const body = await req.json()
    const { messages, userId, conversationId } = body
    console.log(`[Copilot][${requestId}] payload:`, { userId, messagesCount: messages?.length })

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Histórico de mensagens vazio.' }, { status: 400 })
    }

    // 1. Contexto Vivo (Live Data) - Blindagem Adicional
    let userContext = `Usuário não autenticado.`
    if (userId) {
      try {
          const { data: user } = await supabase.from('users').select('*').eq('id', userId).single()
          
          // Buscar checklists pendentes (Bug B fix: checklist_sessions + join templates)
          const { data: activeChecklists } = await supabase
            .from('checklist_sessions')
            .select('status, checklist_templates(name)')
            .eq('user_id', userId)
            .eq('status', 'in_progress')
            .limit(5)
          
          const checklistStr = activeChecklists && activeChecklists.length > 0
            ? activeChecklists.map((c: any) => `- ${c.checklist_templates?.name || 'Checklist sem nome'}`).join('\n') 
            : 'Nenhum checklist pendente.'

          // Buscar itens em atenção
          let attentionStr = 'Nenhum item em atenção mapeado.'
          try {
              const { data: attentionItems } = await supabase
                .from('inventory_attention_items')
                .select('item_name, reason')
                .limit(5)
              
              if (attentionItems && attentionItems.length > 0) {
                  attentionStr = attentionItems.map(a => `- ${a.item_name}: ${a.reason}`).join('\n')
              }
          } catch (err) { /* ignore table errors */ }

          userContext = `
=== DADOS REAIS DO USUÁRIO OPERACIONAL ===
Cargo/Função: ${user?.role || 'Operador'}
Nome: ${user?.name || 'Não identificado'}

Checklists Pendentes Para Mim Hoje:
${checklistStr}

Itens em Atenção (Minha Área/Geral):
${attentionStr}
`
      } catch (contextError) {
          console.error(`[Copilot][${requestId}] Erro ao buscar contexto:`, contextError)
          userContext = "Erro ao carregar dados reais. Respondendo com base em regras gerais."
      }
    }

    // 2. Base de Conhecimento (Static FAQ)
    const { data: faqRows } = await supabase.from('knowledge_faq').select('question, answer')
    const faqContext = faqRows && faqRows.length > 0 
      ? faqRows.map(f => `Pergunta: ${f.question}\nOrientação: ${f.answer}`).join('\n\n')
      : 'Nenhuma base estática carregada.'

    // 3. System Prompt Mestre
    const systemPrompt = `
Você é o Copiloto Operacional do NaBrasa Controle. Responda de forma curta, prática e humana.
Nunca invente regras. Priorize contagem, checklists e perdas.

=== BASE DE CONHECIMENTO ===
${faqContext}

${userContext}
`

    // 4. Mapeamento Ultra-Seguro de Mensagens (V6 -> CoreMessage)
    // Extraímos apenas texto para evitar quebras por metadados do SDK 6 (reasoning, tool-calls, etc)
    const coreMessages = messages
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => {
        let text = ''
        if (Array.isArray(m.parts)) {
          text = m.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text || '')
            .join('')
        } else if (typeof m.content === 'string') {
          text = m.content
        }
        return { role: m.role as 'user' | 'assistant', content: text }
      })
      .filter((m: { role: string; content: string }) => m.content.trim() !== '')

    console.log(`[Copilot][${requestId}] 🚀 Iniciando streamText com gemini-1.5-flash...`)

    const result = streamText({
      model: google('gemini-1.5-flash'),
      system: systemPrompt,
      messages: coreMessages,
      temperature: 0.2,
      onFinish: ({ text }) => {
          console.log(`[Copilot][${requestId}] ✅ Resposta gerada com sucesso (${text.length} chars)`)
      },
    })

    return result.toUIMessageStreamResponse()

  } catch (error: any) {
    console.error(`[Copilot][${requestId}] ❌ Erro inesperado:`, error)
    return NextResponse.json({ 
        error: error.message || 'Erro inesperado na IA. Verifique os logs do Vercel.',
        diagnosticId: requestId 
    }, { status: 500 })
  }
}


