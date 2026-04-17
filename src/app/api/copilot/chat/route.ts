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
  try {
    const { messages, userId, conversationId } = await req.json()

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Mensagens não fornecidas' }, { status: 400 })
    }

    // 1. Contexto Vivo (Live Data)
    let userContext = `Usuário não autenticado.`
    if (userId) {
      // Buscar perfil
      const { data: user } = await supabase.from('users').select('*').eq('id', userId).single()
      
      // Buscar checklists pendentes
      const { data: activeChecklists } = await supabase
        .from('checklists')
        .select('title, status')
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .limit(5)
      
      const checklistStr = activeChecklists && activeChecklists.length > 0
        ? activeChecklists.map(c => `- ${c.title}`).join('\n') 
        : 'Nenhum checklist pendente.'

      // Buscar itens em atenção (segurança contra tabela nula caso o user ainda n tenha criado)
      let attentionStr = 'Nenhum item em atenção mapeado ou sem setor definido.'
      try {
          const { data: attentionItems } = await supabase
            .from('inventory_attention_items')
            .select('item_name, reason')
            .limit(5)
          
          if (attentionItems && attentionItems.length > 0) {
              attentionStr = attentionItems.map(a => `- ${a.item_name}: ${a.reason}`).join('\n')
          }
      } catch (e) {
          // ignora se a tabela não existir
      }

      userContext = `
=== DADOS REAIS DO USUÁRIO OPERACIONAL ===
Cargo/Função: ${user?.role || 'Operador'}
Nome: ${user?.name || 'Não identificado'}

Checklists Pendentes Para Mim Hoje:
${checklistStr}

Itens em Atenção (Minha Área/Geral):
${attentionStr}
`
    }

    // 2. Base de Conhecimento (Static FAQ)
    const { data: faqRows } = await supabase.from('knowledge_faq').select('question, answer')
    const faqContext = faqRows && faqRows.length > 0 
      ? faqRows.map(f => `Pergunta: ${f.question}\nOrientação: ${f.answer}`).join('\n\n')
      : 'Nenhuma base estática carregada.'

    // 3. System Prompt Mestre (conforme regras rígidas)
    const systemPrompt = `
Você é o Copiloto Operacional do NaBrasa Controle.

Seu papel é ajudar colaboradores da operação a executar melhor suas rotinas com clareza, objetividade e segurança.

Regras obrigatórias:
- Responda de forma curta, prática e operacional.
- Nunca invente regra, dado ou procedimento.
- Se a base não for suficiente, diga claramente que não encontrou regra segura e oriente procurar o líder responsável.
- Priorize respostas sobre contagem, checklist, validade, perdas, organização, execução de rotina e dúvidas operacionais.
- Quando houver dados reais do usuário, use esses dados para responder de forma contextual.
- Quando houver fontes internas disponíveis, baseie a resposta nelas.
- Não responda como professor, consultor, guru ou vendedor.
- Não use linguagem técnica demais.
- Não substitua liderança.
- Não tome decisão disciplinar, financeira sensível ou trabalhista.
- A operação é o centro. Você é apoio.

Tom:
- direto
- simples
- humano
- operacional
- sem floreio

Estrutura ideal da resposta:
1. resposta direta
2. passo prático ou orientação
3. alerta ou encaminhamento, se necessário

Se a pergunta for ambígua, tente responder pelo caminho mais útil e seguro para a operação.

=== BASE DE CONHECIMENTO INTERNA MINERADA (MANUAL) ===
${faqContext}

${userContext}
`

    console.log(`[Copilot] ▶ POST recebido`)
    console.log(`[Copilot] GOOGLE_GENERATIVE_AI_API_KEY presente: ${!!process.env.GOOGLE_GENERATIVE_AI_API_KEY}`)

    // 4. Stream com Gemini
    const result = await streamText({
      model: google('gemini-1.5-flash'), // O usuário mencionou gemini flash no resumo
      system: systemPrompt,
      messages,
      temperature: 0.2, // Baixa para forçar objetividade e prevenir alucinações (inventar regras)
    })

    console.log(`[Copilot] ✓ resposta gerada`)
    return result.toUIMessageStreamResponse()

  } catch (error: any) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: error.message || 'Erro inesperado' }, { status: 500 })
  }
}
