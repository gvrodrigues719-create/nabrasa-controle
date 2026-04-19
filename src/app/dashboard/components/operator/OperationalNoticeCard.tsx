'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

import { AlertOctagon, Info, Bell, ChevronRight, X, Cake, Gift, Sparkles, MessageSquare, Send, ThumbsUp, CheckCircle, Eye, Flame } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toggleNoticeReactionAction, addNoticeResponseAction, getNoticeInteractionsAction } from '@/app/actions/communicationAction'


interface Notice {
    id: string
    title: string
    message: string
    type: 'operacional' | 'item_em_falta' | 'promocao' | 'mudanca_de_turno' | 'comunicado_geral'
    priority: 'normal' | 'importante' | 'urgente'
    created_at: string
    users?: { name: string }
    reaction_count?: number
    response_count?: number
    reaction_summary?: Record<string, number>
}


interface Birthday {
    id: string
    name: string
    date: string
    avatarUrl?: string
}

interface Props {
    notices: Notice[]
    birthdays?: Birthday[]
    userId: string
}


export default function OperationalNoticeCard({ notices, birthdays = [], userId }: Props) {

    const [isBirthdayDrawerOpen, setIsBirthdayDrawerOpen] = useState(false)
    const [showAllGeneral, setShowAllGeneral] = useState(false)
    const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)
    const [interactions, setInteractions] = useState<{reactions: any[], responses: any[]}>({ reactions: [], responses: [] })
    const [isLoadingInteractions, setIsLoadingInteractions] = useState(false)
    const [responseText, setResponseText] = useState('')
    const [isSendingResponse, setIsSendingResponse] = useState(false)
    const [longPressNoticeId, setLongPressNoticeId] = useState<string | null>(null)
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
    const router = useRouter()




    if ((!notices || notices.length === 0) && (!birthdays || birthdays.length === 0)) return null

    const handleOpenNotice = async (notice: Notice) => {
        setSelectedNotice(notice)
        setIsLoadingInteractions(true)
        const res = await getNoticeInteractionsAction(notice.id)
        if (res.success && res.data) {
            setInteractions(res.data)
        }

        setIsLoadingInteractions(false)
    }

    const handleToggleReaction = async (emoji: string) => {
        if (!selectedNotice) return
        
        // Optimistic UI could be added here, but let's keep it simple first
        const res = await toggleNoticeReactionAction(selectedNotice.id, emoji)
        if (res.success) {
            // Refresh interactions
            const updated = await getNoticeInteractionsAction(selectedNotice.id)
            if (updated.success && updated.data) setInteractions(updated.data)

        }
    }

    const handlePressStart = (noticeId: string) => {
        const timer = setTimeout(() => {
            setLongPressNoticeId(noticeId)
            // Haptic feedback could be added here if supported
            if (window.navigator?.vibrate) window.navigator.vibrate(50)
        }, 600) // 600ms long press
        setLongPressTimer(timer)
    }

    const handlePressEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer)
            setLongPressTimer(null)
        }
    }

    const handleQuickReaction = async (noticeId: string, emoji: string) => {
        setLongPressNoticeId(null)
        await toggleNoticeReactionAction(noticeId, emoji)
        router.refresh()
    }


    const handleSendResponse = async () => {

        if (!selectedNotice || !responseText || isSendingResponse) return
        
        setIsSendingResponse(true)
        const res = await addNoticeResponseAction(selectedNotice.id, responseText)
        if (res.success) {
            setResponseText('')
            // Refresh interactions
            const updated = await getNoticeInteractionsAction(selectedNotice.id)
            if (updated.success && updated.data) setInteractions(updated.data)

        }
        setIsSendingResponse(false)
    }


    const monthNames = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]
    
    // ────────────── LÓGICA DE ANIVERSARIANTES ──────────────
    const getSortedBirthdays = () => {
        const now = new Date()
        const todayDay = now.getDate()
        const todayMonth = now.getMonth() + 1

        const categorized = birthdays.reduce((acc, b) => {
            const [d, m] = b.date.split('/').map(Number)
            if (d === todayDay && m === todayMonth) {
                acc.today.push(b)
            } else if (m > todayMonth || (m === todayMonth && d > todayDay)) {
                acc.upcoming.push({ ...b, day: d, month: m })
            } else {
                acc.past.push({ ...b, day: d, month: m })
            }
            return acc
        }, { today: [] as Birthday[], upcoming: [] as any[], past: [] as any[] })

        categorized.upcoming.sort((a, b) => (a.month * 100 + a.day) - (b.month * 100 + b.day))
        categorized.past.sort((a, b) => (b.month * 100 + b.day) - (a.month * 100 + a.day))

        return [...categorized.today, ...categorized.upcoming, ...categorized.past]
    }

    const sortedBirthdays = getSortedBirthdays()
    const primaryBirthday = sortedBirthdays[0]

    // ────────────── LÓGICA DE PRIORIZAÇÃO ──────────────
    const urgentNotices = notices.filter(n => n.priority === 'urgente')
    const generalNotices = notices.filter(n => n.priority !== 'urgente')

    const priorityStyles = {
        urgente: { bg: 'bg-[#B13A2B]', text: 'text-white', icon: <AlertOctagon className="w-5 h-5" /> },
        importante: { bg: 'bg-amber-50', text: 'text-amber-900', icon: <Info className="w-5 h-5" /> },
        normal: { bg: 'bg-white', text: 'text-[#1b1c1a]', icon: <Bell className="w-5 h-5" /> }
    }

    // ────────────── RENDERIZAÇÃO: CAMADA 1 - URGENTES ──────────────
    const renderUrgentLayer = () => {
        if (urgentNotices.length === 0) return null

        return (
            <div className="space-y-3">
                {urgentNotices.map(notice => (
                    <div 
                        key={notice.id}
                        onPointerDown={() => handlePressStart(notice.id)}
                        onPointerUp={handlePressEnd}
                        onPointerLeave={handlePressEnd}
                        onClick={() => !longPressNoticeId && handleOpenNotice(notice)}
                        className="relative overflow-hidden rounded-[2rem] border border-[#B13A2B] bg-[#B13A2B] text-white p-5 cursor-pointer active:scale-[0.98] transition-all shadow-lg shadow-red-100"
                    >
                        {/* QUICK REACTION MENU */}
                        {longPressNoticeId === notice.id && renderQuickReactionMenu(notice.id)}

                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                                <AlertOctagon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-white/20 px-2 py-0.5 rounded-md">
                                        Critico • {notice.type.replace('_', ' ')}
                                    </span>
                                    {renderInteractionSummary(notice)}
                                </div>
                                <h4 className="text-sm font-black leading-tight mb-1">{notice.title}</h4>
                                <p className="text-xs opacity-90 line-clamp-2 leading-relaxed">{notice.message}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    // ────────────── RENDERIZAÇÃO: CAMADA 2 - GERAIS (FEEDS/STACK) ──────────────
    const renderGeneralLayer = () => {
        if (generalNotices.length === 0) return null

        // Se não estiver expandido, mostramos apenas o PRIMEIRO + O STACK
        const visibleNotices = showAllGeneral ? generalNotices : [generalNotices[0]]
        const remainingCount = generalNotices.length - 1
        const hasMore = generalNotices.length > 1

        return (
            <div className="space-y-3">
                {urgentNotices.length > 0 && (
                     <p className="text-[9px] font-black text-[#c0b3b1] uppercase tracking-[0.2em] px-1 pt-2">Comunicados Gerais</p>
                )}
                
                <div className="space-y-3">
                    {visibleNotices.map((notice) => {
                        const style = priorityStyles[notice.priority] || priorityStyles.normal
                        return (
                            <div 
                                key={notice.id}
                                onPointerDown={() => handlePressStart(notice.id)}
                                onPointerUp={handlePressEnd}
                                onPointerLeave={handlePressEnd}
                                onClick={() => !longPressNoticeId && handleOpenNotice(notice)}
                                className={`relative overflow-hidden rounded-3xl border border-gray-100 ${style.bg} ${style.text} p-5 cursor-pointer active:scale-[0.98] transition-all shadow-sm`}
                            >
                                {longPressNoticeId === notice.id && renderQuickReactionMenu(notice.id)}
                                
                                <div className="flex gap-4">
                                    <div className="w-11 h-11 rounded-2xl bg-[#F8F7F4] flex items-center justify-center shrink-0">
                                        <div className="text-[#8c716c]">
                                            {style.icon}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[8px] font-black uppercase tracking-widest bg-black/5 px-2 py-0.5 rounded-md">
                                                {notice.priority} • {notice.type.replace('_', ' ')}
                                            </span>
                                            {renderInteractionSummary(notice)}
                                        </div>
                                        <h4 className="text-sm font-black leading-tight mb-1 truncate">{notice.title}</h4>
                                        <p className="text-xs opacity-70 line-clamp-1 leading-snug">{notice.message}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {/* SLIM VISUAL STACK / COUNTER (COMPACTO) */}
                    {hasMore && !showAllGeneral && (
                        <div 
                            onClick={() => setShowAllGeneral(true)}
                            className="group cursor-pointer active:scale-[0.98] transition-all -mt-4 relative z-0"
                        >
                            {/* Visual effect of cards behind */}
                            <div className="mx-6 h-10 bg-white border border-gray-100 border-t-0 rounded-b-[2rem] flex items-center justify-between px-6 shadow-sm group-hover:bg-gray-50 transition-all">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#B13A2B] animate-pulse" />
                                    <span className="text-[9px] font-black text-[#8c716c] uppercase tracking-[0.15em]">
                                        +{remainingCount} outro{remainingCount > 1 ? 's' : ''} aviso{remainingCount > 1 ? 's' : ''} no mural
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[9px] font-black text-[#B13A2B] uppercase">Ver Feed</span>
                                    <ChevronRight className="w-3 h-3 text-[#B13A2B]" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {showAllGeneral && hasMore && (
                    <button 
                        onClick={() => setShowAllGeneral(false)}
                        className="w-full py-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-[#B13A2B] transition-colors flex items-center justify-center gap-2"
                    >
                        Recolher Mural <X className="w-3 h-3" />
                    </button>
                )}
            </div>
        )
    }

    // ────────────── RENDERIZAÇÃO: CAMADA 3 - COMEMORATIVO (ANIVERSÁRIOS) ──────────────
    const renderBirthdayLayer = () => {
        if (!primaryBirthday) return null

        return (
            <div className="pt-2">
                <div 
                    onClick={() => setIsBirthdayDrawerOpen(true)}
                    className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-3 pl-4 flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer"
                >
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {primaryBirthday.avatarUrl ? (
                            <img src={primaryBirthday.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                        ) : (
                            <Cake className="w-5 h-5 text-indigo-300" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[7px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50">Time NaBrasa</span>
                            <span className="text-[7px] font-bold text-[#c0b3b1] uppercase tracking-widest">• Hoje</span>
                        </div>
                        <h4 className="text-[13px] font-black text-[#1b1c1a] truncate">Aniversariante: {primaryBirthday.name}</h4>
                    </div>

                    <div className="flex items-center gap-1.5 pr-2">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                            <Gift className="w-4 h-4 text-gray-300 group-hover:text-indigo-400" />
                        </div>
                        <ChevronRight className="w-3 h-3 text-gray-300" />
                    </div>
                </div>
            </div>
        )
    }

    // HELPERS DE INTERAÇÃO
    const renderQuickReactionMenu = (noticeId: string) => (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-md flex items-center justify-center animate-in fade-in zoom-in duration-200">
            <div className="flex gap-2 p-2 bg-white rounded-3xl shadow-xl border border-gray-100">
                {['👍', '✅', '👀', '🙌', '🔥'].map(emoji => (
                    <button 
                        key={emoji}
                        onClick={(e) => { e.stopPropagation(); handleQuickReaction(noticeId, emoji); }}
                        className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-100 rounded-full transition-colors active:scale-125"
                    >
                        {emoji}
                    </button>
                ))}
                <button onClick={(e) => { e.stopPropagation(); setLongPressNoticeId(null); }} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-full text-xs">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    )

    const renderInteractionSummary = (notice: Notice) => (
        <div className="flex items-center gap-2">
            {notice.reaction_summary && Object.keys(notice.reaction_summary).length > 0 ? (
                <div className="flex items-center -space-x-1">
                    {Object.keys(notice.reaction_summary).slice(0, 2).map(e => <span key={e} className="text-[9px]">{e}</span>)}
                    {notice.reaction_count && notice.reaction_count > 1 && <span className="ml-1 text-[8px] font-black opacity-50">+{notice.reaction_count - 1}</span>}
                </div>
            ) : null}
            {notice.response_count && notice.response_count > 0 && (
                <span className="flex items-center gap-0.5 text-[8px] font-black opacity-40">
                    <MessageSquare className="w-2 h-2" /> {notice.response_count}
                </span>
            )}
        </div>
    )

    return (
        <div className="bg-[#fff7f6] rounded-[2.5rem] p-5 border border-[#f5eded] shadow-sm space-y-5 animate-in fade-in duration-700">
            <header className="flex items-center justify-between px-1 mb-1">
                <h3 className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em] flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5" /> Mural da Unidade
                </h3>
                {notices.length > 0 && (
                    <span className="text-[9px] font-black text-[#B13A2B] bg-red-50 px-2.5 py-1 rounded-lg uppercase tracking-tight">
                        {notices.length + (primaryBirthday ? 1 : 0)} Itens ativos
                    </span>
                )}
            </header>

            <div className="space-y-4">
                {/* CAMADA 1: URGENTES */}
                {renderUrgentLayer()}

                {/* CAMADA 2: GERAIS */}
                {renderGeneralLayer()}

                {/* CAMADA 3: ANIVERSÁRIOS */}
                {renderBirthdayLayer()}
            </div>

            {/* BIRTHDAY FULL LIST DRAWER */}
            {isBirthdayDrawerOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm p-0 animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setIsBirthdayDrawerOpen(false)} />
                    <div className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 max-h-[85vh] flex flex-col">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />
                        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-black text-[#1b1c1a]">Aniversariantes da Semana</h3>
                                <p className="text-[10px] font-bold text-[#8c716c] uppercase">Celebrando nossa equipe nesta semana</p>
                            </div>
                            <button onClick={() => setIsBirthdayDrawerOpen(false)} className="p-3 bg-gray-50 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-10">
                            {sortedBirthdays.map((b) => {
                                const [d, m] = b.date.split('/')
                                const label = monthNames[parseInt(m) - 1]
                                const isToday = parseInt(d) === new Date().getDate() && parseInt(m) === new Date().getMonth() + 1
                                return (
                                    <div key={b.id} className={`p-4 rounded-3xl flex items-center gap-4 border transition-all ${isToday ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                                        <div className="w-12 h-12 rounded-2xl bg-white flex flex-col items-center justify-center shadow-sm border border-gray-100">
                                            <span className="text-[8px] font-extrabold text-[#B13A2B] leading-none mb-0.5">{label}</span>
                                            <span className="text-lg font-black text-[#1b1c1a] leading-none">{d}</span>
                                        </div>
                                        <div className="w-12 h-12 rounded-full bg-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                                            {b.avatarUrl ? <img src={b.avatarUrl} className="w-full h-full object-cover" alt="Avatar" /> : <Cake className="w-5 h-5 text-gray-200" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-black text-[#1b1c1a] truncate">{b.name}</h4>
                                            {isToday && <span className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1"><Sparkles className="w-3 h-3" /> É Hoje! Parabéns!</span>}
                                        </div>
                                        <Gift className={`w-5 h-5 ${isToday ? 'text-indigo-400' : 'text-gray-200'}`} />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* NOTICE DETAIL BOTTOM SHEET */}
            {selectedNotice && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedNotice(null)} />
                    <div className="relative w-full max-w-2xl bg-white rounded-t-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500 max-h-[92vh]">
                        {/* BOTTOM SHEET HANDLE */}
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2 shrink-0 opacity-40" />

                        {/* HEADER */}
                        <header className={`p-8 pt-4 pb-6 ${
                            selectedNotice.priority === 'urgente' ? 'bg-[#fdf0ef] text-[#B13A2B]' : 
                            selectedNotice.priority === 'importante' ? 'bg-amber-50 text-amber-900' : 'bg-white text-[#1b1c1a]'
                        } relative shrink-0 border-b border-black/5`}>
                            <button onClick={() => setSelectedNotice(null)} className="absolute top-6 right-6 p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                            
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                                    selectedNotice.priority === 'urgente' ? 'bg-white/20 text-white' : 'bg-black/5'
                                }`}>
                                   {selectedNotice.priority} • {selectedNotice.type.replace('_', ' ')}
                                </span>
                            </div>
                            <h2 className="text-2xl font-black tracking-tight leading-tight mb-2">{selectedNotice.title}</h2>
                            <div className="flex items-center gap-2 opacity-60 text-[10px] font-bold uppercase tracking-widest">
                                <Bell className="w-3.5 h-3.5" /> Postado em {format(new Date(selectedNotice.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </div>
                        </header>

                        {/* CONTENT */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div>
                                <h3 className="text-[10px] font-black text-[#c0b3b1] uppercase tracking-[0.2em] mb-4">Mensagem Completa</h3>
                                <p className="text-base text-[#1b1c1a] leading-relaxed font-medium">
                                    {selectedNotice.message}
                                </p>
                            </div>

                            {/* REAÇÕES */}
                            <div>
                                <h3 className="text-[10px] font-black text-[#c0b3b1] uppercase tracking-[0.2em] mb-4">Reações Rápidas</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['👍', '✅', '👀', '🙌', '🔥'].map(emoji => {
                                        const count = interactions.reactions.filter(r => r.emoji === emoji).length;
                                        const hasReacted = interactions.reactions.some(r => r.emoji === emoji && r.user_id === userId);
                                        return (

                                            <button 
                                                key={emoji}
                                                onClick={() => handleToggleReaction(emoji)}
                                                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border transition-all ${
                                                    hasReacted ? 'bg-[#B13A2B] border-[#B13A2B] text-white' : 'bg-white border-[#e9e8e5] text-[#1b1c1a] hover:border-[#B13A2B]/30 shadow-sm'
                                                }`}
                                            >
                                                <span className="text-lg">{emoji}</span>
                                                {count > 0 && <span className="text-[11px] font-black">{count}</span>}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* THREAD DE RESPOSTAS */}
                            <div>
                                <h3 className="text-[10px] font-black text-[#c0b3b1] uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                                    <span>Respostas e Retornos</span>
                                    <span className="bg-[#f5f4f1] px-2 py-0.5 rounded-full text-[10px] text-[#8c716c]">{interactions.responses.length}</span>
                                </h3>

                                <div className="space-y-4">
                                    {isLoadingInteractions ? (
                                        [1, 2].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />)
                                    ) : interactions.responses.length === 0 ? (
                                        <div className="p-8 bg-[#f5f4f1] rounded-[2rem] text-center border border-dashed border-[#e9e8e5]">
                                            <MessageSquare className="w-8 h-8 text-[#c0b3b1] mx-auto mb-2" />
                                            <p className="text-xs font-bold text-[#8c716c]">Nenhuma resposta ainda.</p>
                                        </div>
                                    ) : (
                                        interactions.responses.map(res => (
                                            <div key={res.id} className={`p-4 rounded-3xl border ${res.users?.role === 'admin' || res.users?.role === 'manager' ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-[#e9e8e5] shadow-sm'}`}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[11px] font-black text-[#1b1c1a]">{res.users?.name || 'Operador'}</span>
                                                    <span className="text-[9px] font-bold text-[#c0b3b1]">{formatDistanceToNow(new Date(res.created_at), { addSuffix: true, locale: ptBR })}</span>
                                                </div>
                                                <p className="text-sm font-medium text-[#58413e]">{res.message}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* INPUT FOOTER */}
                        <div className="p-6 bg-white border-t border-[#e9e8e5]">
                            <div className="flex gap-2">
                                <input 
                                    value={responseText}
                                    onChange={e => setResponseText(e.target.value)}
                                    placeholder="Escrever uma resposta..."
                                    className="flex-1 h-12 px-4 rounded-2xl bg-[#F8F7F4] border border-[#e9e8e5] text-sm font-black text-[#1b1c1a] placeholder:text-[#8c716c] focus:ring-2 focus:ring-[#B13A2B]/30 outline-none transition-all"
                                    onKeyDown={e => e.key === 'Enter' && handleSendResponse()}
                                />

                                <button 
                                    onClick={handleSendResponse}
                                    disabled={!responseText || isSendingResponse}
                                    className="w-12 h-12 rounded-2xl bg-[#B13A2B] text-white flex items-center justify-center shadow-lg shadow-red-100 hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
                                >
                                    {isSendingResponse ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

    )
}
