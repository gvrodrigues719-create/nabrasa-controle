"use client"

import { 
    ClipboardList, 
    CheckCircle2, 
    Clock, 
    AlertTriangle,
    Zap,
    ShieldCheck
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
    const percentOverall = overview.total > 0 
        ? Math.round((overview.completed / overview.total) * 100) 
        : 0

    const cards = [
        {
            label: 'Total',
            value: overview.total,
            icon: ClipboardList,
            color: 'text-gray-400',
            bg: 'bg-gray-50'
        },
        {
            label: 'Concluídos',
            value: overview.completed,
            icon: CheckCircle2,
            color: overview.completed === overview.total && overview.total > 0 ? 'text-green-600' : 'text-gray-900',
            bg: 'bg-gray-50'
        },
        {
            label: 'Pendentes',
            value: overview.pending,
            icon: Clock,
            color: 'text-gray-900',
            bg: 'bg-gray-50'
        },
        {
            label: 'Em Atraso',
            value: overview.late,
            icon: AlertTriangle,
            color: overview.late > 0 ? 'text-red-600' : 'text-gray-300',
            bg: overview.late > 0 ? 'bg-red-50' : 'bg-gray-50',
            isCritical: overview.late > 0
        },
        {
            label: 'Críticos',
            value: overview.critical,
            icon: Zap,
            color: overview.critical > 0 ? 'text-purple-600' : 'text-gray-300',
            bg: overview.critical > 0 ? 'bg-purple-50' : 'bg-gray-50',
            isCritical: overview.critical > 0
        }
    ]

    return (
        <div className="space-y-4">
            {/* Overall Progress Bar (Densificação) */}
            <div className="bg-white border border-gray-100 p-5 rounded-[2rem] shadow-sm flex items-center gap-6">
                <div className="flex-1">
                    <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progresso do Turno</span>
                            {percentOverall === 100 && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[8px] font-black uppercase">
                                    <ShieldCheck className="w-2.5 h-2.5" />
                                    100% OK
                                </div>
                            )}
                        </div>
                        <span className="text-xl font-black text-gray-900">{percentOverall}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-1000 ${percentOverall === 100 ? 'bg-green-500' : 'bg-gray-900'}`}
                            style={{ width: `${percentOverall}%` }}
                        />
                    </div>
                </div>
                <div className="w-px h-10 bg-gray-100" />
                <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Execução</p>
                    <p className="text-xl font-black text-gray-900">{overview.completed}/{overview.total}</p>
                </div>
            </div>

            {/* Grid de Métricas */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {cards.map((card, i) => (
                    <div key={i} className={`bg-white border border-gray-100 p-4 rounded-3xl shadow-sm transition-all ${card.isCritical ? 'ring-1 ring-red-100 shadow-md scale-[1.02]' : ''}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 rounded-lg ${card.bg} ${card.color}`}>
                                <card.icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter text-gray-400">{card.label}</span>
                        </div>
                        <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
