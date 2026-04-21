"use client"

import { 
    ClipboardList, 
    CheckCircle2, 
    Clock3, 
    TriangleAlert,
    OctagonAlert,
    PackageX,
    ShieldCheck
} from 'lucide-react'

interface ShiftMetricsProps {
    overview: {
        total: number;
        completed: number;
        pending: number;
        late: number;
        critical: number;
        lossesCount: number;
    }
}

function MetricItem({ label, value, icon: Icon, color, bg, isCritical }: { label: string, value: number, icon: any, color: string, bg: string, isCritical?: boolean }) {
    return (
        <div className={`flex items-center gap-3 p-3 rounded-2xl ${bg} border border-transparent transition-all ${isCritical && value > 0 ? 'border-red-100 shadow-sm' : ''}`}>
            <div className={`p-1.5 rounded-lg ${bg} ${color}`}>
                <Icon className="w-3.5 h-3.5" />
            </div>
            <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className={`text-xl font-black leading-none ${color}`}>{value}</p>
            </div>
        </div>
    )
}

export default function ShiftMetrics({ overview }: ShiftMetricsProps) {
    const isClean = overview.late === 0 && overview.critical === 0

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bloco 1: Fluxo de Execução */}
            <div className="bg-white border border-gray-100 p-4 rounded-[2rem] shadow-sm grid grid-cols-2 xs:grid-cols-3 gap-2">
                <MetricItem 
                    label="Previstos" 
                    value={overview.total} 
                    icon={ClipboardList} 
                    color="text-gray-400" 
                    bg="bg-gray-50" 
                />
                <MetricItem 
                    label="Concluídos" 
                    value={overview.completed} 
                    icon={CheckCircle2} 
                    color={overview.completed === overview.total && overview.total > 0 ? 'text-green-600' : 'text-gray-900'} 
                    bg="bg-gray-50" 
                />
                <div className="col-span-2 xs:col-span-1">
                    <MetricItem 
                        label="Pendentes" 
                        value={overview.pending} 
                        icon={Clock3} 
                        color="text-gray-900" 
                        bg="bg-gray-50" 
                    />
                </div>
            </div>

            {/* Bloco 2: Foco de Intervenção */}
            <div className={`bg-white border p-4 rounded-[2rem] shadow-sm grid grid-cols-2 xs:grid-cols-3 gap-2 transition-colors ${isClean ? 'border-gray-100' : 'border-red-50 shadow-red-50/20'}`}>
                <MetricItem 
                    label="Atrasados" 
                    value={overview.late} 
                    icon={TriangleAlert} 
                    color={overview.late > 0 ? 'text-red-600' : 'text-gray-900/20'} 
                    bg={overview.late > 0 ? 'bg-red-50' : 'bg-gray-50/50'} 
                    isCritical
                />
                <MetricItem 
                    label="Críticos" 
                    value={overview.critical} 
                    icon={OctagonAlert} 
                    color={overview.critical > 0 ? 'text-purple-600' : 'text-gray-900/20'} 
                    bg={overview.critical > 0 ? 'bg-purple-50' : 'bg-gray-50/50'} 
                    isCritical
                />
                <div className="col-span-2 xs:col-span-1">
                    <MetricItem 
                        label="Perdas 24h" 
                        value={overview.lossesCount} 
                        icon={PackageX} 
                        color={overview.lossesCount > 0 ? 'text-orange-600' : 'text-gray-900/20'} 
                        bg={overview.lossesCount > 0 ? 'bg-orange-50' : 'bg-gray-50/50'} 
                    />
                </div>
            </div>
        </div>
    )
}
