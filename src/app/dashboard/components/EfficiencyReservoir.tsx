'use client'

import React from 'react'
import { Droplet, Zap, Eye, Activity, Package } from 'lucide-react'
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
        if (score >= 90) return 'from-blue-700 via-blue-500 to-blue-400' 
        if (score >= 70) return 'from-amber-600 via-amber-500 to-amber-400' 
        return 'from-red-800 via-red-600 to-red-500' 
    }

    const getStatusLabel = () => {
        if (score >= 90) return 'Operação Estanque'
        if (score >= 70) return 'Atenção Operacional'
        return 'Vazamento Crítico'
    }

    // Nível de Dano Visual Extremo
    const hasAnyDamage = score < 100 || activeLeaks.length > 0 || weeklyLeaks.length > 0
    const damageLevel = score < 70 ? 3 : score < 90 ? 2 : hasAnyDamage ? 1 : 0

    return (
        <div className="bg-white rounded-[40px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-[#e9e8e5] overflow-hidden relative group/card">
            
            {/* Decoração superior sutil */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#B13A2B]/20 to-transparent opacity-40" />

            <div className="flex items-center gap-12">
                
                {/* REPRESENTAÇÃO VISUAL: RESERVATÓRIO GIGANTE (Protagonista V6) */}
                <div className="relative shrink-0 flex items-center justify-center py-2">
                    <div className="relative w-36 h-64 bg-[#F8F7F4] rounded-b-[48px] rounded-t-2xl border-[6px] border-[#dcdad6] shadow-[inset_0_4px_24px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col justify-end">
                        
                        {/* Camada de Vidro: Reflexos High-End */}
                        <div className="absolute top-0 left-4 w-3 h-full bg-white opacity-20 blur-[2px] pointer-events-none z-30" />
                        <div className="absolute top-10 right-6 w-6 h-20 bg-white opacity-10 blur-[6px] rounded-full pointer-events-none z-30 rotate-[20deg]" />
                        <div className="absolute bottom-10 right-4 w-1.5 h-32 bg-white opacity-5 blur-[1px] pointer-events-none z-30" />
                        
                        {/* Líquido Deep (A Eficiência) */}
                        <div 
                            className={`w-full bg-gradient-to-t transition-all duration-1000 ease-out relative z-10 ${getLevelGradient()}`}
                            style={{ height: `${score}%` }}
                        >
                            {score > 0 && (
                                <div className="absolute top-0 left-0 w-full h-[4px] bg-white/50 shadow-[0_-4px_20px_rgba(255,255,255,0.8)]" />
                            )}
                            
                            {/* Turbulência sutil se houver dano */}
                            {damageLevel > 0 && score > 0 && (
                                <div className="absolute inset-0 z-0 opacity-30">
                                    <div className="absolute bottom-12 left-6 w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                                    <div className="absolute bottom-32 right-10 w-2 h-2 bg-white rounded-full animate-ping delay-500" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/10 rounded-full blur-xl animate-pulse" />
                                </div>
                            )}
                        </div>

                        {/* FISSURAS REAIS: Dano no Vidro (SVG Integrado) */}
                        {damageLevel > 0 && (
                            <div className="absolute inset-0 z-40 pointer-events-none">
                                <svg viewBox="0 0 144 256" className="w-full h-full drop-shadow-md">
                                    {/* Fissura 1: Trinca de Base (Impacto) */}
                                    <g className="opacity-95">
                                        <path 
                                            d="M 25 205 L 42 215 L 38 230 M 42 215 L 60 220 L 58 235" 
                                            fill="none" stroke="#2D0F0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
                                        />
                                        <path 
                                            d="M 42 215 L 46 210" 
                                            fill="none" stroke="#B13A2B" strokeWidth="1.5" strokeLinecap="round" 
                                        />
                                        <circle cx="42" cy="215" r="3.5" fill="#1b0a08" />
                                    </g>
                                    
                                    {damageLevel >= 2 && (
                                        <>
                                            {/* Fissura 2: Rachadura Lateral de Tensão */}
                                            <g className="opacity-95">
                                                <path 
                                                    d="M 125 140 L 105 152 L 115 170 M 105 152 L 85 145" 
                                                    fill="none" stroke="#2D0F0B" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" 
                                                />
                                                <circle cx="105" cy="152" r="3.5" fill="#1b0a08" />
                                            </g>
                                        </>
                                    )}

                                    {damageLevel >= 3 && (
                                        <>
                                            {/* Fissura 3: Estilhaço Superior Crítico */}
                                            <g className="opacity-100">
                                                <path 
                                                    d="M 20 60 L 45 72 L 35 90 M 45 72 L 70 68 L 75 82" 
                                                    fill="none" stroke="#2D0F0B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
                                                />
                                                <circle cx="45" cy="72" r="4" fill="#1b0a08" />
                                            </g>
                                        </>
                                    )}
                                </svg>
                            </div>
                        )}

                        <div className="absolute bottom-0 left-0 w-full h-5 bg-black/10 blur-[3px] z-20" />
                    </div>

                    {/* VAZAMENTO LOCALIZADO: Gotejamento fixo na rachadura */}
                    {damageLevel > 0 && (
                        <div className="absolute inset-0 z-50 pointer-events-none">
                            {/* Gota 1: Vinda da Fissura 1 */}
                            <Droplet 
                                className="absolute w-6 h-6 text-red-700 fill-current animate-bounce shadow-xl" 
                                style={{ bottom: '34px', left: '34px', animationDuration: '1.8s' }} 
                            />
                            
                            {damageLevel >= 2 && (
                                <Droplet 
                                    className="absolute w-5 h-5 text-red-800 fill-current animate-bounce" 
                                    style={{ top: '154px', right: '32px', animationDuration: '1.4s' }} 
                                />
                            )}
                            
                            {damageLevel >= 3 && (
                                <Droplet 
                                    className="absolute w-5 h-5 text-red-600 fill-current animate-bounce" 
                                    style={{ top: '78px', left: '38px', animationDuration: '2.5s' }} 
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* CONTEÚDO E MÉTRICAS (Refinado) */}
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                         <div className={`w-3 h-3 rounded-full animate-pulse ${score >= 90 ? 'bg-blue-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} />
                         <span className="text-[12px] font-black text-[#8c716c] uppercase tracking-[0.25em]">{getStatusLabel()}</span>
                    </div>
                    
                    <div className="flex items-baseline gap-2 mb-8">
                        <span className="text-7xl font-black text-[#1b1c1a] tracking-tighter leading-none" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                            {score}<span className="text-4xl opacity-15 ml-1">%</span>
                        </span>
                    </div>

                    <div className="space-y-6">
                        {/* SINAIS ATIVOS */}
                        {activeLeaks.length > 0 && (
                            <div>
                                <h4 className="text-[11px] font-black text-[#B13A2B] uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5" />
                                    Prioridade Agora
                                </h4>
                                <div className="space-y-2 pl-4 border-l-2 border-red-200">
                                    {activeLeaks.slice(0, 2).map(leak => (
                                        <p key={leak.id} className="text-[12px] font-extrabold text-[#1b1c1a]">{leak.label}</p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* PERDAS DA SEMANA */}
                        {weeklyLeaks.length > 0 && (
                            <div>
                                <h4 className="text-[11px] font-black text-[#8c716c] uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5" />
                                    Desperdício Acumulado
                                </h4>
                                <div className="space-y-2 pl-4 border-l-2 border-[#eeebe7]">
                                    {weeklyLeaks.slice(0, 2).map(leak => (
                                        <p key={leak.id} className="text-[12px] font-bold text-[#58413e]">{leak.label}</p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!hasAnyDamage && (
                             <p className="text-sm text-[#8c716c] font-medium leading-relaxed italic pr-8">
                                Sua operação está sólida nesta semana. Nenhum vazamento detectado até o momento.
                            </p>
                        )}
                        
                        {(activeLeaks.length > 0 || weeklyLeaks.length > 0) && (
                            <button 
                                onClick={onViewGlobalClick}
                                className="inline-flex items-center gap-2 text-[11px] font-black text-[#B13A2B] uppercase tracking-[0.2em] border-b-2 border-transparent hover:border-[#B13A2B] transition-all pb-0.5"
                            >
                                <Eye className="w-4 h-4" />
                                <span>Auditar vazamentos</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* AÇÃO PRINCIPAL (Secondary Visual Balance) */}
            <div className="mt-6 flex justify-center">
                <button 
                    onClick={onActionClick}
                    className="group relative inline-flex items-center gap-4 bg-[#1b1c1a] hover:bg-black text-white px-10 py-3.5 rounded-2xl shadow-xl active:scale-[0.98] transition-all"
                >
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400 group-hover:scale-125 transition-transform" />
                    <span className="font-black text-[11px] uppercase tracking-[0.3em]">Relatar Perda</span>
                    <div className="absolute inset-0 rounded-2xl border border-white/10 group-hover:border-white/20 pointer-events-none" />
                </button>
            </div>
        </div>
    )
}
