'use client'

import { useRouter } from 'next/navigation'
import { Package, History, AlertTriangle, ShoppingCart } from 'lucide-react'

export default function AdminPurchasesHub() {
    const router = useRouter()

    const sections = [
        {
            icon: Package,
            color: 'bg-orange-50',
            iconColor: 'text-orange-600',
            title: 'Catálogo de Itens',
            desc: 'Gerenciar, revisar e cadastrar itens do abastecimento',
            href: '/dashboard/admin/purchases/items',
        },
        {
            icon: History,
            color: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            title: 'Histórico de Pedidos',
            desc: 'Consultar todos os pedidos por loja, status e período',
            href: '/dashboard/admin/purchases/history',
        },
    ]

    return (
        <div className="p-4 space-y-2">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-1 mb-3">
                Compras &amp; Abastecimento
            </h2>

            {sections.map(s => (
                <button
                    key={s.href}
                    onClick={() => router.push(s.href)}
                    className="w-full bg-white border border-gray-200 p-5 rounded-2xl flex items-center text-left hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm space-x-4 active:scale-95"
                >
                    <div className={`${s.color} p-3 rounded-xl`}>
                        <s.icon className={`w-6 h-6 ${s.iconColor}`} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">{s.title}</h3>
                        <p className="text-sm text-gray-500">{s.desc}</p>
                    </div>
                </button>
            ))}
        </div>
    )
}
