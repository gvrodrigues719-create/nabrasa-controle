'use client'

import React from 'react'
import { Droplet, AlertTriangle, CheckCircle2, Zap } from 'lucide-react'
import { Leak } from '@/app/actions/efficiencyAction'

interface Props {
    score: number
    leaks: Leak[]
    onActionClick: () => void
}

export default function EfficiencyReservoir({ score, leaks, onActionClick }: Props) {
    // Definir cor baseada no score
    const getLevelColor = () => {
        if (score >= 90) return 'bg-[#2b58b1]' // Azul Profundo (Saudável)
        if (score >= 70) return 'bg-amber-500' // Alerta
        return 'bg-[#B13A2B]' // Crítico
    }

    const getStatusLabel = () => {
        if (score >= 90) return 'Operação Estanque'
        if (score >= 70) return 'Atenção Operacional'
        return 'Furo Crítico'
    }

    // Limitar vazamentos visíveis para o card não ficar gigante
    const visibleLeaks = leaks.slice(0, 3)
    const extraLeaks = leaks.length - 3

    return (
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e9e8e5]">
            <div className="flex items-start gap-6 mb-6">
                
                {/* REPRESENTAÇÃO VISUAL: O RESERVATÓRIO */}
                <div className="relative w-16 h-32 bg-[#F8F7F4] rounded-2xl border-2 border-[#eeedea] overflow-hidden flex flex-col justify-end">
                    {/* O Nível de Eficiência */}
                    <div 
                        className={`w-full transition-all duration-1000 ease-out ${getLevelColor()}`}
                        style={{ height: `${score}%` }}
                    />
                    
                    {/* Gotas de Vazamento (Side Indicators) */}
                    {leaks.length > 0 && (
                        <div className="absolute inset-0 flex flex-col justify-center items-end pr-1 gap-2">
                             {[...Array(Math.min(leaks.length, 4))].map((_, i) => (
                                <Droplet key={i} className="w-3 h-3 text-red-500/40 animate-bounce" />
                             ))}
                        </div>
                    )}

                    {/* Glass Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
                </div>

                {/* INFORMAÇÕES DE SAÚDE */}
                <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                         <div className={`w-2 h-2 rounded-full ${score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} />
                         <span className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest">{getStatusLabel()}</span>
                    </div>
                    
                    <div className="flex items-baseline gap-1 mb-3">
                        <span className="text-4xl font-black text-[#1b1c1a] tracking-tighter" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>{score}%</span>
                        <span className="text-xs font-bold text-[#8c716c] uppercase">Eficiência</span>
                    </div>

                    <p className="text-[11px] text-[#58413e] font-medium leading-relaxed">
                        {leaks.length === 0 
                            ? 'Sua operação está sólida e sem desvios detectados. Mantenha as rotinas em dia.' 
                            : `Detectamos ${leaks.length} ponto${leaks.length > 1 ? 's' : ''} de vazamento que estão drenando o resultado da casa.`
                        }
                    </p>
                </div>
            </div>

            {/* LISTA DE VAZAMENTOS (Resumida) */}
            {leaks.length > 0 && (
                <div className="space-y-2 mb-4">
                    {visibleLeaks.map(leak => (
                        <div key={leak.id} className="flex items-center justify-between bg-[#F8F7F4] p-3 rounded-2xl border border-[#eeedea]">
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg ${leak.severity === 'critical' ? 'bg-red-50' : 'bg-amber-50'}`}>
                                    <AlertTriangle className={`w-3.5 h-3.5 ${leak.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                                </div>
                                <span className="text-xs font-bold text-[#1b1c1a]">{leak.label}</span>
                            </div>
                            <span className="text-[10px] font-black text-red-500/60 uppercase tracking-tighter">-{leak.penalty}%</span>
                        </div>
                    ))}
                    {extraLeaks > 0 && (
                        <div className="px-4 py-1">
                             <p className="text-[10px] font-bold text-[#c0b3b1] uppercase tracking-widest">+ {extraLeaks} outros vazamentos</p>
                        </div>
                    )}
                </div>
            )}

            {/* BOTÃO DE AÇÃO PROATIVA */}
            <button 
                onClick={onActionClick}
                className="w-full bg-[#1b1c1a] hover:bg-black text-white font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl shadow-black/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Relatar Perda e Vedar Vazamento
            </button>
        </div>
    )
}
