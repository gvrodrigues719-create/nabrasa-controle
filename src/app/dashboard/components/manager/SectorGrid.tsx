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

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {sectors.map((sector) => {
                const sectorData = sector.data || { total: 0, completed: 0, losses: 0 }
                const percent = sectorData.total > 0 
                    ? Math.round((sectorData.completed / sectorData.total) * 100) 
                    : 0
                
                const isComplete = percent === 100 && sectorData.total > 0
                const hasLosses = sectorData.losses > 0

                return (
                    <div key={sector.id} className="bg-white border border-gray-100 p-4 rounded-[2rem] shadow-sm hover:shadow-md transition-all flex flex-col group">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-10 h-10 rounded-xl ${sector.bg} ${sector.accent} flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-white`}>
                                <sector.icon className="w-5 h-5" />
                            </div>
                            <div className="text-right">
                                <p className={`text-lg font-black leading-none ${isComplete ? 'text-green-600' : 'text-gray-900'}`}>{percent}%</p>
                                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mt-1">{sector.name}</p>
                            </div>
                        </div>

                        {/* Progress Bar (Compacta) */}
                        <div className="w-full h-1 bg-gray-50 rounded-full mb-3 overflow-hidden">
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
                                <div className="flex items-center gap-1 text-red-600">
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
