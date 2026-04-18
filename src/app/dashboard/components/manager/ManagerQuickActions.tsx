"use client"

import { 
    Zap, 
    Clock, 
} from 'lucide-react'
import { runChecklistDistributionAction } from '@/app/actions/checklistAction'
import toast from 'react-hot-toast'
import { useState } from 'react'
import Link from 'next/link'

export default function ManagerQuickActions() {
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

    return (
        <section>
            <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-6 bg-[#B13A2B] rounded-full" />
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Intervenção Imediata</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={handleRunDistribution}
                    disabled={isRunning}
                    className="bg-white border border-gray-100 p-4 rounded-3xl shadow-sm hover:border-[#B13A2B]/40 transition-all flex flex-col items-center text-center group"
                >
                    <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#B13A2B] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Zap className={`w-5 h-5 ${isRunning ? 'animate-pulse' : ''}`} />
                    </div>
                    <span className="text-[10px] font-black uppercase text-gray-900">Rodar Atribuição</span>
                </button>

                <Link 
                    href="/dashboard/admin/checklists?tab=operational"
                    className="bg-white border border-gray-100 p-4 rounded-3xl shadow-sm hover:border-[#B13A2B]/40 transition-all flex flex-col items-center text-center group"
                >
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Clock className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-gray-900">Gerenciar Atrasos</span>
                </Link>
            </div>
        </section>
    )
}
