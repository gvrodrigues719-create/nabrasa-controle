'use client'

import React, { useState } from 'react'
import { X, Gift, AlertCircle, CheckCircle2, Ticket, Utensils, Coins, CalendarDays, Key, HeartHandshake } from 'lucide-react'

interface Props {
    isOpen: boolean
    onClose: () => void
    initialBalance?: number
}

// Catálogo fixo da Demo
const INITIAL_CATALOG = [
    { id: 'c1', title: 'Mimo especial', price: 40, icon: HeartHandshake },
    { id: 'c2', title: 'Almoço na casa', price: 60, icon: Utensils },
    { id: 'c3', title: 'Ingresso de cinema', price: 80, icon: Ticket },
    { id: 'c4', title: 'Ticket Benefício Exclusivo', price: 90, icon: Key },
    { id: 'c5', title: 'PIX Simbólico', price: 100, icon: Coins },
    { id: 'c6', title: 'Folga parcial agendada', price: 150, icon: CalendarDays },
]

export default function RewardsDrawer({ isOpen, onClose, initialBalance = 120 }: Props) {
    const [balance, setBalance] = useState(initialBalance)
    const [history, setHistory] = useState<{title: string, state: string, time: string}[]>([])
    
    // Modal state
    const [confirmingItem, setConfirmingItem] = useState<typeof INITIAL_CATALOG[0] | null>(null)

    // Sync resets on close if needed, but keeping state is fine for the demo so user can re-open to check
    
    if (!isOpen) return null

    const handleConfirm = () => {
        if (!confirmingItem) return
        
        // Efetua a compra mockada
        setBalance(prev => prev - confirmingItem.price)
        setHistory(prev => [
            { title: confirmingItem.title, state: 'solicitado', time: 'Agora' },
            ...prev
        ])
        setConfirmingItem(null)
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Overlay Escuro */}
            <div 
                className="absolute inset-0 bg-[#1b1c1a]/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Container do Drawer */}
            <div className="relative w-full md:w-[480px] h-full bg-[#fcfcfc] shadow-2xl flex flex-col md:rounded-l-[40px] overflow-hidden animate-slide-in-right">
                
                {/* ── HEADER ADESIVO ── */}
                <div className="bg-[#1b1c1a] text-white px-8 pt-10 pb-8 flex flex-col relative shrink-0">
                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <Gift className="w-5 h-5 text-amber-400" />
                        <h2 className="text-[14px] font-black uppercase tracking-[0.2em] text-white">Recompensas</h2>
                    </div>
                    <p className="text-sm font-medium text-white/50 mb-6">
                        Troque seus créditos conquistados na operação por benefícios reais.
                    </p>

                    {/* SALDO CARD DENTRO DO HEADER */}
                    <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full transform translate-x-1/2 -translate-y-1/2" />
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1b1c1a]/60">Saldo de Créditos</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-5xl font-black text-[#1b1c1a] tracking-tighter" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                                {balance}
                            </span>
                            <span className="text-xl font-black text-[#1b1c1a]/50">CR</span>
                        </div>
                    </div>
                </div>

                {/* ── CONTEÚDO (SCROLL) ── */}
                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10">
                    
                    {/* CATÁLOGO */}
                    <div>
                        <h3 className="text-[12px] font-black uppercase tracking-widest text-[#8c716c] mb-4">
                            Catálogo Disponível
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            {INITIAL_CATALOG.map(item => {
                                const isBought = history.some(h => h.title === item.title)
                                const canAfford = balance >= item.price
                                const status = isBought ? 'solicitado' : canAfford ? 'disponível' : 'bloqueado'

                                const Icon = item.icon

                                return (
                                    <div 
                                        key={item.id}
                                        onClick={() => {
                                            if (status === 'disponível') setConfirmingItem(item)
                                        }}
                                        className={`
                                            flex items-center gap-4 p-4 rounded-2xl border transition-all
                                            ${status === 'disponível' ? 'bg-white border-[#e9e8e5] shadow-sm hover:border-amber-400 hover:shadow-md cursor-pointer' : ''}
                                            ${status === 'bloqueado' ? 'bg-[#fcfbf9] border-[#f0efeb] opacity-60 grayscale-[0.5]' : ''}
                                            ${status === 'solicitado' ? 'bg-emerald-50 border-emerald-100 opacity-80' : ''}
                                        `}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${status === 'solicitado' ? 'bg-emerald-200' : 'bg-[#f5f4f1]'}`}>
                                            {status === 'solicitado' ? (
                                                <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                                            ) : (
                                                <Icon className="w-6 h-6 text-[#1b1c1a]" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-[#1b1c1a] truncate">{item.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[13px] font-black text-[#8c716c]">{item.price} CR</span>
                                                <span className="text-[10px] uppercase font-bold tracking-widest text-[#c0b3b1]">
                                                    {status === 'solicitado' ? 'Já Solicitado' : status === 'bloqueado' ? 'Falta Saldo' : 'Liberado'}
                                                </span>
                                            </div>
                                        </div>

                                        {status === 'disponível' && (
                                            <div className="w-8 h-8 rounded-full bg-[#1b1c1a] flex items-center justify-center shadow hover:scale-110 transition-transform">
                                                <Gift className="w-4 h-4 text-amber-400" />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* HISTÓRICO */}
                    {(history.length > 0 || initialBalance > 0) && (
                        <div>
                            <h3 className="text-[12px] font-black uppercase tracking-widest text-[#8c716c] mb-4">
                                Últimos Resgates
                            </h3>
                            <div className="space-y-4">
                                {history.map((h, i) => (
                                    <div key={i} className="flex items-center justify-between border-b border-[#e9e8e5] pb-4 last:border-0">
                                        <div>
                                            <p className="text-sm font-bold text-[#1b1c1a]">{h.title}</p>
                                            <p className="text-[11px] font-medium text-[#c0b3b1]">{h.time}</p>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-amber-100 text-amber-800 rounded-lg">
                                            {h.state}
                                        </span>
                                    </div>
                                ))}

                                {history.length === 0 && (
                                    <div className="flex items-center justify-between border-b border-[#e9e8e5] pb-4">
                                        <div>
                                            <p className="text-sm font-bold text-[#1b1c1a]">Bebida Cortesia Sexta</p>
                                            <p className="text-[11px] font-medium text-[#c0b3b1]">2 semanas atrás</p>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
                                            Entregue
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── MODAL DE CONFIRMAÇÃO INLINE ── */}
                {confirmingItem && (
                    <div className="absolute inset-0 bg-[#fcfcfc] z-20 flex flex-col">
                        <div className="flex-1 px-8 py-12 flex flex-col justify-center">
                            <div className="w-16 h-16 rounded-3xl bg-amber-100 flex items-center justify-center mb-6">
                                <AlertCircle className="w-8 h-8 text-amber-600" />
                            </div>
                            
                            <h2 className="text-2xl font-black text-[#1b1c1a] mb-2 leading-tight">
                                Confirmar Resgate
                            </h2>
                            <p className="text-base text-[#58413e] mb-8">
                                Você está prestes a usar seus créditos. Após confirmar, a gerência será notificada.
                            </p>

                            <div className="bg-white border text-center border-[#e9e8e5] rounded-[24px] p-6 mb-8 shadow-sm">
                                <p className="text-sm font-bold text-[#8c716c] mb-1">{confirmingItem.title}</p>
                                <p className="text-4xl font-black text-[#1b1c1a] tracking-tighter" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                                    -{confirmingItem.price} <span className="text-lg opacity-50">CR</span>
                                </p>
                            </div>

                            <div className="flex justify-between items-center px-4 mb-4 text-sm font-bold">
                                <span className="text-[#8c716c]">Saldo de Créditos:</span>
                                <span className="text-[#1b1c1a]">{balance} CR</span>
                            </div>
                            <div className="flex justify-between items-center px-4 text-sm font-bold">
                                <span className="text-[#8c716c]">Saldo Final:</span>
                                <span className="text-emerald-600">{balance - confirmingItem.price} CR</span>
                            </div>
                        </div>

                        <div className="p-6 bg-white border-t border-[#e9e8e5] flex gap-3">
                            <button 
                                onClick={() => setConfirmingItem(null)}
                                className="flex-1 py-4 font-bold text-[#1b1c1a] bg-[#f5f4f1] rounded-2xl hover:bg-[#e9e8e5] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleConfirm}
                                className="flex-1 py-4 font-black text-[#1b1c1a] bg-amber-400 rounded-2xl hover:bg-amber-500 shadow-lg shadow-amber-400/30 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Confirmar
                            </button>
                        </div>
                    </div>
                )}
                
            </div>
            <style jsx>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
        </div>
    )
}
