'use client'

import React, { useState, useEffect } from 'react'
import { MessageSquare, X, Send, AlertCircle, Info, HelpCircle, CheckCircle2 } from 'lucide-react'
import { addTaskCommentAction, getTaskCommentsAction } from '@/app/actions/communicationAction'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Comment {
    id: string
    message: string
    type: 'cobranca' | 'orientacao' | 'duvida' | 'justificativa' | 'resposta'
    created_at: string
    users: { name: string, role: string }
}

interface Props {
    isOpen: boolean
    onClose: () => void
    referenceId: string
    referenceType: 'session' | 'routine' | 'task'
    title: string
}

export default function ContextualCommentsDrawer({ isOpen, onClose, referenceId, referenceType, title }: Props) {
    const [comments, setComments] = useState<Comment[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)

    useEffect(() => {
        if (isOpen && referenceId) {
            loadComments()
        }
    }, [isOpen, referenceId])

    async function loadComments() {
        setLoading(true)
        const res = await getTaskCommentsAction(referenceId)
        if (res.success) {
            setComments(res.data || [])
        }
        setLoading(false)
    }

    async function handleSendMessage() {
        if (!newMessage.trim() || sending) return
        
        setSending(true)
        const res = await addTaskCommentAction({
            referenceId,
            referenceType,
            message: newMessage,
            type: 'resposta' // Operador/Dashboard padrão envia como resposta ou duvida
        })

        if (res.success) {
            setNewMessage('')
            loadComments()
        }
        setSending(false)
    }

    if (!isOpen) return null

    const typeIcons = {
        cobranca: <AlertCircle className="w-3.5 h-3.5 text-red-600" />,
        orientacao: <Info className="w-3.5 h-3.5 text-purple-600" />,
        duvida: <HelpCircle className="w-3.5 h-3.5 text-blue-600" />,
        justificativa: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        resposta: <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-[#F8F7F4] rounded-t-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-500 h-[85vh] flex flex-col">
                
                {/* Header */}
                <div className="p-6 bg-white border-b border-[#e9e8e5] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[#8c716c]">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-[#1b1c1a] uppercase tracking-tight">Comentários</h3>
                            <p className="text-[10px] font-bold text-[#c0b3b1] uppercase tracking-widest uppercase">{title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-[#8c716c]" />
                    </button>
                </div>

                {/* Feed */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 opacity-50">
                            <div className="w-6 h-6 border-2 border-[#1b1c1a] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                            <MessageSquare className="w-12 h-12 mb-3" />
                            <p className="text-sm font-bold text-[#1b1c1a]">Sem comentários ainda</p>
                            <p className="text-xs">Use este espaço para dúvidas ou orientações.</p>
                        </div>
                    ) : (
                        comments.map((c) => (
                            <div key={c.id} className={`flex flex-col gap-2`}>
                                <div className={`flex items-start gap-2 max-w-[90%]`}>
                                    <div className="w-8 h-8 rounded-lg bg-white border border-[#e9e8e5] flex items-center justify-center text-[10px] font-black shrink-0">
                                        {c.users.name.charAt(0)}
                                    </div>
                                    <div className={`p-4 rounded-2xl border shadow-sm ${
                                        c.type === 'cobranca' ? 'bg-red-50 border-red-100' :
                                        c.type === 'orientacao' ? 'bg-purple-50 border-purple-100' :
                                        'bg-white border-[#e9e8e5]'
                                    }`}>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[10px] font-black text-[#1b1c1a]">{c.users.name}</span>
                                            <span className="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-gray-100 text-[#8c716c] flex items-center gap-1">
                                                {typeIcons[c.type]}
                                                {c.type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[#58413e] leading-relaxed whitespace-pre-wrap">{c.message}</p>
                                    </div>
                                </div>
                                <span className="text-[9px] font-bold text-[#c0b3b1] px-10">
                                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                {/* Input */}
                <div className="p-5 bg-white border-t border-[#e9e8e5]">
                    <div className="relative flex items-end gap-2">
                        <textarea 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Escreva um comentário ou tire uma dúvida..."
                            className="flex-1 bg-gray-50 border border-[#e9e8e5] rounded-2xl p-4 text-xs font-medium focus:ring-2 focus:ring-[#1b1c1a] outline-none transition-all resize-none max-h-32"
                            rows={2}
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={sending || !newMessage.trim()}
                            className="p-4 bg-[#1b1c1a] text-white rounded-2xl shadow-lg active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
