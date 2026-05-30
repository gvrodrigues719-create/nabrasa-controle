'use client'

import React from 'react'
import { Zap, Eye, Activity, Package, Thermometer } from 'lucide-react'
import { Leak } from '@/app/actions/efficiencyAction'

interface Props {
    score: number
    activeLeaks: Leak[]
    weeklyLeaks: Leak[]
    combinedTop3: Leak[]
    onActionClick: () => void
    onViewGlobalClick?: () => void
}

export default function OperationThermometer({ 
    score, 
    activeLeaks, 
    weeklyLeaks, 
    onActionClick, 
    onViewGlobalClick 
}: Props) {
    
    // ═══════════════════════════════════════════════════
    // ESCALA DE TEMPERATURA REAL
    // ═══════════════════════════════════════════════════
    const MIN_TEMP = 30
    const MAX_TEMP = 95
    const displayTemp = Math.round(MIN_TEMP + ((100 - score) / 100) * (MAX_TEMP - MIN_TEMP))

    const getStatusConfig = () => {
        if (displayTemp <= 35) return {
            label: 'No ponto',
            sublabel: 'Operação estável',
            color: 'text-emerald-700',
            dotColor: 'bg-emerald-500',
            pulse: false
        }
        if (displayTemp <= 45) return {
            label: 'Esquentando',
            sublabel: 'Acima da faixa ideal',
            color: 'text-amber-700',
            dotColor: 'bg-amber-500',
            pulse: false
        }
        if (displayTemp <= 60) return {
            label: 'Atenção operacional',
            sublabel: 'Temperatura acima do normal',
            color: 'text-orange-700',
            dotColor: 'bg-orange-500',
            pulse: true
        }
        if (displayTemp <= 78) return {
            label: 'Fora do ponto',
            sublabel: 'Operação comprometida',
            color: 'text-red-600',
            dotColor: 'bg-red-500',
            pulse: true
        }
        return {
            label: 'Crítico',
            sublabel: 'Ação imediata necessária',
            color: 'text-red-700',
            dotColor: 'bg-red-600',
            pulse: true
        }
    }

    const status = getStatusConfig()
    const hasAnyIssue = activeLeaks.length > 0 || weeklyLeaks.length > 0

    // Cor baseada em displayTemp
    const getMercuryGradient = () => {
        if (displayTemp <= 35) return '#059669' // emerald-600
        if (displayTemp <= 45) return '#d97706' // amber-600
        if (displayTemp <= 60) return '#ea580c' // orange-600
        return '#dc2626' // red-600
    }

    const getBulbColor = () => {
        if (displayTemp <= 35) return '#047857'
        if (displayTemp <= 45) return '#b45309'
        if (displayTemp <= 60) return '#c2410c'
        return '#b91c1c'
    }

    const getGlowIntensity = () => {
        if (displayTemp <= 35) return 0
        if (displayTemp <= 45) return 0.1
        if (displayTemp <= 60) return 0.28
        return 0.5
    }

    // Altura do mercúrio no tubo
    const TUBE_HEIGHT = 140
    const VISUAL_MIN = 0.30
    const mercuryFill = VISUAL_MIN + ((displayTemp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)) * (1 - VISUAL_MIN)
    const mercuryHeight = Math.round(mercuryFill * TUBE_HEIGHT)
    const mercuryY = 16 + TUBE_HEIGHT - mercuryHeight

    return (
        <div className="bg-white rounded-[40px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-[#e9e8e5] overflow-hidden relative">
            
            {/* Decoração superior — linha de calor sutil */}
            <div 
                className="absolute top-0 left-0 w-full h-1.5 transition-all duration-700"
                style={{ 
                    background: `linear-gradient(to right, transparent, ${getMercuryGradient()}33, transparent)`,
                    opacity: mercuryFill > 0.05 ? 1 : 0.3
                }}
            />

            <div className="flex items-center gap-6">
                
                {/* ═══════════ TERMÔMETRO SVG ═══════════ */}
                <div className="relative shrink-0 flex items-center justify-center py-2">
                    <svg 
                        width="108" 
                        height="220" 
                        viewBox="0 0 108 220" 
                        fill="none"
                        className="drop-shadow-lg"
                    >
                        <defs>
                            {/* Gradiente do mercúrio */}
                            <linearGradient id="mercury-grad" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor={getBulbColor()} />
                                <stop offset="60%" stopColor={getMercuryGradient()} />
                                <stop offset="100%" stopColor={getMercuryGradient()} stopOpacity="0.9" />
                            </linearGradient>

                            {/* Gradiente do tubo de vidro */}
                            <linearGradient id="tube-glass" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#e8e6e1" />
                                <stop offset="50%" stopColor="#f5f4f1" />
                                <stop offset="100%" stopColor="#dcdad6" />
                            </linearGradient>

                            {/* Reflexo do vidro */}
                            <linearGradient id="tube-shine" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="white" stopOpacity="0.5" />
                                <stop offset="30%" stopColor="white" stopOpacity="0.1" />
                                <stop offset="100%" stopColor="white" stopOpacity="0" />
                            </linearGradient>

                            {/* Glow quente no topo */}
                            <radialGradient id="heat-glow" cx="0.5" cy="0" r="0.6">
                                <stop offset="0%" stopColor={getMercuryGradient()} stopOpacity={getGlowIntensity()} />
                                <stop offset="100%" stopColor={getMercuryGradient()} stopOpacity="0" />
                            </radialGradient>

                            {/* Clip para o mercúrio dentro do tubo */}
                            <clipPath id="tube-clip">
                                <rect x="28" y="16" width="16" height="140" rx="8" />
                            </clipPath>
                        </defs>

                        {/* ─── GLOW DE CALOR (fundo, só quando quente com respiração sutil) ─── */}
                        {mercuryFill > 0.55 && (
                            <rect x="0" y="0" width="108" height="80" fill="url(#heat-glow)" className="animate-pulse" style={{ animationDuration: '4s' }} />
                        )}

                        {/* ─── MARCAS LATERAIS DA ESCALA ─── */}
                        {/* Marca IDEAL */}
                        <line x1="48" y1="114" x2="58" y2="114" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />
                        <text x="61" y="117" fill="#059669" fontSize="7" fontWeight="800" fontFamily="sans-serif">IDEAL</text>

                        {/* Marca MAX */}
                        <line x1="48" y1="22" x2="58" y2="22" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" />
                        <text x="61" y="25" fill="#fca5a5" fontSize="7" fontWeight="800" fontFamily="sans-serif">MAX</text>

                        {/* Marcas de graduação */}
                        {[55, 75, 95].map(y => (
                            <line key={y} x1="48" y1={y} x2="54" y2={y} stroke="#e5e7eb" strokeWidth="1" strokeLinecap="round" />
                        ))}

                        {/* ─── TUBO DE VIDRO ─── */}
                        <rect 
                            x="28" y="16" 
                            width="16" height="140" 
                            rx="8" 
                            fill="url(#tube-glass)"
                            stroke="#d4d0cb"
                            strokeWidth="1.5"
                        />
                        <rect x="29" y="17" width="6" height="138" rx="3" fill="url(#tube-shine)" />

                        {/* ─── MERCÚRIO (nível de temperatura) ─── */}
                        <g clipPath="url(#tube-clip)">
                            <rect 
                                x="28" 
                                y={mercuryY}
                                width="16" 
                                height={mercuryHeight}
                                fill="url(#mercury-grad)"
                                className="transition-all duration-1000 ease-out"
                            />

                            {/* Menisco (curvatura sutil pulsando se acima da meta) */}
                            {mercuryHeight > 4 && (
                                <ellipse 
                                    cx="36" 
                                    cy={mercuryY}
                                    rx="8" 
                                    ry="3"
                                    fill={getMercuryGradient()}
                                    opacity="0.8"
                                    className={`transition-all duration-1000 ease-out ${displayTemp > 45 ? 'animate-pulse' : ''}`}
                                    style={{ animationDuration: '2s' }}
                                />
                            )}

                            {/* Reflexo no mercúrio */}
                            <rect 
                                x="30" 
                                y={mercuryY + 4}
                                width="3" 
                                height={Math.max(0, mercuryHeight - 8)}
                                rx="1.5"
                                fill="white"
                                opacity="0.2"
                                className="transition-all duration-1000 ease-out"
                            />
                        </g>

                        {/* ─── BULBO ─── */}
                        <circle cx="36" cy="176" r="22" fill="url(#tube-glass)" stroke="#d4d0cb" strokeWidth="1.5" />
                        <circle cx="36" cy="176" r="17" fill={getBulbColor()} />
                        <ellipse cx="30" cy="170" rx="5" ry="7" fill="white" opacity="0.2" />
                        <circle cx="30" cy="170" r="3" fill="white" opacity="0.15" />

                        {/* ─── ÍCONE DA OPERAÇÃO ─── */}
                        <g transform="translate(29, 169) scale(0.6)" opacity="0.6">
                            <path 
                                d="M10 0 C10 0 0 8 0 14 C0 18.4 4 22 10 22 C16 22 20 18.4 20 14 C20 8 10 0 10 0Z" 
                                fill="white" 
                                opacity="0.4"
                            />
                        </g>
                    </svg>
                </div>

                {/* ═══════════ CONTEÚDO E MÉTRICAS ═══════════ */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <Thermometer className="w-3.5 h-3.5 text-[#8c716c]" />
                        <span className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em]">Temperatura da Operação</span>
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${status.dotColor} ${status.pulse ? 'animate-pulse' : ''}`} />
                        <span className={`text-[13px] font-black uppercase tracking-[0.15em] ${status.color}`}>
                            {status.label}
                        </span>
                    </div>
                    
                    <div className="flex items-baseline gap-1 mb-1">
                        <span 
                            className="text-6xl font-black text-[#1b1c1a] tracking-tighter leading-none" 
                            style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
                        >
                            {displayTemp}
                        </span>
                        <span className="text-2xl font-black text-[#1b1c1a] opacity-50 self-start mt-2">°C</span>
                    </div>
                    <p className="text-[10px] font-bold text-[#c0b3b1] uppercase tracking-widest mb-5">
                        {status.sublabel} · meta: 30°C
                    </p>

                    <div className="space-y-4">
                        {activeLeaks.length > 0 && (
                            <div>
                                <h4 className="text-[10px] font-black text-[#B13A2B] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Activity className="w-3 h-3" />
                                    Sinais ativos agora
                                </h4>
                                <div className="space-y-1 pl-3 border-l-2 border-[#fca5a5]">
                                    {activeLeaks.slice(0, 2).map(leak => (
                                        <p key={leak.id} className="text-[12px] font-bold text-[#1b1c1a]">{leak.label}</p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {weeklyLeaks.length > 0 && (
                            <div>
                                <h4 className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Package className="w-3 h-3" />
                                    Perdas da semana
                                </h4>
                                <div className="space-y-1 pl-3 border-l-2 border-[#e9e8e5]">
                                    {weeklyLeaks.slice(0, 3).map(leak => (
                                        <p key={leak.id} className="text-[12px] font-medium text-[#58413e]">{leak.label}</p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!hasAnyIssue && (
                             <p className="text-[12px] text-[#8c716c] font-medium leading-relaxed bg-[#F8F7F4] p-3 rounded-xl border border-[#e9e8e5]">
                                Operação estabilizada. Todos os padrões atingidos nesta semana.
                             </p>
                        )}
                        
                        {hasAnyIssue && onViewGlobalClick && (
                            <div className="pt-1">
                                <button 
                                    onClick={onViewGlobalClick}
                                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#8c716c] hover:text-[#58413e] uppercase tracking-widest transition-colors cursor-pointer"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Ver detalhes da semana</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-center">
                <button 
                    onClick={onActionClick}
                    className="group relative inline-flex items-center gap-3 bg-[#1b1c1a] hover:bg-black text-white px-8 py-3.5 rounded-2xl shadow-xl active:scale-[0.98] transition-all cursor-pointer"
                >
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400 group-hover:scale-125 transition-transform" />
                    <span className="font-black text-[11px] uppercase tracking-[0.2em]">Relatar Perda</span>
                    <div className="absolute inset-0 rounded-2xl border border-white/10 group-hover:border-white/20 pointer-events-none" />
                </button>
            </div>
        </div>
    )
}
