'use client'

import React from 'react'
import { Droplet, AlertTriangle, Zap, Eye, Activity, Package } from 'lucide-react'
import { Leak } from '@/app/actions/efficiencyAction'

interface Props {
    score: number
    activeLeaks: Leak[]
    weeklyLeaks: Leak[]
    combinedTop3: Leak[]
    onActionClick: () => void
    onViewGlobalClick?: () => void
}

export default function EfficiencyReservoir({ 
    score, 
    activeLeaks, 
    weeklyLeaks, 
    combinedTop3,
    onActionClick, 
    onViewGlobalClick 
}: Props) {
    
    const getLevelGradient = () => {
        if (score >= 90) return 'from-blue-600 to-blue-400' 
        if (score >= 70) return 'from-amber-600 to-amber-400' 
        return 'from-red-700 to-red-500' 
    }

    const getStatusLabel = () => {
        if (score >= 90) return 'Operação Estanque'
        if (score >= 70) return 'Atenção Operacional'
        return 'Vazamento Crítico'
    }

    // Progressão de Fissuras Integradas (SVG)
    const damageLevel = score < 70 ? 3 : score < 90 ? 1 : 0

    return (
        <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e9e8e5]">
            <div className="flex items-center gap-8 mb-6">
                
                {/* REPRESENTAÇÃO VISUAL: RESERVATÓRIO COM DANO REAL */}
                <div className="relative group shrink-0">
                    <div className="relative w-24 h-40 bg-[#F8F7F4]/40 rounded-b-3xl rounded-t-lg border-[3px] border-[#e2e1de] shadow-inner overflow-hidden flex flex-col justify-end">
                        
                        {/* Brilho do Vidro */}
                        <div className="absolute top-0 left-2 w-1.5 h-full bg-white/20 blur-[1px] pointer-events-none z-20" />
                        
                        {/* Líquido (A Eficiência) */}
                        <div 
                            className={`w-full bg-gradient-to-t transition-all duration-1000 ease-out relative z-10 ${getLevelGradient()}`}
                            style={{ height: `${score}%` }}
                        >
                            {score > 0 && (
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-white/40 shadow-[0_-2px_8px_rgba(255,255,255,0.4)]" />
                            )}
                        </div>

                        {/* FISSURAS NO CORPO (SVG Integrado) */}
                        {damageLevel > 0 && (
                            <div className="absolute inset-0 z-30 pointer-events-none">
                                <svg viewBox="0 0 100 160" className="w-full h-full">
                                    {/* Fissura 1 (Base Esquerda) */}
                                    <g className="opacity-80">
                                        <path d="M 15 130 L 25 135 L 22 143 M 25 135 L 35 137" fill="none" stroke="#B13A2B" strokeWidth="1.5" strokeLinecap="round" />
                                        <circle cx="25" cy="135" r="1.5" fill="#B13A2B" />
                                    </g>
                                    
                                    {damageLevel >= 3 && (
                                        <>
                                            {/* Fissura 2 (Meio Direita) */}
                                            <g className="opacity-80">
                                                <path d="M 85 80 L 75 85 L 82 92 M 75 85 L 68 82" fill="none" stroke="#B13A2B" strokeWidth="1.5" strokeLinecap="round" />
                                                <circle cx="75" cy="85" r="1.5" fill="#B13A2B" />
                                            </g>
                                            {/* Fissura 3 (Top Esquerda) */}
                                            <g className="opacity-80">
                                                <path d="M 12 40 L 22 45 L 18 55 M 22 45 L 30 42" fill="none" stroke="#B13A2B" strokeWidth="1.5" strokeLinecap="round" />
                                                <circle cx="22" cy="45" r="1.5" fill="#B13A2B" />
                                            </g>
                                        </>
                                    )}
                                </svg>
                            </div>
                        )}

                        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/5 blur-[1px] z-20" />
                    </div>

                    {/* GOTEJAMENTO REALISTA (Saindo dos Furos) */}
                    {damageLevel > 0 && (
                        <div className="absolute inset-0 z-40 pointer-events-none">
                            <Droplet 
                                className="absolute w-3.5 h-3.5 text-red-500 fill-current animate-bounce shadow-sm" 
                                style={{ bottom: '20px', left: '21px', animationDuration: '2.5s' }} 
                            />
                            
                            {damageLevel >= 3 && (
                                <>
                                    <Droplet 
                                        className="absolute w-3 h-3 text-red-600 fill-current animate-bounce shadow-sm" 
                                        style={{ top: '82px', right: '18px', animationDuration: '1.8s' }} 
                                    />
                                    <Droplet 
                                        className="absolute w-3 h-3 text-red-400 fill-current animate-bounce shadow-sm" 
                                        style={{ top: '42px', left: '18px', animationDuration: '3.2s' }} 
                                    />
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* INFO DE SAÚDE SEMANAL */}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                         <div className={`w-2 h-2 rounded-full animate-pulse ${score >= 90 ? 'bg-blue-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} />
                         <span className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.15em]">{getStatusLabel()}</span>
                    </div>
                    
                    <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-5xl font-black text-[#1b1c1a] tracking-tight" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                            {score}<span className="text-2xl opacity-30">%</span>
                        </span>
                    </div>

                    {/* TOP 3 (SINAIS ATIVOS E PERDAS) */}
                    <div className="space-y-3">
                        {combinedTop3.length > 0 ? (
                            <div className="space-y-1.5">
                                {combinedTop3.map(leak => {
                                    const isActive = leak.type === 'checklist' || leak.type === 'session'
                                    return (
                                        <div key={leak.id} className="flex items-start gap-2">
                                            {isActive ? (
                                                <Activity className="w-3 h-3 mt-0.5 shrink-0 text-red-500" />
                                            ) : (
                                                <Package className="w-3 h-3 mt-0.5 shrink-0 text-[#8c716c]" />
                                            )}
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-bold line-clamp-1 ${isActive ? 'text-[#1b1c1a]' : 'text-[#8c716c]'}`}>
                                                    {leak.label}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                                
                                <button 
                                    onClick={onViewGlobalClick}
                                    className="flex items-center gap-1.5 text-[9px] font-black text-[#B13A2B] uppercase tracking-widest mt-2 hover:opacity-70 transition-opacity"
                                >
                                    <Eye className="w-3 h-3" />
                                    <span>Ver vazamentos da semana</span>
                                </button>
                            </div>
                        ) : (
                            <p className="text-[11px] text-[#8c716c] font-medium leading-relaxed italic">
                                Sua operação está sólida nesta semana. Nenhum furo detectado.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* AÇÃO PROATIVA */}
            <button 
                onClick={onActionClick}
                className="w-full bg-[#1b1c1a] hover:bg-black text-white font-black text-[10px] uppercase tracking-[0.25em] py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-white/10"
            >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Relatar Perda / Vedar Vazamento
            </button>
        </div>
    )
}
