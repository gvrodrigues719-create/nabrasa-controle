'use client'

import { useRouter } from 'next/navigation'
import { LayoutGrid, Package, CalendarSync, History, TrendingUp } from 'lucide-react'

export default function AdminHome() {
    const router = useRouter()
    return (
        <div className="p-4 space-y-2">

            {/* ── MÓDULOS DE ESTOQUE / OPERAÇÃO ──────────────────── */}
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-1 mb-3">Operação</h2>

            <button onClick={() => router.push('/dashboard/admin/groups')} className="w-full bg-white border border-gray-200 p-5 rounded-2xl flex items-center text-left hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm space-x-4 active:scale-95">
                <div className="bg-blue-100 p-3 rounded-xl">
                    <LayoutGrid className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 text-lg">Locais / Grupos</h3>
                    <p className="text-sm text-gray-500">Ex: Câmara Fria, Bar, Estoque Seco</p>
                </div>
            </button>

            <button onClick={() => router.push('/dashboard/admin/items')} className="w-full bg-white border border-gray-200 p-5 rounded-2xl flex items-center text-left hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm space-x-4 active:scale-95">
                <div className="bg-purple-100 p-3 rounded-xl">
                    <Package className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 text-lg">Itens de Estoque</h3>
                    <p className="text-sm text-gray-500">Todos os produtos e suas unidades</p>
                </div>
            </button>

            <button onClick={() => router.push('/dashboard/admin/routines')} className="w-full bg-white border border-gray-200 p-5 rounded-2xl flex items-center text-left hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm space-x-4 active:scale-95">
                <div className="bg-green-100 p-3 rounded-xl">
                    <CalendarSync className="w-6 h-6 text-green-600" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 text-lg">Rotinas de Contagem</h3>
                    <p className="text-sm text-gray-500">Frequência e Configurar Agendamentos</p>
                </div>
            </button>

            <button onClick={() => router.push('/dashboard/admin/history')} className="w-full bg-white border border-gray-200 p-5 rounded-2xl flex items-center text-left hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm space-x-4 active:scale-95">
                <div className="bg-orange-100 p-3 rounded-xl">
                    <History className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 text-lg">Histórico de Ciclos</h3>
                    <p className="text-sm text-gray-500">Consultar execuções passadas por período</p>
                </div>
            </button>

            {/* ── NOVO EIXO — VENDAS ─────────────────────────────── */}
            <div className="pt-4">
                <div className="flex items-center gap-2 pl-1 mb-3">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Vendas</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full uppercase tracking-wider">Novo</span>
                </div>

                <button
                    onClick={() => router.push('/dashboard/admin/vendas')}
                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white p-5 rounded-2xl flex items-center text-left hover:from-indigo-700 hover:to-indigo-600 transition-all shadow-md space-x-4 active:scale-95"
                >
                    <div className="bg-white/20 p-3 rounded-xl shrink-0">
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">Módulo de Vendas</h3>
                        <p className="text-sm text-indigo-100">Integração Takeat · estrutura inicial</p>
                    </div>
                </button>
            </div>

        </div>
    )
}
