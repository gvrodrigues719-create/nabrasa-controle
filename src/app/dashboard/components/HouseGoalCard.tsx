'use client'

import React from 'react'
import { Target, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Props {
    current: number
    target: number
    status: 'good' | 'warning' | 'critical'
    message: string
}

export default function HouseGoalCard({ current, target, status, message }: Props) {
    const formatPerc = (val: number) => (val * 100).toFixed(1) + '%'

    const config = {
        good: {
            icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-100',
            textColor: 'text-emerald-700',
            label: 'Dentro da Meta',
            supportText: 'Estamos dentro da meta da casa'
        },
        warning: {
            icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-100',
            textColor: 'text-amber-700',
            label: 'Fora da Meta',
            supportText: 'Estamos acima da meta da casa'
        },
        critical: {
            icon: <AlertCircle className="w-5 h-5 text-red-500" />,
            bgColor: 'bg-red-50',
            borderColor: 'border-red-100',
            textColor: 'text-red-700',
            label: 'Fora da Meta',
            supportText: 'Estamos acima da meta da casa'
        }
    }

    const { icon, bgColor, borderColor, textColor, label, supportText } = config[status]

    const hasData = current > 0

    return (
        <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e9e8e5]">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-[#8c716c]">
                    <Target className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Meta da Casa</span>
                </div>
                <div className={`${bgColor} ${textColor} ${borderColor} border px-3 py-1 rounded-full flex items-center gap-1.5`}>
                    {icon}
                    <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <p className="text-[10px] font-bold text-[#8c716c] uppercase tracking-widest mb-1">Meta da Casa</p>
                    <span className="text-3xl font-black text-[#1b1c1a] tracking-tight">{formatPerc(target)}</span>
                </div>
                <div className="border-l border-[#eeedea] pl-4">
                    <p className="text-[10px] font-bold text-[#8c716c] uppercase tracking-widest mb-1">CMV Atual</p>
                    <span className={`text-2xl font-black tracking-tight ${hasData ? 'text-[#8c716c] opacity-80' : 'text-[#c0b3b1] text-lg'}`}>
                        {hasData ? formatPerc(current) : 'Sem leitura'}
                    </span>
                </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[#F8F7F4] rounded-2xl border border-[#eeedea]">
                <TrendingDown className={`w-4 h-4 mt-0.5 ${textColor}`} />
                <p className="text-sm text-[#58413e] font-medium leading-relaxed">
                    {hasData ? supportText : 'Aguardando dados da operação para comparação.'}
                </p>
            </div>
        </div>
    )
}
