"use client"

import { 
    Zap, 
    Clock, 
} from 'lucide-react'
import { runChecklistDistributionAction } from '@/app/actions/checklistAction'
import toast from 'react-hot-toast'
import { useState } from 'react'
import Link from 'next/link'

interface ManagerQuickActionsProps {
    lateCount: number;
    pendingRulesCount: number;
}

export default function ManagerQuickActions({ lateCount, pendingRulesCount }: ManagerQuickActionsProps) {
    const [isRunning, setIsRunning] = useState(false)

    const handleRunDistribution = async () => {
        setIsRunning(true)
        const res = await runChecklistDistributionAction()
        if (res.success) {
            toast.success(`Distribuição concluída: ${res.count} checklists gerados!`)
        } else {
            toast.error("Erro na distribuição.")
        }
        setIsRunning(false)
    }

    const attributionText = pendingRulesCount > 0 
        ? `${pendingRulesCount} ${pendingRulesCount === 1 ? 'regra pendente' : 'regras pendentes'}`
        : "tudo distribuído hoje"

    const lateText = lateCount > 0
        ? `${lateCount} ${lateCount === 1 ? 'checklist' : 'checklists'} em atraso`
        : "sem atrasos no momento"

    return (
        <section>
            <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-6 bg-gray-900 rounded-full" />
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Intervenção Operacional</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button 
                    onClick={handleRunDistribution}
                    disabled={isRunning}
                    className="bg-white border border-gray-100 p-5 rounded-[2rem] shadow-sm hover:border-gray-900/10 transition-all flex items-center justify-between group active:scale-[0.98]"
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl bg-red-50 text-[#B13A2B] flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <Zap className={`w-5 h-5 ${isRunning ? 'animate-pulse' : ''}`} />
                        </div>
                        <div className="text-left">
                            <span className="block text-[10px] font-black uppercase text-gray-900 leading-none mb-1">Rodar Atribuição</span>
                            <span className="block text-[11px] font-bold text-gray-400 lowercase">{attributionText}</span>
                        </div>
                    </div>
                </button>

                <Link 
                    href="/dashboard/admin/checklists?tab=operational"
                    className="bg-white border border-gray-100 p-5 rounded-[2rem] shadow-sm hover:border-gray-900/10 transition-all flex items-center justify-between group active:scale-[0.98]"
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <span className="block text-[10px] font-black uppercase text-gray-900 leading-none mb-1">Gerenciar Atrasos</span>
                            <span className="block text-[11px] font-bold text-gray-400 lowercase">{lateText}</span>
                        </div>
                    </div>
                </Link>
            </div>
        </section>
    )
}
