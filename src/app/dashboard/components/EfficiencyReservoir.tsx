'use client'

import React from 'react'
import { Zap, Eye, Activity, Package } from 'lucide-react'
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
        // ÁGUA SEMPRE AZUL (Regra MOC: Eficiência é azul, danos são visuais secundários)
        return 'from-blue-700 via-blue-500 to-blue-400' 
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

                        {/* FISSURAS NO VIDRO: Integradas ao material */}
                        {damageLevel > 0 && (
                            <div className="absolute inset-0 z-40 pointer-events-none">
                                <svg viewBox="0 0 144 256" className="w-full h-full">
                                    <defs>
                                        {/* Textura de profundidade: a fissura escurece o vidro de dentro */}
                                        <filter id="crack-depth">
                                            <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="blur" />
                                            <feOffset dx="0.5" dy="1" in="blur" result="shadow" />
                                            <feComposite in="SourceGraphic" in2="shadow" />
                                        </filter>
                                    </defs>

                                    {/* FISSURA 1 — Elegante, base lateral esquerda */}
                                    {/* Ponto de impacto: x=38, y=212 */}
                                    <g filter="url(#crack-depth)">
                                        {/* Linha principal — hairline, como trinca de vidro temperado */}
                                        <path
                                            d="M 28 208 L 36 212 L 32 222 M 36 212 L 50 218 L 47 228"
                                            fill="none"
                                            stroke="rgba(0,0,0,0.55)"
                                            strokeWidth={damageLevel === 1 ? "0.9" : "1.3"}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        {/* Fio secundário — ramificação fina */}
                                        <path
                                            d="M 36 212 L 40 207"
                                            fill="none"
                                            stroke="rgba(0,0,0,0.3)"
                                            strokeWidth="0.7"
                                            strokeLinecap="round"
                                        />
                                        {/* Ponto de impacto: área branca interna simulando ruptura */}
                                        <circle cx="36" cy="212" r={damageLevel === 1 ? "1.5" : "2.5"}
                                            fill="rgba(255,255,255,0.6)"
                                            stroke="rgba(0,0,0,0.4)"
                                            strokeWidth="0.8"
                                        />
                                    </g>

                                    {damageLevel >= 2 && (
                                        /* FISSURA 2 — Lateral direita, rachadura de tensão estrutural */
                                        /* Ponto de impacto: x=108, y=148 */
                                        <g filter="url(#crack-depth)">
                                            <path
                                                d="M 126 142 L 110 150 L 118 166 M 110 150 L 92 143 M 110 150 L 106 140"
                                                fill="none"
                                                stroke="rgba(0,0,0,0.6)"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                            {/* Halo de impacto: estilhaço radial fino */}
                                            <path
                                                d="M 110 150 L 115 145 M 110 150 L 104 156 M 110 150 L 116 154"
                                                fill="none"
                                                stroke="rgba(0,0,0,0.2)"
                                                strokeWidth="0.6"
                                                strokeLinecap="round"
                                            />
                                            <circle cx="110" cy="150" r="3"
                                                fill="rgba(255,255,255,0.5)"
                                                stroke="rgba(0,0,0,0.45)"
                                                strokeWidth="0.9"
                                            />
                                        </g>
                                    )}

                                    {damageLevel >= 3 && (
                                        /* FISSURA 3 — Superior esquerda: estilhaço crítico */
                                        /* Ponto de impacto: x=44, y=70 */
                                        <g filter="url(#crack-depth)">
                                            {/* Polígono de vidro estilhaçado — faz parecer quebrado de dentro */}
                                            <polygon
                                                points="44,70 52,62 62,68 58,80 46,82"
                                                fill="rgba(255,255,255,0.15)"
                                                stroke="rgba(0,0,0,0.5)"
                                                strokeWidth="1"
                                                strokeLinejoin="round"
                                            />
                                            {/* Raios de fratura irradiando do impacto */}
                                            <path
                                                d="M 44 70 L 22 56 M 44 70 L 30 86 M 44 70 L 68 65 M 44 70 L 66 82"
                                                fill="none"
                                                stroke="rgba(0,0,0,0.55)"
                                                strokeWidth="1.2"
                                                strokeLinecap="round"
                                            />
                                            {/* Fragmentos secundários */}
                                            <path
                                                d="M 44 70 L 38 58 M 44 70 L 55 88"
                                                fill="none"
                                                stroke="rgba(0,0,0,0.25)"
                                                strokeWidth="0.7"
                                                strokeLinecap="round"
                                            />
                                            <circle cx="44" cy="70" r="3.5"
                                                fill="rgba(255,255,255,0.7)"
                                                stroke="rgba(0,0,0,0.5)"
                                                strokeWidth="1"
                                            />
                                        </g>
                                    )}
                                </svg>
                            </div>
                        )}

                        <div className="absolute bottom-0 left-0 w-full h-5 bg-black/10 blur-[3px] z-20" />
                    </div>

                    {/* GOTAS: Agua orgânica saindo do ponto exato da fissura */}
                    {damageLevel > 0 && (
                        <div className="absolute inset-0 z-50 pointer-events-none">
                            {/* Gota 1 — nasce da fissura de base (x=36, y=212 no viewBox 144×256 → ~25%, ~83%) */}
                            <svg
                                className="absolute animate-bounce"
                                style={{ bottom: '28px', left: '28px', width: '18px', height: '22px', animationDuration: '2s' }}
                                viewBox="0 0 18 22"
                                fill="none"
                            >
                                <path
                                    d="M9 0 C9 0 0 10 0 15 C0 19.4 4 22 9 22 C14 22 18 19.4 18 15 C18 10 9 0 9 0Z"
                                    fill="rgba(30,60,100,0.72)"
                                />
                                <ellipse cx="6" cy="13" rx="2" ry="3.5" fill="rgba(255,255,255,0.25)" />
                            </svg>

                            {damageLevel >= 2 && (
                                /* Gota 2 — nasce da fissura lateral direita (x=110,y=150 → ~76%, ~59%) */
                                <svg
                                    className="absolute animate-bounce"
                                    style={{ top: '144px', right: '24px', width: '15px', height: '19px', animationDuration: '1.5s' }}
                                    viewBox="0 0 18 22"
                                    fill="none"
                                >
                                    <path
                                        d="M9 0 C9 0 0 10 0 15 C0 19.4 4 22 9 22 C14 22 18 19.4 18 15 C18 10 9 0 9 0Z"
                                        fill="rgba(30,60,100,0.65)"
                                    />
                                    <ellipse cx="6" cy="13" rx="2" ry="3" fill="rgba(255,255,255,0.2)" />
                                </svg>
                            )}

                            {damageLevel >= 3 && (
                                /* Gota 3 — nasce do estilhaço superior (x=44,y=70 → ~31%, ~27%) */
                                <svg
                                    className="absolute animate-bounce"
                                    style={{ top: '72px', left: '32px', width: '14px', height: '17px', animationDuration: '2.8s' }}
                                    viewBox="0 0 18 22"
                                    fill="none"
                                >
                                    <path
                                        d="M9 0 C9 0 0 10 0 15 C0 19.4 4 22 9 22 C14 22 18 19.4 18 15 C18 10 9 0 9 0Z"
                                        fill="rgba(30,60,100,0.6)"
                                    />
                                    <ellipse cx="6" cy="13" rx="1.5" ry="2.5" fill="rgba(255,255,255,0.18)" />
                                </svg>
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
