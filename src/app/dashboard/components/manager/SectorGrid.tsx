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
        { id: 'salao', name: 'Salão', icon: Users, accent: 'text-purple-500', bg: 'bg-purple-50' },
        { id: 'estoque', name: 'Estoque', icon: Package, data: bySector.estoque, accent: 'text-emerald-500', bg: 'bg-emerald-50' }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sectors.map((sector) => {
                const sectorData = sector.data || { total: 0, completed: 0, losses: 0 }
                const percent = sectorData.total > 0 
                    ? Math.round((sectorData.completed / sectorData.total) * 100) 
                    : 0
                
                const isComplete = percent === 100 && sectorData.total > 0
                const hasLosses = sectorData.losses > 0

                return (
                    <div key={sector.id} className="bg-white border border-gray-100 p-5 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all flex flex-col group">
                        <div className="flex justify-between items-start mb-5">
                            <div className={`w-12 h-12 rounded-2xl ${sector.bg} ${sector.accent} flex items-center justify-center transition-transform group-hover:scale-110`}>
                                <sector.icon className="w-6 h-6" />
                            </div>
                            <div className="text-right">
                                <p className={`text-xl font-black ${isComplete ? 'text-green-600' : 'text-gray-900'}`}>{percent}%</p>
                                {isComplete ? (
                                    <span className="text-[8px] font-black text-green-600 uppercase tracking-widest">Concluído</span>
                                ) : (
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Em curso</span>
                                )}
                            </div>
                        </div>

                        <h4 className="font-black text-gray-900 text-sm mb-4 uppercase tracking-tight">{sector.name}</h4>

                        {/* Progress */}
                        <div className="w-full h-1.5 bg-gray-50 rounded-full mb-5 overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-1000 ${isComplete ? 'bg-green-500' : 'bg-gray-900'}`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-auto">
                            <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Check</p>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs font-black text-gray-900">{sectorData.completed}/{sectorData.total}</span>
                                    {isComplete && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                                </div>
                            </div>
                            <div className={`rounded-xl p-2.5 border transition-colors ${hasLosses ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${hasLosses ? 'text-red-400' : 'text-gray-400'}`}>Perdas</p>
                                <div className="flex items-center gap-1">
                                    <span className={`text-xs font-black ${hasLosses ? 'text-red-600' : 'text-gray-900'}`}>{sectorData.losses}</span>
                                    {hasLosses && <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
