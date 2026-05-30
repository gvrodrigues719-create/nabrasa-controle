'use client'

import React from 'react'
import { X, Ticket, Trophy, Target, History, Star, ArrowRight } from 'lucide-react'

interface Props {
    isOpen: boolean
    onClose: () => void
    ticketCount: number
}

export default function RaffleDrawer({ isOpen, onClose, ticketCount }: Props) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            <div className="relative w-full max-w-xl bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                {/* Header Gradient */}
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
                
                <div className="flex items-center justify-between px-8 pt-8 pb-4 relative z-10">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            Sorteio do Mês <SparkleIcon />
                        </h2>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Incentivo por Mérito</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 pb-12 space-y-8 overflow-y-auto max-h-[85vh]">
                    
                    {/* Your Tickets & Prize Hero */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-600 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden group">
                            <Ticket className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Suas Chances</p>
                            <h3 className="text-4xl font-black mt-1">{ticketCount}</h3>
                            <p className="text-[11px] font-bold mt-2 bg-white/20 px-2 py-0.5 rounded-md inline-block">Tickets Acumulados</p>
                        </div>

                        <div className="bg-gray-900 rounded-[2rem] p-6 text-white shadow-xl shadow-black/10 relative overflow-hidden group">
                            <Star className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#B13A2B]">Prêmio do Mês</p>
                            <h3 className="text-lg font-black mt-2 leading-tight">Jantar Especial (Gift Card R$ 250)</h3>
                            <button className="mt-4 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 group/btn">
                                Ver Detalhes <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* How to Earn */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Como ganhar tickets</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <MeritItem label="Checklist no prazo" value="+2 tickets" icon={<History className="w-4 h-4" />} />
                            <MeritItem label="Sessão de contagem limpa" value="+1 ticket" icon={<PackageIcon />} />
                            <MeritItem label="Perda registrada com foto" value="+1 ticket" icon={<CameraIcon />} />
                            <MeritItem label="Missão da Semana concluída" value="+3 tickets" icon={<Star className="w-4 h-4 text-amber-500" />} />
                        </div>
                    </section>

                    {/* Past Winners (Mocked) */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Últimos Ganhadores</h4>
                        </div>
                        <div className="space-y-3">
                            <WinnerItem name="Dalva Silva" date="Março 2026" prize="Vale-Cinema VIP" />
                            <WinnerItem name="Vinicius Rosa" date="Fevereiro 2026" prize="Folga Premiada" />
                        </div>
                    </section>

                    {/* Disclaimer */}
                    <p className="text-[10px] text-gray-400 leading-relaxed text-center px-6">
                        Este sorteio é uma iniciativa interna de reconhecimento profissional. Os tickets são individuais e intransferíveis, conquistados exclusivamente através do mérito operacional e cumprimento dos processos da casa.
                    </p>
                </div>
            </div>
        </div>
    )
}

function MeritItem({ label, value, icon }: { label: string, value: string, icon: any }) {
    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    {icon}
                </div>
                <span className="text-xs font-bold text-gray-700">{label}</span>
            </div>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                {value}
            </span>
        </div>
    )
}

function WinnerItem({ name, date, prize }: { name: string, date: string, prize: string }) {
    return (
        <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`} alt={name} />
            </div>
            <div className="flex-1">
                <h5 className="text-xs font-black text-gray-900 leading-none">{name}</h5>
                <p className="text-[10px] font-bold text-gray-400 mt-1">{prize}</p>
            </div>
            <span className="text-[9px] font-black text-gray-300 uppercase tracking-tight">{date}</span>
        </div>
    )
}

function SparkleIcon() {
    return (
        <svg className="w-5 h-5 text-amber-500 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l2.4 7.6 7.6 2.4-7.6 2.4-2.4 7.6-2.4-7.6-7.6-2.4 7.6-2.4L12 2z" />
        </svg>
    )
}

function PackageIcon() {
    return <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
}

function CameraIcon() {
    return <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}
