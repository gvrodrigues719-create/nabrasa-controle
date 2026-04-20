'use client'

import React, { useRef, useEffect, useState } from 'react'
import { X, Send, Sparkles, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

interface Props {
    userName?: string
    isDemoMode?: boolean
}

export default function OperationAIDrawer({ isOpen, onClose, userId, userName, isDemoMode }: Props) {
    const endOfMessagesRef = useRef<HTMLDivElement>(null)
    const [input, setInput] = useState('')
    const [demoMessages, setDemoMessages] = useState<any[]>([])
    const [isDemoTyping, setIsDemoTyping] = useState(false)

    // No SDK 6.x, useChat é mais modular e o transporte é explícito.
    // UIMessage agora usa 'parts' em vez de 'content'.
    const { messages, sendMessage, status } = useChat({
        transport: new DefaultChatTransport({ 
            api: '/api/copilot/chat',
        }),
    })

    const WELCOME_MESSAGE_ID = 'welcome-msg'
    // Mensagem visual de boas-vindas, não entra no useChat para não sujar o histórico do servidor
    const welcomeMessage = { 
        id: WELCOME_MESSAGE_ID, 
        role: 'assistant' as const, 
        parts: [{ type: 'text' as const, text: `Olá${userName ? ' ' + userName : ''}! Sou seu assistente de operação. Como posso te ajudar hoje? Posso tirar dúvidas sobre seu CMV, organização de estoque, validade ou checar suas listas de hoje.` }] 
    }

    // Na renderização, exibimos a boas-vindas + mensagens reais
    const allMessages = isDemoMode 
        ? [welcomeMessage, ...demoMessages]
        : [welcomeMessage, ...messages]

    const isLoading = isDemoMode ? isDemoTyping : (status !== 'ready' && status !== 'error')

    const suggestedQuestions = [
        "O que falta para mim hoje?",
        "Qual a regra de contagem para itens fracionados?",
        "Como organizar a geladeira de bebidas?",
        "Tenho checklist pendente hoje?"
    ]

    useEffect(() => {
        if (isOpen) {
            endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, isOpen])

    const handleFeedback = async (messageId: string, isHelpful: boolean) => {
        if (!userId || messageId === WELCOME_MESSAGE_ID) return
        
        try {
            // Bug C fix: O ID do SDK não é UUID. Salvar no feedback_text como referência.
            await supabase.from('copilot_feedback').insert([{
                user_id: userId,
                is_helpful: isHelpful,
                feedback_text: `sdk_msg_id:${messageId}`
            }])
            toast.success(isHelpful ? "Obrigado pelo feedback!" : "Registrado. Vamos melhorar.")
        } catch (e) {
            console.error('Feedback error:', e)
        }
    }

    const onSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!input.trim() || isLoading) return
        
        const messageText = input.trim()
        setInput('') // Limpa imediatamente para feedback visual e evitar duplo envio

        if (isDemoMode) {
            const userMsg = { id: Date.now().toString(), role: 'user', parts: [{ type: 'text', text: messageText }] }
            setDemoMessages(prev => [...prev, userMsg])
            setIsDemoTyping(true)

            // Mock "Impressive" logic
            setTimeout(() => {
                let response = "Analisando o contexto do turno de hoje, vejo que sua consistência está excelente (92%). Continue assim para garantir o bônus de performance!"
                
                const lower = messageText.toLowerCase()
                if (lower.includes('falta') || lower.includes('pendente')) {
                    response = "Você tem 2 contagens pendentes na Cozinha e o Checklist de Abertura ainda não foi finalizado. Recomendo priorizar as proteínas para evitar divergências no CMv do almoço."
                } else if (lower.includes('cmv') || lower.includes('meta')) {
                    response = "Seu CMV atual está em 32.2%, ligeiramente acima da meta de 30%. O desvio principal está no grupo de 'Carnes Nobres'. Verifique se houve registro de quebras no último turno."
                } else if (lower.includes('organizar') || lower.includes('estoque')) {
                    response = "Para organizar o estoque seco, use a regra PEPS. Itens pesados devem ficar nas prateleiras inferiores e as etiquetas de validade sempre voltadas para frente."
                }

                const botMsg = { id: (Date.now() + 1).toString(), role: 'assistant', parts: [{ type: 'text', text: response }] }
                setDemoMessages(prev => [...prev, botMsg])
                setIsDemoTyping(false)
            }, 1500)
            return
        }

        try {
            sendMessage({ 
                text: messageText 
            }, {
                body: { userId }
            })
        } catch (error) {
            console.error('Failed to send message:', error)
            toast.error("Erro ao enviar mensagem.")
        }
    }

    const handleSuggestedClick = (q: string) => {
        if (isLoading) return
        if (isDemoMode) {
            setInput(q)
            // We can't call onSubmit directly because it expects an event or undefined
            // So we handle it inside handleSuggestedClick
            const messageText = q
            const userMsg = { id: Date.now().toString(), role: 'user', parts: [{ type: 'text', text: messageText }] }
            setDemoMessages(prev => [...prev, userMsg])
            setIsDemoTyping(true)
            setInput('')
            
            setTimeout(() => {
                let response = "Analisando seus dados operacionais no NaBrasa..."
                if (q.includes('falta')) response = "Você tem 2 contagens pendentes na Cozinha e o Checklist de Abertura ainda não foi finalizado."
                if (q.includes('fracionados')) response = "Itens fracionados devem ser contados por peso real ou estimativa visual em décimos (0.1 a 0.9). Nunca arredonde para cima se o balde estiver vazio."
                if (q.includes('geladeira')) response = "Organize por tipo de bebida e data de validade. As mais próximas do vencimento devem ficar na frente (FIFO)."
                
                const botMsg = { id: (Date.now() + 1).toString(), role: 'assistant', parts: [{ type: 'text', text: response }] }
                setDemoMessages(prev => [...prev, botMsg])
                setIsDemoTyping(false)
            }, 1200)
            return
        }
        try {
            sendMessage({ text: q }, { body: { userId } })
        } catch (error) {
            console.error('Failed to send suggested message:', error)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white w-full max-h-[85vh] h-[85vh] rounded-t-[40px] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-[#eeedea]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#1b1c1a] rounded-2xl flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-[#1b1c1a] tracking-tight">Ajuda da Operação</h2>
                            <span className="text-[10px] font-bold text-[#8c716c] uppercase tracking-widest">Co-piloto Operacional</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[#F8F7F4] rounded-full transition-colors">
                        <X className="w-6 h-6 text-[#1b1c1a]" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {allMessages.map((msg, i) => {
                        const isAssistant = msg.role === 'assistant'
                        const isWelcome = msg.id === WELCOME_MESSAGE_ID

                        // No SDK 6, iteramos pelas partes da mensagem
                        const messageText = msg.parts
                            .filter(part => part.type === 'text')
                            .map(part => (part as any).text)
                            .join('')

                        return (
                            <div key={msg.id || i} className={`flex ${!isAssistant ? 'justify-end' : 'justify-start'}`}>
                                <div className="flex flex-col gap-1 max-w-[85%]">
                                    <div className={`p-4 rounded-2xl text-sm ${
                                        !isAssistant 
                                        ? 'bg-[#1b1c1a] text-white rounded-tr-none' 
                                        : 'bg-[#F8F7F4] text-[#1b1c1a] border border-[#eeedea] rounded-tl-none whitespace-pre-wrap'
                                    }`}>
                                        {messageText}
                                    </div>
                                    
                                    {/* Feedback de resposta (só pro assistente e se não for a do topo) */}
                                    {isAssistant && !isWelcome && !isLoading && (
                                        <div className="flex items-center gap-2 pl-2 mt-1">
                                            <span className="text-[10px] font-bold text-[#c0b3b1] uppercase tracking-wider">Ajudou?</span>
                                            <button onClick={() => handleFeedback(msg.id!, true)} className="hover:text-amber-600 text-[#c0b3b1] transition-colors"><ThumbsUp className="w-3 h-3" /></button>
                                            <button onClick={() => handleFeedback(msg.id!, false)} className="hover:text-red-600 text-[#c0b3b1] transition-colors"><ThumbsDown className="w-3 h-3" /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-[#F8F7F4] p-4 rounded-2xl rounded-tl-none border border-[#eeedea] text-[#c0b3b1] flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-[#8c716c]" /> 
                                <span className="text-sm font-medium">Buscando contexto...</span>
                            </div>
                        </div>
                    )}

                    {messages.length === 0 && (
                        <div className="space-y-3 pt-4">
                            <p className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest px-1">Sugestões vivas</p>
                            <div className="flex flex-wrap gap-2">
                                {suggestedQuestions.map((q, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => handleSuggestedClick(q)}
                                        className="text-xs font-bold text-[#58413e] bg-white border border-[#e9e8e5] px-4 py-2 rounded-xl hover:border-[#1b1c1a] transition-all cursor-pointer"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div ref={endOfMessagesRef} />
                </div>

                {/* Input */}
                <div className="p-6 bg-[#F8F7F4] border-t border-[#eeedea]">
                    <form onSubmit={onSubmit} className="relative">
                        <input 
                            type="text" 
                            name="prompt"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                            placeholder="Tire sua dúvida operacional..."
                            className="w-full bg-white border border-[#e9e8e5] rounded-2xl py-4 px-6 pr-14 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1b1c1a]/5 transition-all disabled:opacity-50"
                        />
                        <button 
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#1b1c1a] text-white rounded-xl flex items-center justify-center hover:bg-black transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            <Send className="w-4 h-4 cursor-pointer" />
                        </button>
                    </form>
                    <p className="text-[9px] text-center text-[#c0b3b1] mt-4 uppercase tracking-[0.2em] font-medium">
                        O Copiloto acessa seus checklists e manuais do NaBrasa
                    </p>
                </div>
            </div>
        </div>
    )
}
