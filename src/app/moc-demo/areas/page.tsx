
'use client'

import React from 'react'
import { useMocDemoStore } from '@/demo/use-moc-demo-store'
import DemoHeader from '../components/DemoHeader'
import DemoBottomNav from '../components/DemoBottomNav'
import { MapPin, Clock, AlertCircle, CheckCircle2, User, ChevronRight } from 'lucide-react'

export default function DemoAreasPage() {
    const { areas, users } = useMocDemoStore()

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            case 'pending': return 'text-amber-600 bg-amber-50 border-amber-100';
            case 'delayed': return 'text-red-600 bg-red-50 border-red-100';
            default: return 'text-gray-600 bg-gray-50 border-gray-100';
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="w-3.5 h-3.5" />;
            case 'pending': return <Clock className="w-3.5 h-3.5" />;
            case 'delayed': return <AlertCircle className="w-3.5 h-3.5" />;
            default: return null;
        }
    }

    return (
        <div className="flex flex-col min-h-screen">
            <DemoHeader />
            
            <div className="flex-1 p-6 pb-24 overflow-y-auto space-y-6 animate-in fade-in duration-700">
                <header className="px-1">
                    <h3 className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4" /> Diagnóstico das Áreas
                    </h3>
                    <p className="text-xs text-[#8c716c] font-medium">Situação operacional em tempo real por setor</p>
                </header>

                <div className="grid gap-4">
                    {areas.map((area) => {
                        const responsible = users.find(u => u.id === area.responsible_id)
                        const statusClass = getStatusColor(area.status)
                        
                        return (
                            <div 
                                key={area.id}
                                className="bg-white rounded-[2rem] border border-[#eeedea] p-5 shadow-sm space-y-4 hover:border-[#B13A2B]/10 transition-all group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-3">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                            area.status === 'delayed' ? 'bg-red-50 text-red-500' : 'bg-[#F8F7F4] text-[#8c716c]'
                                        }`}>
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-black text-[#1b1c1a] tracking-tight">{area.name}</h4>
                                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-tight mt-1 ${statusClass}`}>
                                                {getStatusIcon(area.status)}
                                                {area.status === 'completed' ? 'Concluído' : area.status === 'pending' ? 'Em andamento' : 'Atrasado'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-black text-[#1b1c1a]">{area.progress}%</div>
                                        <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Concluído</div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-2 bg-[#F8F7F4] rounded-full overflow-hidden border border-gray-50/50">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${
                                            area.status === 'completed' ? 'bg-emerald-500' :
                                            area.status === 'delayed' ? 'bg-red-500' : 'bg-[#B13A2B]'
                                        }`}
                                        style={{ width: `${area.progress}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                                            <User className="w-3 h-3 text-gray-300" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Responsável</p>
                                            <p className="text-[10px] font-bold text-[#58413e]">{responsible?.name || 'Não atribuído'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Última Atualização</p>
                                        <p className="text-[10px] font-bold text-[#8c716c]">{area.last_update}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <DemoBottomNav />
        </div>
    )
}
