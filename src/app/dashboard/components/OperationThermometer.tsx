'use client'

import React from 'react'
import { Zap, Eye, Activity, Package, Flame, Thermometer } from 'lucide-react'
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
    combinedTop3,
    onActionClick, 
    onViewGlobalClick 
}: Props) {
    
    // Temperatura = inversão do score — o eixo visual e o número agora compartilham o mesmo sentido
    // score 100 = temp 0 (frio = bom)
    // score  84 = temp 16 (levemente aquecida)
    // score  60 = temp 40 (atenção)
    // score  30 = temp 70 (crítico)
    const temperature = 100 - score

    const getStatusConfig = () => {
        // Baseado em TEMPERATURE (mercúrio sobe = alarme cresce — coerente com o visual)
        if (temperature <= 10) return {
            label: 'Sob controle',
            sublabel: 'Operação estável',
            color: 'text-emerald-700',
            dotColor: 'bg-emerald-500',
            pulse: false
        }
        if (temperature <= 25) return {
            label: 'Esquentando',
            sublabel: 'Atenção nos sinais',
            color: 'text-amber-700',
            dotColor: 'bg-amber-500',
            pulse: false
        }
        if (temperature <= 45) return {
            label: 'Atenção operacional',
            sublabel: 'Temperatura acima do normal',
            color: 'text-orange-700',
            dotColor: 'bg-orange-500',
            pulse: true
        }
        if (temperature <= 65) return {
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

    // Cor do mercúrio baseada em TEMPERATURE
    const getMercuryGradient = () => {
        if (temperature <= 10) return '#059669' // emerald-600
        if (temperature <= 25) return '#d97706' // amber-600
        if (temperature <= 45) return '#ea580c' // orange-600
        return '#dc2626' // red-600
    }

    // Cor do bulbo
    const getBulbColor = () => {
        if (temperature <= 10) return '#047857' // emerald-700
        if (temperature <= 25) return '#b45309' // amber-700
        if (temperature <= 45) return '#c2410c' // orange-700
        return '#b91c1c' // red-700
    }

    // Glow quente (só aparece quando o mercúrio está de fato alto)
    const getGlowIntensity = () => {
        if (temperature <= 10) return 0
        if (temperature <= 25) return 0.1
        if (temperature <= 45) return 0.28
        return 0.5
    }

    return (
        <div className="bg-white rounded-[40px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-[#e9e8e5] overflow-hidden relative">
            
            {/* Decoração superior — linha de calor sutil */}
            <div 
                className="absolute top-0 left-0 w-full h-1.5 transition-all duration-700"
                style={{ 
                    background: `linear-gradient(to right, transparent, ${getMercuryGradient()}33, transparent)`,
                    opacity: temperature > 10 ? 1 : 0.3
                }}
            />

            <div className="flex items-center gap-6">
                
                {/* ═══════════ TERMÔMETRO SVG ═══════════ */}
                <div className="relative shrink-0 flex items-center justify-center py-2">
                    <svg 
                        width="72" 
                        height="220" 
                        viewBox="0 0 72 220" 
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

                            {/* Sombra interna */}
                            <filter id="inner-shadow">
                                <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                                <feOffset dx="1" dy="1" in="blur" result="offset" />
                                <feComposite in="SourceGraphic" in2="offset" operator="over" />
                            </filter>
                        </defs>

                        {/* ─── GLOW DE CALOR (fundo, só quando quente) ─── */}
                        {temperature > 15 && (
                            <rect x="0" y="0" width="72" height="80" fill="url(#heat-glow)" />
                        )}

                        {/* ─── MARCAS LATERAIS DAS ZONAS ─── */}
                        {/* Zona Controlada */}
                        <line x1="50" y1="140" x2="56" y2="140" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" />
                        <text x="58" y="143" fill="#c0b3b1" fontSize="7" fontWeight="700" fontFamily="sans-serif">OK</text>
                        
                        {/* Zona Atenção */}
                        <line x1="50" y1="90" x2="56" y2="90" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" />
                        
                        {/* Zona Crítica */}
                        <line x1="50" y1="40" x2="56" y2="40" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" />

                        {/* Marcas intermediárias discretas */}
                        {[60, 75, 105, 120].map(y => (
                            <line key={y} x1="50" y1={y} x2="54" y2={y} stroke="#e5e7eb" strokeWidth="1" strokeLinecap="round" />
                        ))}

                        {/* ─── TUBO DE VIDRO (corpo do termômetro) ─── */}
                        <rect 
                            x="28" y="16" 
                            width="16" height="140" 
                            rx="8" 
                            fill="url(#tube-glass)"
                            stroke="#d4d0cb"
                            strokeWidth="1.5"
                        />

                        {/* Reflexo do vidro */}
                        <rect 
                            x="29" y="17" 
                            width="6" height="138" 
                            rx="3" 
                            fill="url(#tube-shine)"
                        />

                        {/* ─── MERCÚRIO (nível de temperatura) ─── */}
                        <g clipPath="url(#tube-clip)">
                            <rect 
                                x="28" 
                                y={156 - (temperature / 100) * 140}
                                width="16" 
                                height={(temperature / 100) * 140}
                                fill="url(#mercury-grad)"
                                className="transition-all duration-1000 ease-out"
                            />

                            {/* Menisco (curvatura no topo do mercúrio) */}
                            {temperature > 5 && (
                                <ellipse 
                                    cx="36" 
                                    cy={156 - (temperature / 100) * 140}
                                    rx="8" 
                                    ry="3"
                                    fill={getMercuryGradient()}
                                    opacity="0.7"
                                    className="transition-all duration-1000 ease-out"
                                />
                            )}

                            {/* Reflexo no mercúrio */}
                            <rect 
                                x="30" 
                                y={156 - (temperature / 100) * 140 + 4}
                                width="3" 
                                height={Math.max(0, (temperature / 100) * 140 - 8)}
                                rx="1.5"
                                fill="white"
                                opacity="0.2"
                                className="transition-all duration-1000 ease-out"
                            />
                        </g>

                        {/* ─── BULBO (base do termômetro) ─── */}
                        <circle 
                            cx="36" cy="176" r="22" 
                            fill="url(#tube-glass)"
                            stroke="#d4d0cb"
                            strokeWidth="1.5"
                        />
                        
                        {/* Mercúrio no bulbo (sempre preenchido) */}
                        <circle 
                            cx="36" cy="176" r="17" 
                            fill={getBulbColor()}
                        />

                        {/* Reflexo no bulbo */}
                        <ellipse 
                            cx="30" cy="170" 
                            rx="5" ry="7" 
                            fill="white" 
                            opacity="0.2" 
                        />

                        {/* Brilho sutil no bulbo */}
                        <circle 
                            cx="30" cy="170" r="3" 
                            fill="white" 
                            opacity="0.15" 
                        />

                        {/* ─── PULSAÇÃO DE CALOR (só quando quente) ─── */}
                        {temperature > 30 && (
                            <circle 
                                cx="36" cy="176" r="22" 
                                fill="none"
                                stroke={getMercuryGradient()}
                                strokeWidth="1"
                                opacity="0.3"
                                className="animate-ping"
                                style={{ animationDuration: '3s' }}
                            />
                        )}

                        {/* ─── ÍCONE DA CHAMA NABRASA (dentro do bulbo) ─── */}
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
                    {/* Título do bloco */}
                    <div className="flex items-center gap-2 mb-1.5">
                        <Thermometer className="w-3.5 h-3.5 text-[#8c716c]" />
                        <span className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em]">Temperatura da Operação</span>
                    </div>

                    {/* Status principal */}
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${status.dotColor} ${status.pulse ? 'animate-pulse' : ''}`} />
                        <span className={`text-[13px] font-black uppercase tracking-[0.15em] ${status.color}`}>
                            {status.label}
                        </span>
                    </div>
                    
                    {/* Temperatura como número principal — alinhado ao termômetro visual */}
                    <div className="flex items-baseline gap-2 mb-1">
                        <span 
                            className="text-6xl font-black text-[#1b1c1a] tracking-tighter leading-none" 
                            style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
                        >
                            {temperature}<span className="text-3xl opacity-15 ml-0.5">°</span>
                        </span>
                    </div>
                    {/* Sublabel discreto com saúde da operação */}
                    <p className="text-[10px] font-bold text-[#c0b3b1] uppercase tracking-widest mb-5">
                        {status.sublabel}
                    </p>

                    <div className="space-y-5">
                        {/* SINAIS ATIVOS */}
                        {activeLeaks.length > 0 && (
                            <div>
                                <h4 className="text-[11px] font-black text-[#B13A2B] uppercase tracking-widest mb-2.5 flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5" />
                                    Prioridade Agora
                                </h4>
                                <div className="space-y-1.5 pl-4 border-l-2 border-red-200">
                                    {activeLeaks.slice(0, 2).map(leak => (
                                        <p key={leak.id} className="text-[12px] font-extrabold text-[#1b1c1a]">{leak.label}</p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* PERDAS DA SEMANA */}
                        {weeklyLeaks.length > 0 && (
                            <div>
                                <h4 className="text-[11px] font-black text-[#8c716c] uppercase tracking-widest mb-2.5 flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5" />
                                    Perdas da semana
                                </h4>
                                <div className="space-y-1.5 pl-4 border-l-2 border-[#eeebe7]">
                                    {weeklyLeaks.slice(0, 2).map(leak => (
                                        <p key={leak.id} className="text-[12px] font-bold text-[#58413e]">{leak.label}</p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* OPERAÇÃO LIMPA */}
                        {!hasAnyIssue && (
                             <p className="text-sm text-[#8c716c] font-medium leading-relaxed italic pr-4">
                                Operação limpa nesta semana. Nenhum sinal de aquecimento.
                             </p>
                        )}
                        
                        {/* LINK AUDITAR */}
                        {hasAnyIssue && (
                            <button 
                                onClick={onViewGlobalClick}
                                className="inline-flex items-center gap-2 text-[11px] font-black text-[#B13A2B] uppercase tracking-[0.2em] border-b-2 border-transparent hover:border-[#B13A2B] transition-all pb-0.5"
                            >
                                <Eye className="w-4 h-4" />
                                <span>Auditar sinais</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* AÇÃO PRINCIPAL */}
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
