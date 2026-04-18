"use client"

import Link from 'next/link'
import { 
    Zap, 
    Clock, 
    UserPlus, 
    AlertCircle, 
    TrendingUp, 
    ShieldCheck, 
    Settings,
    ArrowRight
} from 'lucide-react'
import { runChecklistDistributionAction } from '@/app/actions/checklistAction'
import toast from 'react-hot-toast'
import { useState } from 'react'

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
        <section className="space-y-6">
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-6 bg-[#B13A2B] rounded-full" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Ações e Intervenção</h3>
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
                        <span className="text-[10px] font-black uppercase text-gray-900">Ver Atrasados</span>
                    </Link>
                </div>
            </div>

            {/* Ferramentas do Sistema */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-6 bg-gray-300 rounded-full" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Gestão do Sistema</h3>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                    <Link href="/dashboard/admin/cmv" className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:scale-[0.98] transition-all hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600"><TrendingUp className="w-4 h-4" /></div>
                            <span className="font-bold text-gray-900 text-sm">CMV & Compras</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300" />
                    </Link>

                    <Link href="/dashboard/admin/vendas" className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:scale-[0.98] transition-all hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600"><TrendingUp className="w-4 h-4" /></div>
                            <span className="font-bold text-gray-900 text-sm">Módulo de Vendas</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300" />
                    </Link>

                    <div className="grid grid-cols-2 gap-2.5">
                        <Link href="/dashboard/admin/reports" className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-gray-100 shadow-sm hover:bg-gray-50 transition-all">
                            <ShieldCheck className="w-4 h-4 text-[#B13A2B]" />
                            <span className="font-bold text-gray-900 text-xs">Auditoria</span>
                        </Link>
                        <Link href="/dashboard/admin" className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-gray-100 shadow-sm hover:bg-gray-50 transition-all">
                            <Settings className="w-4 h-4 text-gray-500" />
                            <span className="font-bold text-gray-900 text-xs">Ajustes</span>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
