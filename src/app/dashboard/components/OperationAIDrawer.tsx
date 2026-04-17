'use client'

import React, { useState } from 'react'
import { X, Send, Sparkles, MessageSquare, Info, History } from 'lucide-react'

interface Props {
    isOpen: boolean
    onClose: () => void
}

export default function OperationAIDrawer({ isOpen, onClose }: Props) {
    const [query, setQuery] = useState('')
    const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
        { role: 'assistant', content: 'Olá! Sou seu assistente de operação. Como posso te ajudar hoje? Posso tirar dúvidas sobre CMV, organização de estoque, validade ou contagem.' }
    ])

    const suggestedQuestions = [
        "Como organizar a geladeira de bebidas?",
        "O que fazer se um item está próximo da validade?",
        "Como o registro de perda ajuda no CMV?",
        "Qual a regra de contagem para itens fracionados?"
    ]

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        const userMsg = query
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setQuery('')

        // Simulação de resposta prática e curta
        setTimeout(() => {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'Entendi. Na operação NaBrasa, seguimos o padrão de segurança alimentar e eficiência. Para essa dúvida específica, recomendo verificar o manual na sessão de "Padrões Operacionais" ou perguntar ao gerente sobre o fluxo de descarte.' 
            }])
        }, 800)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white w-full max-h-[85vh] rounded-t-[40px] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
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
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                                msg.role === 'user' 
                                ? 'bg-[#1b1c1a] text-white rounded-tr-none' 
                                : 'bg-[#F8F7F4] text-[#1b1c1a] border border-[#eeedea] rounded-tl-none'
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {messages.length === 1 && (
                        <div className="space-y-3 pt-4">
                            <p className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest px-1">Sugestões</p>
                            <div className="flex flex-wrap gap-2">
                                {suggestedQuestions.map((q, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => setQuery(q)}
                                        className="text-xs font-bold text-[#58413e] bg-white border border-[#e9e8e5] px-4 py-2 rounded-xl hover:border-[#1b1c1a] transition-all"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-6 bg-[#F8F7F4] border-t border-[#eeedea]">
                    <form onSubmit={handleSubmit} className="relative">
                        <input 
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Tire sua dúvida operacional..."
                            className="w-full bg-white border border-[#e9e8e5] rounded-2xl py-4 px-6 pr-14 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1b1c1a]/5 transition-all"
                        />
                        <button 
                            type="submit"
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#1b1c1a] text-white rounded-xl flex items-center justify-center hover:bg-black transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                    <p className="text-[9px] text-center text-[#c0b3b1] mt-4 uppercase tracking-[0.2em] font-medium">
                        Respostas baseadas nos manuais técnicos NaBrasa
                    </p>
                </div>
            </div>
        </div>
    )
}
