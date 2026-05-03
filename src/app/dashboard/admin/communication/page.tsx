'use client'

import { useState, useEffect } from 'react'
import { getActiveNoticesAction, createNoticeAction, deleteNoticeAction } from '@/app/actions/communicationAction'
import { Bell, Plus, Trash2, Calendar, AlertTriangle, Info, Clock, CheckCircle2, ThumbsUp, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AdminCommunicationPage() {
    const [notices, setNotices] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })

    // Form states
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [type, setType] = useState('operacional')
    const [priority, setPriority] = useState('normal')
    const [validUntil, setValidUntil] = useState('')

    useEffect(() => {
        loadNotices()
    }, [])

    async function loadNotices() {
        setIsLoading(true)
        const res = await getActiveNoticesAction()
        if (res.success) setNotices(res.data || [])
        setIsLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!title || !content) return

        setIsSubmitting(true)
        const res = await createNoticeAction({
            title,
            message: content,
            type: type as any,
            priority: priority as any,
            validUntil: validUntil || null
        })

        if (res.success) {
            setMessage({ type: 'success', text: 'Comunicado postado com sucesso!' })
            setTitle('')
            setContent('')
            setValidUntil('')
            loadNotices()
        } else {
            setMessage({ type: 'error', text: res.error || 'Erro ao postar comunicado' })
        }
        setIsSubmitting(false)
    }

    async function handleDelete(id: string) {
        if (!confirm('Deseja realmente remover este comunicado?')) return
        const res = await deleteNoticeAction(id)
        if (res.success) loadNotices()
    }

    return (
        <div className="p-4 max-w-4xl mx-auto pb-20">
            <header className="mb-8">
                <h1 className="text-2xl font-black text-[#1b1c1a] flex items-center gap-3 tracking-tight">
                    <Bell className="w-6 h-6 text-[#B13A2B]" />
                    Mural & Comunicados
                </h1>
                <p className="text-sm text-[#8c716c] font-medium mt-1">Gerencie os avisos que aparecem na Home dos Operadores.</p>
            </header>

            {message.text && (
                <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* FORMULÁRIO */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] border border-[#e9e8e5] p-6 shadow-sm">
                        <h2 className="text-sm font-black text-[#1b1c1a] uppercase tracking-widest mb-6 flex items-center gap-2">
                           <Plus className="w-4 h-4 text-[#B13A2B]" /> Novo Comunicado
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-[#58413e] uppercase tracking-widest mb-1.5 ml-1">Título do Aviso</label>
                                <input 
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Ex: Falta de Alface Americana"
                                    className="w-full h-12 px-4 rounded-2xl bg-[#F8F7F4] border-none text-sm font-bold text-[#1b1c1a] placeholder:text-[#a39491] focus:ring-2 focus:ring-[#B13A2B]/30 outline-none transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-[#58413e] uppercase tracking-widest mb-1.5 ml-1">Mensagem</label>
                                <textarea 
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="Descreva o que os operadores precisam saber..."
                                    className="w-full p-4 rounded-2xl bg-[#F8F7F4] border-none text-sm font-medium text-[#1b1c1a] placeholder:text-[#a39491] focus:ring-2 focus:ring-[#B13A2B]/30 outline-none transition-all min-h-[100px]"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-[#58413e] uppercase tracking-widest mb-1.5 ml-1">Tipo</label>
                                    <select 
                                        value={type}
                                        onChange={e => setType(e.target.value)}
                                        className="w-full h-12 px-4 rounded-2xl bg-[#F8F7F4] border-none text-sm font-bold text-[#1b1c1a] focus:ring-2 focus:ring-[#B13A2B]/30 outline-none"
                                    >
                                        <option value="operacional">Operacional</option>
                                        <option value="item_em_falta">Item em Falta</option>
                                        <option value="promocao">Promoção</option>
                                        <option value="comunicado_geral">Geral</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[#58413e] uppercase tracking-widest mb-1.5 ml-1">Prioridade</label>
                                    <select 
                                        value={priority}
                                        onChange={e => setPriority(e.target.value)}
                                        className="w-full h-12 px-4 rounded-2xl bg-[#F8F7F4] border-none text-sm font-bold text-[#1b1c1a] focus:ring-2 focus:ring-[#B13A2B]/30 outline-none"
                                    >
                                        <option value="normal">⚪ Normal</option>
                                        <option value="importante">🟡 Importante</option>
                                        <option value="urgente">🔴 Urgente</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-[#58413e] uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Exibir até (Opcional)
                                </label>
                                <input 
                                    type="date"
                                    value={validUntil}
                                    onChange={e => setValidUntil(e.target.value)}
                                    className="w-full h-12 px-4 rounded-2xl bg-[#F8F7F4] border-none text-sm font-bold text-[#1b1c1a] focus:ring-2 focus:ring-[#B13A2B]/30 outline-none"
                                />
                            </div>


                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-14 rounded-2xl bg-[#B13A2B] text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-red-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? 'Postando...' : 'Postar no Mural'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* LISTA DE COMUNICADOS ATIVOS */}
                <div>
                    <h2 className="text-sm font-black text-[#8c716c] uppercase tracking-widest mb-6 px-1 flex items-center justify-between">
                        <span>Avisos Ativos</span>
                        <span className="bg-[#e9e8e5] px-2 py-0.5 rounded-full text-[10px] text-[#58413e]">{notices.length}</span>
                    </h2>

                    {isLoading ? (
                        <div className="space-y-4 animate-pulse">
                            {[1, 2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-[2rem]" />)}
                        </div>
                    ) : notices.length === 0 ? (
                        <div className="bg-[#F8F7F4] rounded-[2rem] p-10 flex flex-col items-center justify-center text-center opacity-40">
                            <Clock className="w-10 h-10 mb-4" />
                            <p className="text-sm font-bold">Nenhum recado ativo no momento.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {notices.map(notice => (
                                <div key={notice.id} className={`group relative p-5 bg-white rounded-[2rem] border border-[#e9e8e5] shadow-sm hover:border-[#B13A2B]/30 transition-all`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                                                notice.priority === 'urgente' ? 'bg-red-50 text-red-600' : 
                                                notice.priority === 'importante' ? 'bg-amber-50 text-amber-600' : 'bg-[#F8F7F4] text-[#8c716c]'
                                            }`}>
                                                {notice.priority}
                                            </span>
                                            <span className="text-[10px] font-bold text-[#c0b3b1]">
                                                {format(new Date(notice.created_at), "dd 'de' MMM", { locale: ptBR })}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => handleDelete(notice.id)}
                                            className="p-2 opacity-0 group-hover:opacity-100 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <h4 className="text-sm font-black text-[#1b1c1a] mb-1">{notice.title}</h4>
                                    <p className="text-xs text-[#58413e] leading-relaxed line-clamp-3 mb-3">{notice.message}</p>
                                    
                                    <div className="flex items-center gap-4">
                                        {notice.valid_until && (
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#c0b3b1] uppercase">
                                                <Clock className="w-3 h-3" /> Expira em: {format(new Date(notice.valid_until), "dd/MM")}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 ml-auto">
                                            {notice.reaction_count > 0 && (
                                                <span className="flex items-center gap-1 text-[10px] font-black text-[#B13A2B]">
                                                    <ThumbsUp className="w-3 h-3" /> {notice.reaction_count}
                                                </span>
                                            )}
                                            {notice.response_count > 0 && (
                                                <span className="flex items-center gap-1 text-[10px] font-black text-[#8c716c]">
                                                    <MessageSquare className="w-3 h-3" /> {notice.response_count}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
