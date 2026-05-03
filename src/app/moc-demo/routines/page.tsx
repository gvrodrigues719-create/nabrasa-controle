
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useMocDemoStore } from '@/demo/use-moc-demo-store'
import DemoHeader from '../components/DemoHeader'
import DemoBottomNav from '../components/DemoBottomNav'
import { Package, ClipboardList, ChevronRight, Sparkles, Clock, Target } from 'lucide-react'

export default function DemoRoutinesPage() {
    const router = useRouter()
    const { activeUser } = useMocDemoStore()

    if (!activeUser) return null

    const routines = [
        {
            id: 'count',
            title: 'Contagem de Estoque',
            description: 'Rotina principal: registro de quantidades e identificação de perdas.',
            icon: Package,
            status: 'Ativo',
            color: 'bg-[#B13A2B]',
            url: '/moc-demo/routines/count',
            available: true
        },
        {
            id: 'checklist',
            title: 'Checklist Diário',
            description: 'Próxima rotina: verificação de processos e padrões de qualidade.',
            icon: ClipboardList,
            status: 'Preview',
            color: 'bg-blue-600',
            url: '/moc-demo/routines/checklist',
            available: true,
            badge: 'Próxima Rotina'
        }
    ]

    return (
        <div className="flex flex-col min-h-screen">
            <DemoHeader />
            
            <div className="flex-1 p-6 pb-24 overflow-y-auto space-y-8 animate-in fade-in duration-700">
                <header className="px-1">
                    <h3 className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4" /> Rotinas Operacionais
                    </h3>
                    <p className="text-xs text-[#8c716c] font-medium">Selecione o fluxo de trabalho para iniciar</p>
                </header>

                <div className="space-y-4">
                    {routines.map((routine) => (
                        <button
                            key={routine.id}
                            onClick={() => router.push(routine.url)}
                            className="w-full text-left bg-white rounded-[2.5rem] border border-[#eeedea] p-6 shadow-sm hover:border-[#B13A2B]/20 hover:shadow-lg transition-all group relative overflow-hidden"
                        >
                            {routine.badge && (
                                <div className="absolute top-4 right-4 bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-blue-100 flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5" /> {routine.badge}
                                </div>
                            )}

                            <div className="flex gap-5">
                                <div className={`w-14 h-14 rounded-3xl ${routine.color} flex items-center justify-center text-white shadow-lg shrink-0 group-hover:scale-110 transition-transform`}>
                                    <routine.icon className="w-7 h-7" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-lg font-black text-[#1b1c1a] tracking-tight">{routine.title}</h4>
                                    </div>
                                    <p className="text-xs text-[#58413e] leading-relaxed pr-4">
                                        {routine.description}
                                    </p>
                                    
                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${routine.id === 'count' ? 'bg-[#B13A2B]' : 'bg-blue-500'} animate-pulse`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                {routine.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[#B13A2B] group-hover:translate-x-1 transition-transform">
                                            <span className="text-[10px] font-black uppercase tracking-widest">Acessar</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Legend/Context */}
                <div className="p-5 rounded-3xl bg-[#F8F7F4] border border-[#eeedea]">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-4 h-4 text-[#8c716c]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c716c]">Como funciona</span>
                    </div>
                    <p className="text-[11px] text-[#8c716c] leading-relaxed">
                        As rotinas geram pontos para o ranking e impactam diretamente na eficiência da unidade. 
                        A **Contagem** é a rotina atual obrigatória, enquanto o **Checklist** está em fase de implantação.
                    </p>
                </div>
            </div>

            <DemoBottomNav />
        </div>
    )
}
