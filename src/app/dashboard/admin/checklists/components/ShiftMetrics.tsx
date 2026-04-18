"use client"

import { 
    ClipboardList, 
    CheckCircle2, 
    Clock, 
    AlertTriangle,
    Zap
} from 'lucide-react'

interface ShiftMetricsProps {
    overview: {
        total: number;
        completed: number;
        pending: number;
        late: number;
        critical: number;
    }
}

export default function ShiftMetrics({ overview }: ShiftMetricsProps) {
    const cards = [
        {
            label: 'Total Geral',
            value: overview.total,
            icon: ClipboardList,
            color: 'bg-blue-50 text-blue-600',
            borderColor: 'border-blue-100'
        },
        {
            label: 'Concluídos',
            value: overview.completed,
            icon: CheckCircle2,
            color: 'bg-green-50 text-green-600',
            borderColor: 'border-green-100'
        },
        {
            label: 'Pendentes',
            value: overview.pending,
            icon: Clock,
            color: 'bg-amber-50 text-amber-600',
            borderColor: 'border-amber-100'
        },
        {
            label: 'Em Atraso',
            value: overview.late,
            icon: AlertTriangle,
            color: 'bg-red-50 text-red-600',
            borderColor: 'border-red-100'
        },
        {
            label: 'Críticos',
            value: overview.critical,
            icon: Zap,
            color: 'bg-purple-50 text-purple-600',
            borderColor: 'border-purple-100'
        }
    ]

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {cards.map((card, i) => (
                <div key={i} className={`bg-white border ${card.borderColor} p-4 rounded-3xl shadow-sm`}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-lg ${card.color}`}>
                            <card.icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">{card.label}</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{card.value}</p>
                </div>
            ))}
        </div>
    )
}
