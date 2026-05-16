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
    if (value === 0 && !isCritical) return null; // Hide non-critical zero metrics
    if (value === 0 && isCritical) return null; // Hide critical zero metrics too, as per user request "Não mostrar indicador zerado se ele não ajuda"
    
    return (
        <div className={`flex items-center gap-3 p-3 rounded-2xl ${bg} border border-transparent transition-all ${isCritical && value > 0 ? 'border-red-100 shadow-sm' : ''}`}>
            <div className={`p-2 rounded-xl ${bg} ${color} border border-white/50 shadow-sm`}>
                <Icon className="w-3.5 h-3.5" />
            </div>
            <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className={`text-xl font-black leading-none ${color}`}>{value}</p>
            </div>
        </div>
    )
}

export default function ShiftMetrics({ overview }: ShiftMetricsProps) {
    const totalAlerts = (overview.late || 0) + (overview.critical || 0) + (overview.pendingIssuesCount || 0)
    const hasAlerts = totalAlerts > 0 || overview.openCounts > 0
    const isCriticalState = (overview.late || 0) > 0 || (overview.critical || 0) > 0

    const diagnosis = isCriticalState 
        ? { 
            message: `Ação necessária agora. ${totalAlerts} alertas pendentes.`, 
            status: "critical", 
            color: "text-red-600", 
            bg: "bg-red-50", 
            icon: AlertCircle 
          }
        : hasAlerts
        ? { 
            message: totalAlerts > 0 
                ? `Existem ${totalAlerts} pendências para resolver hoje.` 
                : "Operação ativa com contagens em andamento.", 
            status: "attention", 
            color: "text-amber-600", 
            bg: "bg-amber-50", 
            icon: Clock3 
          }
        : { 
            message: "Operação sob controle.", 
            status: "ok", 
            color: "text-emerald-600", 
            bg: "bg-emerald-50", 
            icon: CheckCircle2 
          }

    return (
        <div className="space-y-3">
            {/* Bloco de Diagnóstico Prominente */}
            <div className={`p-5 rounded-[2rem] border-2 shadow-sm flex items-center justify-between transition-all ${
                isCriticalState ? 'bg-red-50 border-red-200' : 
                hasAlerts ? 'bg-amber-50 border-amber-200' : 
                'bg-emerald-50 border-emerald-200'
            }`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/40 shadow-inner shrink-0 ${
                        isCriticalState ? 'bg-red-100 text-red-600' : 
                        hasAlerts ? 'bg-amber-100 text-amber-600' : 
                        'bg-emerald-100 text-emerald-600'
                    }`}>
                        <diagnosis.icon className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Status da Unidade</h4>
                        <p className={`text-base font-black tracking-tight leading-tight ${diagnosis.color}`}>{diagnosis.message}</p>
                    </div>
                </div>
                {hasAlerts && (
                    <div className="hidden sm:block">
                         <button className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-sm active:scale-95 transition-all ${isCriticalState ? 'bg-red-600' : 'bg-amber-600'}`}>
                            Ver
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2">
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

            {/* Métricas secundárias (extremamente compactas) */}
            <div className="flex items-center justify-between px-2 pt-1">
                <div className="flex gap-4">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Concluídos</span>
                        <span className="text-xs font-black text-gray-900">{overview.completed}/{overview.total}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Perdas 24h</span>
                        <span className="text-xs font-black text-gray-900">{overview.lossesCount}</span>
                    </div>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Execução</span>
                    <span className="text-xs font-black text-gray-900">{overview.total > 0 ? Math.round((overview.completed / overview.total) * 100) : 0}%</span>
                </div>
            </div>
        </div>
    )
}
