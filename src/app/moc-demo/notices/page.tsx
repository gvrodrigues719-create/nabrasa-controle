
'use client'

import React from 'react'
import { useMocDemoStore } from '@/demo/use-moc-demo-store'
import DemoHeader from '../components/DemoHeader'
import DemoBottomNav from '../components/DemoBottomNav'
import { Bell, MessageSquare, ThumbsUp, CheckCircle, Sparkles, User, History } from 'lucide-react'

export default function DemoNoticesPage() {
    const { notices, events, users } = useMocDemoStore()

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'completion': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case 'validation': return <CheckCircle className="w-4 h-4 text-blue-500" />;
            case 'achievement': return <Sparkles className="w-4 h-4 text-amber-500" />;
            case 'notice': return <Bell className="w-4 h-4 text-[#B13A2B]" />;
            default: return <History className="w-4 h-4 text-gray-400" />;
        }
    }

    return (
        <div className="flex flex-col min-h-screen">
            <DemoHeader />
            
            <div className="flex-1 p-6 pb-24 overflow-y-auto space-y-8 animate-in fade-in duration-700">
                {/* Mural Histórico */}
                <section className="space-y-4">
                    <header className="px-1">
                        <h3 className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                            <Bell className="w-4 h-4" /> Mural de Avisos
                        </h3>
                        <p className="text-xs text-[#8c716c] font-medium">Comunicados e alinhamentos da unidade</p>
                    </header>

                    <div className="space-y-3">
                        {notices.map((notice) => {
                            const author = users.find(u => u.id === notice.author_id)
                            return (
                                <div 
                                    key={notice.id}
                                    className={`p-5 rounded-[2rem] border transition-all ${
                                        notice.priority === 'urgente' ? 'bg-[#B13A2B] text-white border-[#B13A2B] shadow-lg shadow-red-100' : 'bg-white text-[#1b1c1a] border-[#eeedea] shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                notice.priority === 'urgente' ? 'bg-white/20' : 'bg-black/5'
                                            }`}>
                                                {notice.type.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <span className={`text-[9px] font-bold ${notice.priority === 'urgente' ? 'opacity-80' : 'text-[#c0b3b1]'}`}>
                                            Hoje
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-black italic leading-tight mb-2 tracking-tight">"{notice.title}"</h4>
                                    <p className={`text-xs leading-relaxed mb-4 ${notice.priority === 'urgente' ? 'opacity-90' : 'text-[#58413e]'}`}>
                                        {notice.message}
                                    </p>
                                    
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                                notice.priority === 'urgente' ? 'bg-white/20' : 'bg-[#F8F7F4]'
                                            }`}>
                                                <User className={`w-3 h-3 ${notice.priority === 'urgente' ? 'text-white' : 'text-gray-400'}`} />
                                            </div>
                                            <span className={`text-[10px] font-bold ${notice.priority === 'urgente' ? 'text-white' : 'text-[#8c716c]'}`}>
                                                {author?.name}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            {notice.reactions.map((r, i) => (
                                                <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${
                                                    notice.priority === 'urgente' ? 'bg-white/20 border-transparent' : 'bg-gray-50 border-gray-100'
                                                }`}>
                                                    <span className="text-[10px]">{r.emoji}</span>
                                                    <span className="text-[10px] font-black">{r.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* Feed de Atividades */}
                <section className="space-y-4">
                    <header className="px-1">
                        <h3 className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                            <History className="w-4 h-4" /> Feed de Atividades
                        </h3>
                        <p className="text-xs text-[#8c716c] font-medium">Acompanhamento das ações em tempo real</p>
                    </header>

                    <div className="space-y-1 relative">
                        <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-[#F8F7F4]" />
                        
                        {events.map((event, i) => {
                            const user = users.find(u => u.id === event.user_id)
                            return (
                                <div key={event.id} className="flex gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-all relative z-10 bg-transparent">
                                    <div className="w-10 h-10 rounded-2xl bg-white border border-[#eeedea] flex items-center justify-center shadow-sm shrink-0">
                                        {getEventIcon(event.type)}
                                    </div>
                                    <div className="flex-1 min-w-0 py-1">
                                        <p className="text-xs font-medium text-[#1b1c1a] leading-tight">
                                            <span className="font-black">{user?.name || 'Sistema'}</span> {event.message.replace(user?.name || '', '').trim()}
                                        </p>
                                        <p className="text-[9px] font-bold text-[#c0b3b1] uppercase tracking-widest mt-1">
                                            {event.time}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            </div>

            <DemoBottomNav />
        </div>
    )
}
