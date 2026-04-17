'use client'

import React, { useState } from 'react'
import { Thermometer, Activity, Package, Eye, Target, AlertCircle, CheckCircle2, Flame, Edit2, Check, X, Loader2, ArrowUpRight } from 'lucide-react'
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

    // ═══ TEMPERATURA ═══
    const MIN_TEMP = 30, MAX_TEMP = 95
    const displayTemp = Math.round(MIN_TEMP + ((100 - score) / 100) * (MAX_TEMP - MIN_TEMP))

    const getStatus = () => {
        if (displayTemp <= 35) return { label: 'No ponto', sublabel: 'Operação estável', color: 'text-emerald-700', dotColor: 'bg-emerald-500', pulse: false }
        if (displayTemp <= 45) return { label: 'Esquentando', sublabel: 'Acima da faixa ideal', color: 'text-amber-700', dotColor: 'bg-amber-500', pulse: false }
        if (displayTemp <= 60) return { label: 'Atenção', sublabel: 'Temperatura acima do normal', color: 'text-orange-700', dotColor: 'bg-orange-500', pulse: true }
        if (displayTemp <= 78) return { label: 'Fora do ponto', sublabel: 'Operação comprometida', color: 'text-red-600', dotColor: 'bg-red-500', pulse: true }
        return { label: 'Crítico', sublabel: 'Ação imediata', color: 'text-red-700', dotColor: 'bg-red-600', pulse: true }
    }
    const status = getStatus()
    const hasAnyIssue = activeLeaks.length > 0 || weeklyLeaks.length > 0

    const getMercuryColor = () => {
        if (displayTemp <= 35) return '#059669'
        if (displayTemp <= 45) return '#d97706'
        if (displayTemp <= 60) return '#ea580c'
        return '#dc2626'
    }
    const getBulbColor = () => {
        if (displayTemp <= 35) return '#047857'
        if (displayTemp <= 45) return '#b45309'
        if (displayTemp <= 60) return '#c2410c'
        return '#b91c1c'
    }

    const TUBE_H = 120
    const fillPct = 0.30 + ((displayTemp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)) * 0.70
    const mercuryH = Math.round(fillPct * TUBE_H)
    const mercuryY = 14 + TUBE_H - mercuryH

    const formatPerc = (v: number) => (v * 100).toFixed(1) + '%'

    const cmvStatusConfig = {
        good: { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />, label: 'Dentro da meta', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
        warning: { icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />, label: 'Fora da meta', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
        critical: { icon: <AlertCircle className="w-3.5 h-3.5 text-red-600" />, label: 'Fora da meta', color: 'text-red-700', bg: 'bg-red-50 border-red-100' },
    }
    const cmvConf = cmvStatusConfig[cmvStatus]

    return (
        <div className="bg-white rounded-[32px] shadow-[0_16px_40px_rgba(0,0,0,0.06)] border border-[#e9e8e5] overflow-hidden">

            {/* ─── LINHA DE CALOR SUPERIOR ─── */}
            <div className="h-1" style={{ background: `linear-gradient(to right, transparent, ${getMercuryColor()}33, transparent)` }} />

            {/* ═══ PARTE 1: TERMÔMETRO ═══ */}
            <div className="p-5 pb-4">
                <div className="flex items-center gap-2 mb-3">
                    <Thermometer className="w-3.5 h-3.5 text-[#8c716c]" />
                    <span className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.15em]">Saúde da Operação</span>
                </div>

                <div className="flex items-start gap-5">
                    {/* SVG Termômetro (compacto) */}
                    <div className="shrink-0">
                        <svg width="56" height="180" viewBox="0 0 56 180" fill="none">
                            <defs>
                                <linearGradient id="hg" x1="0" y1="1" x2="0" y2="0">
                                    <stop offset="0%" stopColor={getBulbColor()} />
                                    <stop offset="100%" stopColor={getMercuryColor()} stopOpacity="0.9" />
                                </linearGradient>
                                <linearGradient id="tg" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#e8e6e1" /><stop offset="50%" stopColor="#f5f4f1" /><stop offset="100%" stopColor="#dcdad6" />
                                </linearGradient>
                                <clipPath id="tc"><rect x="20" y="14" width="14" height={TUBE_H} rx="7" /></clipPath>
                            </defs>

                            {/* Escala */}
                            <line x1="38" y1="96" x2="46" y2="96" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />
                            <text x="47" y="99" fill="#059669" fontSize="6" fontWeight="800" fontFamily="sans-serif">IDEAL</text>
                            <line x1="38" y1="18" x2="46" y2="18" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" />
                            <text x="47" y="21" fill="#fca5a5" fontSize="6" fontWeight="800" fontFamily="sans-serif">MÁX</text>
                            {[42, 62, 78].map(y => <line key={y} x1="38" y1={y} x2="42" y2={y} stroke="#e5e7eb" strokeWidth="1" strokeLinecap="round" />)}

                            {/* Tubo */}
                            <rect x="20" y="14" width="14" height={TUBE_H} rx="7" fill="url(#tg)" stroke="#d4d0cb" strokeWidth="1.5" />

                            {/* Mercúrio */}
                            <g clipPath="url(#tc)">
                                <rect x="20" y={mercuryY} width="14" height={mercuryH} fill="url(#hg)" className="transition-all duration-1000 ease-out" />
                                {mercuryH > 4 && <ellipse cx="27" cy={mercuryY} rx="7" ry="2.5" fill={getMercuryColor()} opacity="0.7" className="transition-all duration-1000 ease-out" />}
                            </g>

                            {/* Bulbo */}
                            <circle cx="27" cy="150" r="18" fill="url(#tg)" stroke="#d4d0cb" strokeWidth="1.5" />
                            <circle cx="27" cy="150" r="14" fill={getBulbColor()} />
                            <ellipse cx="23" cy="145" rx="4" ry="5" fill="white" opacity="0.15" />
                        </svg>
                    </div>

                    {/* Métricas */}
                    <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${status.dotColor} ${status.pulse ? 'animate-pulse' : ''}`} />
                            <span className={`text-[11px] font-black uppercase tracking-[0.12em] ${status.color}`}>{status.label}</span>
                        </div>

                        <div className="flex items-baseline gap-1 mb-0.5">
                            <span className="text-5xl font-black text-[#1b1c1a] tracking-tighter leading-none" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>{displayTemp}</span>
                            <span className="text-xl font-black text-[#1b1c1a] opacity-40">°C</span>
                        </div>
                        <p className="text-[9px] font-bold text-[#c0b3b1] uppercase tracking-widest mb-4">{status.sublabel} · meta: 30°C</p>

                        {/* Sinais ativos */}
                        {activeLeaks.length > 0 && (
                            <div className="mb-3">
                                <h4 className="text-[9px] font-black text-[#B13A2B] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <Activity className="w-2.5 h-2.5" /> Sinais ativos
                                </h4>
                                <div className="space-y-0.5 pl-2.5 border-l-2 border-[#fca5a5]">
                                    {activeLeaks.slice(0, 2).map(l => <p key={l.id} className="text-[11px] font-bold text-[#1b1c1a]">{l.label}</p>)}
                                </div>
                            </div>
                        )}

                        {/* Perdas da semana */}
                        {weeklyLeaks.length > 0 && (
                            <div className="mb-3">
                                <h4 className="text-[9px] font-black text-[#8c716c] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <Package className="w-2.5 h-2.5" /> Perdas da semana
                                </h4>
                                <div className="space-y-0.5 pl-2.5 border-l-2 border-[#e9e8e5]">
                                    {weeklyLeaks.slice(0, 2).map(l => <p key={l.id} className="text-[11px] font-medium text-[#58413e]">{l.label}</p>)}
                                </div>
                            </div>
                        )}

                        {!hasAnyIssue && (
                            <p className="text-[11px] text-[#8c716c] font-medium bg-[#F8F7F4] p-2.5 rounded-xl border border-[#e9e8e5]">
                                Operação estabilizada. Padrões atingidos.
                            </p>
                        )}

                        {hasAnyIssue && onViewGlobalClick && (
                            <button onClick={onViewGlobalClick} className="inline-flex items-center gap-1 text-[9px] font-bold text-[#8c716c] hover:text-[#58413e] uppercase tracking-widest transition-colors cursor-pointer mt-1">
                                <Eye className="w-3 h-3" /> Ver detalhes da semana
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ PARTE 2: CMV INLINE ═══ */}
            {cmvTarget !== undefined && cmvTarget > 0 && (
                <div className="mx-5 mb-4 flex items-center justify-between p-3.5 rounded-2xl bg-[#F8F7F4] border border-[#eeedea]">
                    <div className="flex items-center gap-2.5">
                        <Target className="w-4 h-4 text-[#8c716c]" />
                        <div className="flex items-baseline gap-2">
                            <span className="text-[10px] font-bold text-[#8c716c] uppercase tracking-widest">Meta</span>
                            <span className="text-base font-black text-[#1b1c1a] tracking-tight">{formatPerc(cmvTarget)}</span>
                            <span className="text-[10px] text-[#c0b3b1]">·</span>
                            <span className="text-[10px] font-bold text-[#8c716c] uppercase tracking-widest">CMV</span>
                            <span className="text-base font-black text-[#58413e] tracking-tight">{cmvCurrent && cmvCurrent > 0 ? formatPerc(cmvCurrent) : '—'}</span>
                        </div>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tight ${cmvConf.bg} ${cmvConf.color}`}>
                        {cmvConf.icon}
                        {cmvConf.label}
                    </div>
                </div>
            )}

            {/* ═══ PARTE 3: FOCO DA SEMANA (footer escuro) ═══ */}
            <div className="bg-[#1b1c1a] px-5 py-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#B13A2B] to-transparent opacity-10 rounded-full -mr-12 -mt-12" />

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-white/40">
                            <Flame className="w-3.5 h-3.5 text-[#B13A2B] fill-[#B13A2B]" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Foco da Semana</span>
                        </div>
                        {canEdit && !isEditing && (
                            <button onClick={handleEdit} className="text-white/20 hover:text-white transition-colors cursor-pointer">
                                <Edit2 className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={draft} onChange={e => setDraft(e.target.value)} disabled={isSaving} autoFocus
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-[#B13A2B] resize-none h-16 placeholder:text-white/20"
                                placeholder="Digite o foco da semana..."
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={handleCancel} disabled={isSaving} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                                <button onClick={handleSave} disabled={isSaving || !draft.trim()} className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#B13A2B] text-white hover:bg-red-600 transition-all disabled:opacity-50 cursor-pointer">
                                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-[15px] font-bold text-white leading-snug pr-4">
                                {focus?.title || 'Manter a operação dentro da meta e padrões de qualidade.'}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-[8px] font-black text-[#B13A2B] uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    Prioridade <ArrowUpRight className="w-2.5 h-2.5" />
                                </span>
                                <span className="text-[8px] font-bold text-white/25 uppercase tracking-widest">
                                    {focus?.source === 'manual' ? 'Manual' : 'Sugestão'}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
