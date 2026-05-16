"use client"

import { 
    Clock, 
    ChevronRight,
    ShoppingCart,
} from 'lucide-react'

import Link from 'next/link'
import KitchenCard from '../KitchenCard'

interface ManagerQuickActionsProps {
    lateCount: number
    pendingOrdersCount?: number
    userRole?: string | null
}

export default function ManagerQuickActions({ lateCount, pendingOrdersCount = 0, userRole }: ManagerQuickActionsProps) {
    const lateText = lateCount > 0
        ? `${lateCount} ${lateCount === 1 ? 'tarefa exige' : 'tarefas exigem'} ação agora`
        : "Nenhuma tarefa atrasada"

    return (
        <section>
            <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-6 bg-gray-900 rounded-full" />
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Ações Rápidas</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
                {/* Compras & Abastecimento */}
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
                                {pendingOrdersCount > 0
                                    ? `Revisar ${pendingOrdersCount} pedidos ativos`
                                    : 'Gerenciar pedidos da loja'}
                            </span>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transition-colors" />
                </Link>

                {/* Gerenciar Atrasos */}
                <Link 
                    href="/dashboard/admin/checklists?tab=operational"
                    className="bg-white border border-gray-100 p-4 rounded-[1.5rem] shadow-sm hover:border-gray-900/10 transition-all flex items-center justify-between group active:scale-[0.98]"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[18px] bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <span className="block text-[10px] font-black uppercase text-gray-900 leading-none mb-1">Checklists</span>
                            <span className="block text-sm font-bold text-gray-400">
                                {lateCount > 0 ? `Fechar ${lateCount} pendências do turno` : 'Verificar tarefas do dia'}
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
