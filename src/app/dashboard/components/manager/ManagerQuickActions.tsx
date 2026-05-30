"use client"

import { 
    Clock, 
    ChevronRight,
    ShoppingCart,
    Eye,
    CalendarSearch,
} from 'lucide-react'

import Link from 'next/link'
import KitchenCard from '../KitchenCard'

interface ManagerQuickActionsProps {
    lateCount: number
    pendingOrdersCount?: number
    openCounts?: number
    userRole?: string | null
}

export default function ManagerQuickActions({ lateCount, pendingOrdersCount = 0, openCounts = 0, userRole }: ManagerQuickActionsProps) {
    return (
        <section>
            <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-6 bg-gray-900 rounded-full" />
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Ações Operacionais</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
                {/* 1. Abastecimento */}
                <Link 
                    href="/dashboard/purchases"
                    className="bg-white border border-gray-100 p-4 rounded-[1.5rem] shadow-sm hover:border-gray-900/10 transition-all flex items-center justify-between group active:scale-[0.98]"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[18px] bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform relative">
                            <ShoppingCart className="w-5 h-5" />
                            {pendingOrdersCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#B13A2B] text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">
                                    {pendingOrdersCount}
                                </span>
                            )}
                        </div>
                        <div className="text-left">
                            <span className="block text-[10px] font-black uppercase text-gray-900 leading-none mb-1">Abastecimento</span>
                            <span className="block text-sm font-bold text-gray-400">
                                {pendingOrdersCount > 0 ? `${pendingOrdersCount} pedidos ativos` : 'Pedidos e recebimentos'}
                            </span>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transition-colors" />
                </Link>

                {/* 2. Contagens ao Vivo */}
                <Link 
                    href="/dashboard/admin/history/sessions"
                    className="bg-white border border-gray-100 p-4 rounded-[1.5rem] shadow-sm hover:border-gray-900/10 transition-all flex items-center justify-between group active:scale-[0.98]"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[18px] bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform relative">
                            <Eye className="w-5 h-5" />
                            {openCounts > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">
                                    {openCounts}
                                </span>
                            )}
                        </div>
                        <div className="text-left">
                            <span className="block text-[10px] font-black uppercase text-gray-900 leading-none mb-1">Contagens abertas</span>
                            <span className="block text-sm font-bold text-gray-400">
                                {openCounts > 0 ? `${openCounts} setores em contagem` : 'Acompanhar inventário agora'}
                            </span>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transition-colors" />
                </Link>

                {/* 3. Histórico de Contagens */}
                <Link 
                    href="/dashboard/admin/counts/history"
                    className="bg-white border border-gray-100 p-4 rounded-[1.5rem] shadow-sm hover:border-gray-900/10 transition-all flex items-center justify-between group active:scale-[0.98]"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[18px] bg-slate-50 text-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <CalendarSearch className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <span className="block text-[10px] font-black uppercase text-gray-900 leading-none mb-1">Histórico de Contagens</span>
                            <span className="block text-sm font-bold text-gray-400">Relatórios e fechamentos</span>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transition-colors" />
                </Link>

                {/* 4. Checklists */}
                <Link 
                    href="/dashboard/admin/checklists?tab=operational"
                    className="bg-white border border-gray-100 p-4 rounded-[1.5rem] shadow-sm hover:border-gray-900/10 transition-all flex items-center justify-between group active:scale-[0.98]"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[18px] bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <span className="block text-[10px] font-black uppercase text-gray-900 leading-none mb-1">Checklists & Rotinas</span>
                            <span className="block text-sm font-bold text-gray-400">
                                {lateCount > 0 ? `${lateCount} tarefas atrasadas` : 'Verificar tarefas do dia'}
                            </span>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transition-colors" />
                </Link>

                {/* Cozinha Central — Apenas para Admin */}
                {userRole === 'admin' && (
                    <KitchenCard 
                        titleOverride="Cozinha Central"
                        descriptionOverride="Gerenciar envios e produção"
                    />
                )}
            </div>
        </section>
    )
}
