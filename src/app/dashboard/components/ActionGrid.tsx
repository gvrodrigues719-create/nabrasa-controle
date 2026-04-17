'use client'

import React from 'react'
import { AlertTriangle, ListChecks, ClipboardList, ArrowRight, Eye } from 'lucide-react'
import Link from 'next/link'

interface Props {
    onReportLoss: () => void
    onViewLeaks: () => void
}

export default function ActionGrid({ onReportLoss, onViewLeaks }: Props) {
    const actions = [
        {
            title: 'Relatar Perda',
            icon: <AlertTriangle className="w-5 h-5" />,
            color: 'text-[#B13A2B]',
            bgColor: 'bg-[#FDF0EF]',
            onClick: onReportLoss
        },
        {
            title: 'Vazamentos',
            icon: <Eye className="w-5 h-5" />,
            color: 'text-[#8c716c]',
            bgColor: 'bg-white',
            border: true,
            onClick: onViewLeaks
        }
    ]

    return (
        <section>
             <p className="text-[11px] font-bold text-[#8c716c] uppercase tracking-widest mb-4 px-1">Ações Rápidas</p>
             <div className="grid grid-cols-2 gap-3">
                {actions.map((action, i) => (
                    <button
                        key={i}
                        onClick={action.onClick}
                        className={`flex flex-col items-start p-4 rounded-2xl transition-all active:scale-[0.98] text-left ${action.bgColor} ${action.border ? 'border border-[#e9e8e5]' : ''}`}
                    >
                        <div className={`${action.color} mb-3`}>
                            {action.icon}
                        </div>
                        <span className="font-bold text-[#1b1c1a] text-sm leading-tight">{action.title}</span>
                    </button>
                ))}
            </div>
        </section>
    )
}
