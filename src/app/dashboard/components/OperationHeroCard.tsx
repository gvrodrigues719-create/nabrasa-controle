'use client'

import React, { useState } from 'react'
import { Activity, Package, Eye, Target, AlertCircle, CheckCircle2, Edit2, Check, X, Loader2 } from 'lucide-react'
import { Leak } from '@/app/actions/efficiencyAction'
import type { WeeklyFocus } from '@/app/actions/weeklyFocusAction'

interface Props {
    score: number
    activeLeaks: Leak[]
    weeklyLeaks: Leak[]
    cmvCurrent?: number
    cmvTarget?: number
    cmvStatus?: 'good' | 'warning' | 'critical'
    focus?: WeeklyFocus | null
    userRole?: string | null
    onViewGlobalClick?: () => void
    onUpdateFocus?: (newTitle: string) => Promise<void>
}

export default function OperationHeroCard({
    score,
    activeLeaks,
    weeklyLeaks,
    cmvCurrent,
    cmvTarget,
    cmvStatus = 'good',
    focus,
    userRole,
    onViewGlobalClick,
    onUpdateFocus,
}: Props) {

    // ═══ FOCO DA SEMANA (edit state) ═══
    const [isEditing, setIsEditing] = useState(false)
    const [draft, setDraft] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const canEdit = userRole === 'admin' || userRole === 'manager'

    const handleEdit = () => { setDraft(focus?.title || ''); setIsEditing(true) }
    const handleCancel = () => { setIsEditing(false); setDraft('') }
    const handleSave = async () => {
        if (!draft.trim() || !onUpdateFocus) return
        setIsSaving(true)
        try { await onUpdateFocus(draft.trim()); setIsEditing(false) }
        finally { setIsSaving(false) }
    }

    // ═══ MODO RESERVATÓRIO ═══
    const getLevelGradient = () => {
        return 'from-blue-700 via-blue-500 to-blue-400'
    }
    const dropColor = 'rgba(30,60,100,0.72)'

    const getStatusInfo = () => {
        if (score === 100) return { label: 'Operação Saudável', color: 'text-emerald-700', dot: 'bg-emerald-500', pulse: false, msg: 'Tudo certo. Foco em manter o ritmo.' }
        if (score >= 80) return { label: 'Atenção Necessária', color: 'text-amber-700', dot: 'bg-amber-500', pulse: true, msg: 'Operação estável, mas requer atenção.' }
        if (score >= 60) return { label: 'Risco Operacional', color: 'text-[#B13A2B]', dot: 'bg-[#B13A2B]', pulse: true, msg: 'Atenção: verifique pendências urgentes.' }
        return { label: 'Situação Crítica', color: 'text-red-700', dot: 'bg-red-500', pulse: true, msg: 'Ação imediata: resolva os vazamentos!' }
    }
    const status = getStatusInfo()

    const hasAnyDamage = score < 100 || activeLeaks.length > 0 || weeklyLeaks.length > 0
    const damageLevel = score < 60 ? 3 : score < 80 ? 2 : score < 100 ? 1 : 0

    const formatPerc = (v: number) => (v * 100).toFixed(1) + '%'

    const cmvStatusConfig = {
        good: { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />, label: 'Dentro da meta', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
        warning: { icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />, label: 'Fora da meta', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
        critical: { icon: <AlertCircle className="w-3.5 h-3.5 text-red-600" />, label: 'Fora da meta', color: 'text-red-700', bg: 'bg-red-50 border-red-100' },
    }
    const cmvConf = cmvStatusConfig[cmvStatus]

    return (
        <div className="bg-[#f3f6f9] rounded-[2.5rem] shadow-sm border border-[#e2e8f0] overflow-hidden flex flex-col animate-in fade-in duration-700">
            <style>{`
                @keyframes reservoir-drip {
                    0% { transform: translateY(0) scale(0); opacity: 0; }
                    30% { transform: translateY(0) scale(1); opacity: 1; }
                    80% { transform: translateY(15px) scale(1.1); opacity: 0.9; }
                    100% { transform: translateY(25px) scale(0.6); opacity: 0; }
                }
            `}</style>

            {/* ═══ BLOCO A: SITUAÇÃO DA OPERAÇÃO ═══ */}
            <div className="p-6 pb-2">
                <header className="flex items-center justify-between mb-5 px-1">
                    <h3 className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em] flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" /> Status do Turno
                    </h3>
                    {hasAnyDamage && onViewGlobalClick && (
                        <button onClick={onViewGlobalClick} className="text-[9px] font-bold text-[#B13A2B] bg-red-50 px-2 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1 transition-all hover:scale-105 active:scale-95">
                            <Eye className="w-3 h-3" /> Ver Detalhes
                        </button>
                    )}
                </header>

                <div className="flex items-center gap-6 mb-6">
                    {/* SVG Reservatório (Reduzido e Assinatura Visual) */}
                    <div className="relative shrink-0 scale-90 -ml-2">
                        <div className="relative w-16 h-32 bg-[#F8F7F4] rounded-b-[24px] rounded-t-[8px] border-[4px] border-[#dcdad6] shadow-inner overflow-hidden flex flex-col justify-end">
                            <div className="absolute top-0 left-1.5 w-1.5 h-full bg-white opacity-20 blur-[0.5px] pointer-events-none z-30" />
                            <div className={`w-full transition-all duration-1000 ease-out relative z-10 bg-gradient-to-t ${getLevelGradient()}`} style={{ height: `${score}%` }}>
                                {score > 0 && <div className="absolute top-0 left-0 w-full h-[2px] bg-white/40" />}
                            </div>
                            
                            {/* FISSURAS */}
                            {damageLevel > 0 && (
                                <div className="absolute inset-0 z-40 pointer-events-none opacity-60">
                                    <svg viewBox="0 0 80 160" className="w-full h-full">
                                        {damageLevel >= 1 && <path d="M 20 20 L 30 35 L 28 45" fill="none" stroke="#ffffff" strokeWidth="1.2" />}
                                        {damageLevel >= 3 && <path d="M 15 110 L 25 125 L 35 120" fill="none" stroke="#ffffff" strokeWidth="2" />}
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* VAZAMENTO ANIMAÇÃO */}
                        {damageLevel >= 2 && (
                            <div className="absolute inset-0 z-50 pointer-events-none">
                                <div className="absolute flex flex-col items-center" style={{ top: '50px', left: '38px' }}>
                                    <svg className="absolute top-0 animate-[reservoir-drip_1.8s_infinite]" style={{ width: '6px', height: '10px' }} viewBox="0 0 18 22" fill={dropColor}>
                                        <path d="M9 0 C9 0 0 10 0 15 C0 19.4 4 22 9 22 C14 22 18 19.4 18 15 C18 10 9 0 9 0Z" />
                                    </svg>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dados Centrais */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <div className={`w-2 h-2 rounded-full ${status.dot} ${status.pulse ? 'animate-pulse' : ''}`} />
                            <span className={`text-[11px] font-black uppercase tracking-[0.1em] ${status.color}`}>{status.label}</span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-3">
                            <span className="text-5xl font-black text-[#1b1c1a] tracking-tighter leading-none">{score}</span>
                            <span className="text-xl font-black text-[#1b1c1a] opacity-30">%</span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex flex-col gap-1">
                                <p className={`text-[10px] font-black uppercase tracking-tight ${status.color}`}>Status: {status.label}</p>
                                <p className="text-[11px] font-bold text-gray-500 leading-tight">{status.msg}</p>
                            </div>

                             {/* CMV Discreto */}
                             <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${cmvConf.bg} shadow-sm`}>
                                <div className="flex flex-col">
                                    <span className="text-[7px] font-black opacity-40 uppercase leading-none">CMV Atual</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-[11px] font-black leading-none">{cmvCurrent && cmvCurrent > 0 ? formatPerc(cmvCurrent) : '—'}</span>
                                        <span className="text-[7px] font-bold opacity-30 tracking-tighter">/ {cmvTarget !== undefined && cmvTarget > 0 ? formatPerc(cmvTarget) : '--'}</span>
                                    </div>
                                </div>
                                <div className="w-[1px] h-4 bg-gray-200" />
                                <div className="flex items-center gap-1">
                                    {cmvConf.icon}
                                    <span className={`text-[9px] font-black uppercase tracking-tight ${cmvConf.color}`}>{cmvConf.label}</span>
                                </div>
                             </div>

                             {/* Sinais ativos */}
                            {activeLeaks.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {activeLeaks.slice(0, 1).map(l => (
                                        <div key={l.id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 border border-red-100/50">
                                            <AlertCircle className="w-2.5 h-2.5 text-[#B13A2B]" />
                                            <span className="text-[10px] font-bold text-[#B13A2B] truncate max-w-[100px]">{l.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>


            {/* ═══ BLOCO C: FOCO E DIRECIONAMENTO ═══ */}
            <div className="mt-auto bg-[#FDF0EF]/50 p-6 border-t border-[#fca5a5]/20">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#B13A2B] flex items-center justify-center shrink-0 shadow-lg shadow-red-100">
                        <Target className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <header className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-black text-[#B13A2B] uppercase tracking-[0.2em]">Foco Estratégico</span>
                            {canEdit && !isEditing && (
                                <button onClick={handleEdit} className="text-[#B13A2B]/40 hover:text-[#B13A2B] transition-colors cursor-pointer p-1">
                                    <Edit2 className="w-3 h-3" />
                                </button>
                            )}
                        </header>

                        {isEditing ? (
                            <div className="space-y-3 mt-2">
                                <textarea
                                    value={draft} onChange={e => setDraft(e.target.value)} disabled={isSaving} autoFocus
                                    className="w-full bg-white border border-[#fca5a5]/30 rounded-2xl p-4 text-[#1b1c1a] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#B13A2B]/20 resize-none h-24 shadow-inner"
                                    placeholder="Qual o foco do time nesta semana?"
                                />
                                <div className="flex justify-end gap-2 text-white">
                                    <button onClick={handleCancel} disabled={isSaving} className="px-4 py-2 rounded-xl bg-white border border-[#e9e8e5] text-[#8c716c] text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-1.5 shadow-sm"><X className="w-3.5 h-3.5" /> Cancelar</button>
                                    <button onClick={handleSave} disabled={isSaving || !draft.trim()} className="px-4 py-2 rounded-xl bg-[#B13A2B] text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-1.5 shadow-lg shadow-red-100">
                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Salvar</>}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[14px] font-black text-[#1b1c1a] leading-tight">
                                {focus?.title || 'Foco operacional: Integridade total e controle de desperdício.'}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
