'use client'

import React, { useState } from 'react'
import { Activity, Package, Eye, Target, AlertCircle, CheckCircle2, Flame, Edit2, Check, X, Loader2 } from 'lucide-react'
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
        if (score === 100) return 'from-[#8c716c] via-[#b69a94] to-[#dcd0ce]'
        if (score >= 80) return 'from-[#8c716c] via-[#bd948a] to-[#ebbcae]'
        if (score >= 60) return 'from-[#a24936] via-[#cb654f] to-[#efa18a]'
        return 'from-[#B13A2B] via-[#d65140] to-[#f87f6e]'
    }
    const dropColor = score >= 80 ? '#c48f81' : score >= 60 ? '#cb654f' : '#B13A2B'

    const getStatusInfo = () => {
        if (score === 100) return { label: 'Íntegra', color: 'text-emerald-700', dot: 'bg-emerald-500', pulse: false }
        if (score >= 80) return { label: 'Em atenção', color: 'text-amber-700', dot: 'bg-amber-500', pulse: true }
        if (score >= 60) return { label: 'Comprometida', color: 'text-[#B13A2B]', dot: 'bg-[#B13A2B]', pulse: true }
        return { label: 'Crítica', color: 'text-red-700', dot: 'bg-red-500', pulse: true }
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
        <div className="bg-white rounded-[32px] shadow-[0_16px_40px_rgba(0,0,0,0.06)] border border-[#e9e8e5] overflow-hidden">
            <style>{`
                @keyframes reservoir-drip {
                    0% { transform: translateY(0) scale(0); opacity: 0; }
                    30% { transform: translateY(0) scale(1); opacity: 1; }
                    80% { transform: translateY(15px) scale(1.1); opacity: 0.9; }
                    100% { transform: translateY(25px) scale(0.6); opacity: 0; }
                }
            `}</style>

            {/* ─── DESTAQUE SUPERIOR PREMIUN ─── */}
            <div className="h-1 bg-gradient-to-r from-transparent via-[#8c716c]/40 to-transparent" />

            {/* ═══ PARTE 1: RESERVATÓRIO ═══ */}
            <div className="p-5 pb-4">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-3.5 h-3.5 text-[#8c716c]" />
                    <span className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.15em]">Integridade da Operação</span>
                </div>

                <div className="flex items-start gap-6">
                    {/* SVG Reservatório */}
                    <div className="relative shrink-0 flex items-center justify-center">
                        <div className="relative w-20 h-40 bg-[#F8F7F4] rounded-b-[28px] rounded-t-[10px] border-[5px] border-[#dcdad6] shadow-[inset_0_4px_16px_rgba(0,0,0,0.08),0_8px_20px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col justify-end">
                            
                            {/* Camada de Vidro Reflexo */}
                            <div className="absolute top-0 left-2 w-2 h-full bg-white opacity-20 blur-[1px] pointer-events-none z-30" />
                            <div className="absolute top-6 right-3 w-4 h-12 bg-white opacity-10 blur-[4px] rounded-full pointer-events-none z-30 rotate-[20deg]" />
                            <div className="absolute bottom-6 right-2 w-1 h-20 bg-white opacity-5 blur-[1px] pointer-events-none z-30" />
                            
                            {/* Líquido Deep (A Integridade) */}
                            <div className={\`w-full transition-all duration-1000 ease-out relative z-10 bg-gradient-to-t \${getLevelGradient()}\`} style={{ height: \`\${score}%\` }}>
                                {score > 0 && <div className="absolute top-0 left-0 w-full h-[3px] bg-white/40 shadow-[0_-2px_12px_rgba(255,255,255,0.6)]" />}
                                
                                {/* Turbulência sutil */}
                                {damageLevel > 0 && score > 0 && (
                                    <div className="absolute inset-0 z-0 opacity-30">
                                        <div className="absolute bottom-6 left-3 w-1 h-1 bg-white rounded-full animate-ping" />
                                        <div className="absolute bottom-16 right-5 w-1.5 h-1.5 bg-white rounded-full animate-ping delay-500" />
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/20 rounded-full blur-md animate-pulse" />
                                    </div>
                                )}
                            </div>

                            {/* FISSURAS NO VIDRO (Embutidas na estrutura) */}
                            {damageLevel > 0 && (
                                <div className="absolute inset-0 z-40 pointer-events-none">
                                    <svg viewBox="0 0 80 160" className="w-full h-full opacity-90">
                                        {/* Sinais de desgaste iniciais (Level 1+) -> Fissuras capilares, sem vazamento */}
                                        <path d="M 55 40 Q 60 45 58 55" fill="none" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" />
                                        <path d="M 56 41 Q 61 46 58 54" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" strokeLinecap="round" />
                                        
                                        <path d="M 15 110 L 20 115 L 18 122" fill="none" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round" />
                                        <path d="M 16 111 L 20 114 L 18 121" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" strokeLinejoin="round" />

                                        {/* Dano perceptível (Level 2+) -> Fissura estrutural central */}
                                        {damageLevel >= 2 && (
                                            <g>
                                                <path d="M 28 135 L 39 125 L 42 128 L 52 118" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M 29 135 L 39 126 L 42 129 L 52 119" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M 39 125 L 44 116" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" strokeLinecap="round" />
                                                <circle cx="39" cy="125" r="1" fill="rgba(0,0,0,0.5)" />
                                            </g>
                                        )}

                                        {/* Dano Crítico (Level 3+) -> Fissura profunda e ramificada no topo */}
                                        {damageLevel >= 3 && (
                                            <g>
                                                <path d="M 8 35 L 20 45 L 18 55 L 32 62" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M 9 36 L 20 46 L 19 56 L 31 62" fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M 20 45 L 28 36" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1" strokeLinecap="round" />
                                                <circle cx="20" cy="45" r="1.5" fill="rgba(0,0,0,0.6)" />
                                            </g>
                                        )}
                                    </svg>
                                </div>
                            )}

                            <div className="absolute bottom-0 left-0 w-full h-3 bg-black/10 blur-[2px] z-20" />
                        </div>

                        {/* VAZAMENTOS EXTATOS NAS FISSURAS */}
                        {damageLevel >= 2 && (
                            <div className="absolute inset-0 z-50 pointer-events-none">
                                {/* VAZAMENTO 1 (Sai da fissura M 39 125 -> X=39, Y=125) */}
                                <div className="absolute flex flex-col items-center" style={{ top: '122px', left: '35px' }}>
                                    <div className="w-1.5 h-1.5 rounded-full animate-ping opacity-60" style={{ backgroundColor: dropColor, animationDuration: '2s' }} />
                                    <svg className="absolute top-0 animate-[reservoir-drip_2s_infinite]" style={{ width: '8px', height: '12px' }} viewBox="0 0 18 22" fill={dropColor}>
                                        <path d="M9 0 C9 0 0 10 0 15 C0 19.4 4 22 9 22 C14 22 18 19.4 18 15 C18 10 9 0 9 0Z" />
                                    </svg>
                                </div>

                                {/* VAZAMENTO 2 (Sai da fissura crítica M 20 45 -> X=20, Y=45) */}
                                {damageLevel >= 3 && (
                                    <div className="absolute flex flex-col items-center" style={{ top: '42px', left: '15px' }}>
                                        <div className="w-2 h-2 rounded-full animate-ping opacity-60" style={{ backgroundColor: dropColor, animationDuration: '1.5s', animationDelay: '0.4s' }} />
                                        <svg className="absolute top-0 animate-[reservoir-drip_1.5s_infinite_0.4s]" style={{ width: '10px', height: '14px' }} viewBox="0 0 18 22" fill={dropColor}>
                                            <path d="M9 0 C9 0 0 10 0 15 C0 19.4 4 22 9 22 C14 22 18 19.4 18 15 C18 10 9 0 9 0Z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Métricas */}
                    <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 mb-1">
                            <div className={\`w-2 h-2 rounded-full \${status.dot} \${status.pulse ? 'animate-pulse' : ''}\`} />
                            <span className={\`text-[11px] font-black uppercase tracking-[0.12em] \${status.color}\`}>{status.label}</span>
                        </div>

                        <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-5xl font-black text-[#1b1c1a] tracking-tighter leading-none" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>{score}</span>
                            <span className="text-xl font-black text-[#1b1c1a] opacity-40">%</span>
                        </div>

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

                        {!hasAnyDamage && (
                            <p className="text-[11px] text-[#8c716c] font-medium bg-[#F8F7F4] p-2.5 rounded-xl border border-[#e9e8e5]">
                                Operação estabilizada. Padrões mantidos.
                            </p>
                        )}

                        {hasAnyDamage && onViewGlobalClick && (
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
                    <div className={\`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tight \${cmvConf.bg} \${cmvConf.color}\`}>
                        {cmvConf.icon}
                        {cmvConf.label}
                    </div>
                </div>
            )}

            {/* ═══ PARTE 3: FOCO DA SEMANA (clean strip) ═══ */}
            <div className="mx-5 mb-4 flex items-start gap-3 p-3.5 rounded-2xl border border-[#eeedea] bg-[#F8F7F4]">
                <Flame className="w-4 h-4 text-[#B13A2B] fill-[#B13A2B] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-black text-[#8c716c] uppercase tracking-widest">Foco da Semana</span>
                        {canEdit && !isEditing && (
                            <button onClick={handleEdit} className="text-[#c0b3b1] hover:text-[#58413e] transition-colors cursor-pointer">
                                <Edit2 className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={draft} onChange={e => setDraft(e.target.value)} disabled={isSaving} autoFocus
                                className="w-full bg-white border border-[#e9e8e5] rounded-xl p-2.5 text-[#1b1c1a] text-sm focus:outline-none focus:border-[#B13A2B] resize-none h-16 placeholder:text-[#c0b3b1]"
                                placeholder="Digite o foco da semana..."
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={handleCancel} disabled={isSaving} className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#eeedea] text-[#8c716c] hover:bg-[#e9e8e5] transition-all disabled:opacity-50 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                                <button onClick={handleSave} disabled={isSaving || !draft.trim()} className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#B13A2B] text-white hover:bg-red-600 transition-all disabled:opacity-50 cursor-pointer">
                                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-[13px] font-semibold text-[#1b1c1a] leading-snug">
                            {focus?.title || 'Manter a operação íntegra e sem vazamento de resultados.'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
