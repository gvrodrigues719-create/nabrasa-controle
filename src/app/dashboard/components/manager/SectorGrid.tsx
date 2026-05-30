"use client"

import { ChefHat, GlassWater, Users, Package, AlertCircle, CheckCircle2 } from 'lucide-react'

interface SectorData {
    total: number;
    completed: number;
    losses: number;
}

interface SectorGridProps {
    bySector: {
        cozinha: SectorData;
        bar: SectorData;
        salao: SectorData;
        estoque: SectorData;
    }
}

export default function SectorGrid({ bySector }: SectorGridProps) {
    const sectors = [
        { id: 'cozinha', name: 'Cozinha', icon: ChefHat, data: bySector.cozinha, accent: 'text-orange-500', bg: 'bg-orange-50' },
        { id: 'bar', name: 'Bar', icon: GlassWater, data: bySector.bar, accent: 'text-blue-500', bg: 'bg-blue-50' },
        { id: 'salao', name: 'Salão', icon: Users, data: bySector.salao, accent: 'text-purple-500', bg: 'bg-purple-50' },
        { id: 'estoque', name: 'Estoque', icon: Package, data: bySector.estoque, accent: 'text-emerald-500', bg: 'bg-emerald-50' }
    ]

    // Check if there is any real activity
    const hasActivity = sectors.some(s => (s.data?.total || 0) > 0)

    if (!hasActivity) {
        return (
            <div className="p-8 bg-gray-50/50 border border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Nenhuma rotina ativa por área no momento</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {sectors.map((sector) => {
                const sectorData = sector.data || { total: 0, completed: 0, losses: 0 }
                const percent = sectorData.total > 0 
                    ? Math.round((sectorData.completed / sectorData.total) * 100) 
                    : 0
                
                if (sectorData.total === 0) return null // Hide empty individual sectors if some others have data
                
                const isComplete = percent === 100 && sectorData.total > 0
                const hasLosses = sectorData.losses > 0

        return (
                    <div key={sector.id} className={`p-4 rounded-[1.5rem] transition-all flex flex-col group border shadow-sm hover:shadow-md ${
                        hasLosses && sectorData.losses > 5
                            ? 'bg-red-50/50 border-red-200 shadow-red-100/20'
                            : hasLosses
                            ? 'bg-orange-50/50 border-orange-100'
                            : 'bg-white border-gray-100'
                    }`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-8 h-8 rounded-xl ${hasLosses ? 'bg-white shadow-sm' : sector.bg} ${sector.accent} flex items-center justify-center transition-transform group-hover:scale-110 border border-white`}>
                                <sector.icon className="w-4 h-4" />
                            </div>
                            <div className="text-right">
                                <p className={`text-base font-black leading-none ${isComplete ? 'text-green-600' : 'text-gray-900'}`}>{percent}%</p>
                                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mt-1">{sector.name}</p>
                            </div>
                        </div>

                        {/* Progress Bar (Compacta) */}
                        <div className="w-full h-1 bg-gray-200/50 rounded-full mb-3 overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-1000 ${isComplete ? 'bg-green-500' : 'bg-gray-900'}`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 gray-500">
                                <span className="text-[10px] font-black text-gray-900">{sectorData.completed}/{sectorData.total}</span>
                                {isComplete && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                            </div>
                            {hasLosses && (
                                <div className={`flex items-center gap-1 ${sectorData.losses > 5 ? 'text-red-600' : 'text-orange-600'}`}>
                                    <AlertCircle className="w-3 h-3 animate-pulse" />
                                    <span className="text-[10px] font-black">{sectorData.losses}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
