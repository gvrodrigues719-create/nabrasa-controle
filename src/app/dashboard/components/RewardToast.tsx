'use client'

import React, { useEffect, useState } from 'react'
import { Sparkles, TrendingUp, CircleDollarSign, Ticket } from 'lucide-react'

export type RewardType = 'points' | 'coins' | 'ticket' | 'achievement'

interface Props {
    amount: string | number
    label: string
    type: RewardType
    onClose: () => void
}

export default function RewardToast({ amount, label, type, onClose }: Props) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        setIsVisible(true)
        const timer = setTimeout(() => {
            setIsVisible(false)
            setTimeout(onClose, 500) // Espera animação de saída
        }, 3000)

        return () => clearTimeout(timer)
    }, [onClose])

    const getIcon = () => {
        switch (type) {
            case 'points': return <TrendingUp className="w-5 h-5 text-indigo-500" />
            case 'coins': return <CircleDollarSign className="w-5 h-5 text-amber-500" />
            case 'ticket': return <Ticket className="w-5 h-5 text-emerald-500" />
            default: return <Sparkles className="w-5 h-5 text-[#B13A2B]" />
        }
    }

    const getBg = () => {
        switch (type) {
            case 'points': return 'border-indigo-100 bg-white/95 shadow-indigo-100'
            case 'coins': return 'border-amber-100 bg-white/95 shadow-amber-100'
            case 'ticket': return 'border-emerald-100 bg-white/95 shadow-emerald-100'
            default: return 'border-gray-100 bg-white/95 shadow-gray-100'
        }
    }

    return (
        <div 
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] transition-all duration-500 ease-out flex items-center gap-4 px-6 py-4 rounded-full border shadow-2xl backdrop-blur-md ${getBg()} ${
                isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-90'
            }`}
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center animate-bounce">
                    {getIcon()}
                </div>
                <div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-xl font-black text-gray-900 leading-none">
                            {typeof amount === 'number' && amount > 0 ? `+${amount}` : amount}
                        </span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {type === 'points' ? 'Pontos' : type === 'coins' ? 'CR' : type === 'ticket' ? 'Ticket Sorteio' : ''}
                        </span>
                    </div>
                    <p className="text-[11px] font-bold text-gray-500 leading-tight mt-0.5">{label}</p>
                </div>
            </div>

            {/* Micro-animação de partículas simples via CSS opcional aqui */}
        </div>
    )
}
