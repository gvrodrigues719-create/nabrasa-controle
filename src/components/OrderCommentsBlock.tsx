'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { getOrderCommentsAction, addOrderCommentAction } from '@/modules/purchases/actions'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface OrderCommentsBlockProps {
    orderId: string
}

export function OrderCommentsBlock({ orderId }: OrderCommentsBlockProps) {
    const [comments, setComments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)
    const listRef = useRef<HTMLDivElement>(null)

    const fetchComments = useCallback(async () => {
        const res = await getOrderCommentsAction(orderId)
        if (res.success && res.data) {
            setComments(res.data)
        }
        setLoading(false)
    }, [orderId])

    useEffect(() => {
        fetchComments()
    }, [fetchComments])

    useEffect(() => {
        // Scroll to bottom when new comments are loaded
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight
        }
    }, [comments])

    const handleSend = async () => {
        if (!message.trim()) return
        
        setSending(true)
        const res = await addOrderCommentAction(orderId, message)
        if (res.success) {
            setMessage('')
            await fetchComments()
        } else {
            toast.error(res.error || 'Erro ao enviar comentário')
        }
        setSending(false)
    }

    if (loading) {
        return (
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm animate-pulse flex flex-col items-center justify-center py-10">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <div className="h-3 w-32 bg-gray-200 rounded-full" />
            </div>
        )
    }

    return (
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-gray-900 leading-none">Comentários do Pedido</h2>
                    <p className="text-[10px] text-gray-500 mt-0.5">Histórico de comunicação</p>
                </div>
            </div>

            <div 
                ref={listRef}
                className="space-y-4 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200"
            >
                {comments.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs italic">
                        Nenhum comentário ainda.
                    </div>
                ) : (
                    comments.map(c => {
                        const isKitchen = c.user_role === 'kitchen' || c.user_role === 'admin'
                        return (
                            <div key={c.id} className={`flex flex-col ${isKitchen ? 'items-start' : 'items-end'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-3 ${isKitchen ? 'bg-indigo-50 text-indigo-900 rounded-tl-sm' : 'bg-gray-100 text-gray-900 rounded-tr-sm'}`}>
                                    <p className="text-sm font-medium">{c.message}</p>
                                </div>
                                <div className={`flex items-center gap-1 mt-1 text-[9px] font-black uppercase tracking-widest text-gray-400 ${isKitchen ? 'pl-1' : 'pr-1'}`}>
                                    <span>{c.user_name}</span>
                                    <span>·</span>
                                    <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}</span>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-50">
                <input
                    type="text"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Escrever comentário..."
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    onKeyDown={e => {
                        if (e.key === 'Enter') handleSend()
                    }}
                />
                <button
                    onClick={handleSend}
                    disabled={sending || !message.trim()}
                    className="w-12 h-12 shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm shadow-indigo-200"
                >
                    {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                </button>
            </div>
        </div>
    )
}
