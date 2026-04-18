"use client"

import { ChefHat, GlassWater, Users, Package, AlertCircle } from 'lucide-react'

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
        { id: 'cozinha', name: 'Cozinha', icon: ChefHat, data: bySector.cozinha, color: 'text-orange-600', bg: 'bg-orange-50' },
        { id: 'bar', name: 'Bar', icon: GlassWater, data: bySector.bar, color: 'text-blue-600', bg: 'bg-blue-50' },
        { id: 'salao', name: 'Salão', icon: Users, data: bySector.salao, color: 'text-purple-600', bg: 'bg-purple-50' },
        { id: 'estoque', name: 'Estoque', icon: Package, data: bySector.estoque, color: 'text-emerald-600', bg: 'bg-emerald-50' }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sectors.map((sector) => {
                const percent = sector.data.total > 0 
                    ? Math.round((sector.data.completed / sector.data.total) * 100) 
                    : 0
                
                return (
                    <div key={sector.id} className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-2xl ${sector.bg} ${sector.color}`}>
                                    <sector.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-black text-gray-900 text-lg">{sector.name}</h4>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado por Setor</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-2xl font-black ${percent === 100 ? 'text-green-600' : 'text-gray-900'}`}>
                                    {percent}%
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-3 bg-gray-100 rounded-full mb-6 overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-1000 ${percent === 100 ? 'bg-green-500' : 'bg-[#B13A2B]'}`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">Tarefas</p>
                                <p className="font-black text-gray-900">{sector.data.completed}/{sector.data.total}</p>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">Pendentes</p>
                                <p className="font-black text-gray-900">{sector.data.total - sector.data.completed}</p>
                            </div>
                            <div className={`rounded-2xl p-3 border ${sector.data.losses > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                <p className={`text-[9px] font-black uppercase tracking-tighter mb-1 ${sector.data.losses > 0 ? 'text-red-400' : 'text-gray-400'}`}>Perdas</p>
                                <div className="flex items-center gap-1">
                                    <p className={`font-black ${sector.data.losses > 0 ? 'text-red-600' : 'text-gray-900'}`}>{sector.data.losses}</p>
                                    {sector.data.losses > 0 && <AlertCircle className="w-3 h-3 text-red-500" />}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
