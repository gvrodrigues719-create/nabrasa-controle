'use client'

import React from 'react'
import { Droplet, AlertTriangle, Zap } from 'lucide-react'
import { Leak } from '@/app/actions/efficiencyAction'

interface Props {
    score: number
    leaks: Leak[]
    onActionClick: () => void
}

export default function EfficiencyReservoir({ score, leaks, onActionClick }: Props) {
    // Definir cor baseada no score com gradientes premium
    const getLevelGradient = () => {
        if (score >= 90) return 'from-blue-600 to-blue-400' // Saudável (Água Limpa)
        if (score >= 70) return 'from-amber-600 to-amber-400' // Alerta
        return 'from-red-700 to-red-500' // Crítico
    }

    const getStatusLabel = () => {
        if (score >= 90) return 'Operação Estanque'
        if (score >= 70) return 'Atenção Operacional'
        return 'Vazamento Crítico'
    }

    const visibleLeaks = leaks.slice(0, 3)
    const extraLeaks = leaks.length - 3

    return (
        <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e9e8e5]">
            <div className="flex items-center gap-8 mb-8">
                
                {/* REPRESENTAÇÃO VISUAL: O RESERVATÓRIO (Peça Central) */}
                <div className="relative group">
                    {/* Borda do Copo (Realismo Sóbrio) */}
                    <div className="relative w-24 h-40 bg-[#F8F7F4]/50 rounded-b-3xl rounded-t-lg border-[3px] border-[#e2e1de] shadow-inner overflow-hidden flex flex-col justify-end">
                        
                        {/* Efeito de Reflexo de Vidro */}
                        <div className="absolute top-0 left-2 w-1.5 h-full bg-white/20 blur-[1px] pointer-events-none z-20" />
                        
                        {/* O Nível de Líquido (A Água) */}
                        <div 
                            className={`w-full bg-gradient-to-t transition-all duration-1000 ease-out relative z-10 ${getLevelGradient()}`}
                            style={{ height: `${score}%` }}
                        >
                            {/* Superfície da Água (Linha de Tensão) */}
                            {score > 0 && (
                                <div className="absolute top-0 left-0 w-full h-[3px] bg-white/40 shadow-[0_-2px_10px_rgba(255,255,255,0.5)]" />
                            )}
                            
                            {/* Efeito de Ondulação Suave (Opacidade) */}
                            <div className="absolute inset-0 bg-white/5 opacity-20" />
                        </div>

                        {/* Fundo do Reservatório (Depth) */}
                        <div className="absolute bottom-0 left-0 w-full h-2 bg-black/5 blur-[2px] z-20" />
                    </div>

                    {/* Vazamentos (Gotas Laterais que saltam aos olhos) */}
                    {leaks.length > 0 && (
                        <div className="absolute -right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30">
                             {[...Array(Math.min(leaks.length, 3))].map((_, i) => (
                                <Droplet 
                                    key={i} 
                                    className={`w-5 h-5 drop-shadow-md animate-bounce`} 
                                    style={{ 
                                        animationDelay: `${i * 0.2}s`,
                                        color: score < 70 ? '#ef4444' : '#f59e0b'
                                    }} 
                                    fill="currentColor"
                                />
                             ))}
                        </div>
                    )}
                </div>

                {/* INFORMAÇÕES DE SAÚDE (Hierarquia Secundária) */}
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

                    <div className="space-y-3">
                        {visibleLeaks.length > 0 ? (
                            <div className="space-y-1.5">
                                {visibleLeaks.map(leak => (
                                    <div key={leak.id} className="flex items-center gap-2">
                                        <AlertTriangle className={`w-3 h-3 ${leak.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                                        <span className="text-[10px] font-bold text-[#58413e] truncate">{leak.label}</span>
                                    </div>
                                ))}
                                {extraLeaks > 0 && (
                                    <p className="text-[9px] font-black text-[#c0b3b1] uppercase tracking-widest pl-5">+ {extraLeaks} vazamentos</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-[11px] text-[#8c716c] font-medium leading-relaxed italic">
                                Sua operação está sólida. Nenhum vazamento detectado no momento.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* BOTÃO DE AÇÃO (Sóbrio, sem roubar a cena) */}
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
