"use client"

import { 
    Clock3, 
    TriangleAlert,
    OctagonAlert,
    PackageX,
    Eye,
    CheckCircle2,
    AlertCircle
} from 'lucide-react'

interface ShiftMetricsProps {
    overview: {
        total: number;
        completed: number;
        pending: number;
        late: number;
        critical: number;
        lossesCount: number;
        pendingIssuesCount: number;
        openCounts: number;
    }
}

function MetricItem({ label, value, icon: Icon, color, bg, isCritical }: { label: string, value: number, icon: any, color: string, bg: string, isCritical?: boolean }) {
    return (
        <div className={`flex items-center gap-3 p-4 rounded-3xl ${bg} border border-transparent transition-all ${isCritical && value > 0 ? 'border-red-100 shadow-sm' : ''}`}>
            <div className={`p-2 rounded-xl ${bg} ${color} border border-white/50 shadow-sm`}>
                <Icon className="w-4 h-4" />
            </div>
            <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className={`text-2xl font-black leading-none ${color}`}>{value}</p>
            </div>
        </div>
    )
}

export default function ShiftMetrics({ overview }: ShiftMetricsProps) {
    const hasAlerts = overview.late > 0 || overview.critical > 0 || overview.pendingIssuesCount > 0 || overview.openCounts > 0
    const isCriticalState = overview.late > 0 || overview.critical > 0

    const diagnosis = isCriticalState 
        ? { message: "Ação necessária agora.", status: "critical", color: "text-red-600", bg: "bg-red-50", icon: AlertCircle }
        : hasAlerts
        ? { message: "Existem pendências para revisar.", status: "attention", color: "text-amber-600", bg: "bg-amber-50", icon: Clock3 }
        : { message: "Operação sem alertas no momento.", status: "ok", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 }

    return (
        <div className="space-y-4">
            {/* Bloco de Diagnóstico */}
            <div className={`p-4 rounded-[2.5rem] border ${diagnosis.bg} border-transparent flex items-center justify-between`}>
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl ${diagnosis.bg} ${diagnosis.color} flex items-center justify-center border border-white/40 shadow-sm`}>
                        <diagnosis.icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Status do Turno</h4>
                        <p className={`text-sm font-black ${diagnosis.color}`}>{diagnosis.message}</p>
                    </div>
                </div>
                {hasAlerts && (
                    <button className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all ${isCriticalState ? 'bg-red-600' : 'bg-amber-500'}`}>
                        Resolver
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricItem 
                    label="Pendências" 
                    value={overview.pendingIssuesCount} 
                    icon={OctagonAlert} 
                    color={overview.pendingIssuesCount > 0 ? 'text-[#B13A2B]' : 'text-gray-400'} 
                    bg="bg-white" 
                    isCritical
                />
                <MetricItem 
                    label="Atrasados" 
                    value={overview.late} 
                    icon={TriangleAlert} 
                    color={overview.late > 0 ? 'text-red-600' : 'text-gray-400'} 
                    bg="bg-white" 
                    isCritical
                />
                <MetricItem 
                    label="Contagens" 
                    value={overview.openCounts} 
                    icon={Eye} 
                    color={overview.openCounts > 0 ? 'text-indigo-600' : 'text-gray-400'} 
                    bg="bg-white" 
                />
                <MetricItem 
                    label="Alertas" 
                    value={overview.critical} 
                    icon={AlertCircle} 
                    color={overview.critical > 0 ? 'text-red-600' : 'text-gray-400'} 
                    bg="bg-white" 
                    isCritical
                />
            </div>

            {/* Métricas secundárias (compacto) */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">Concluídos</span>
                    <span className="text-sm font-black text-gray-900">{overview.completed} / {overview.total}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">Perdas 24h</span>
                    <span className="text-sm font-black text-gray-900">{overview.lossesCount}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">Execução</span>
                    <span className="text-sm font-black text-gray-900">{overview.total > 0 ? Math.round((overview.completed / overview.total) * 100) : 0}%</span>
                </div>
            </div>
        </div>
    )
}
