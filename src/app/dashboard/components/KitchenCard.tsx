'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChefHat, ChevronRight } from 'lucide-react'
import { getKitchenPendingCountAction } from '@/modules/purchases/actions'

export default function KitchenCard() {
    const [pendingCount, setPendingCount] = useState(0)

    useEffect(() => {
        getKitchenPendingCountAction().then(res => {
            if (res.success && res.data != null) {
                setPendingCount(res.data)
            }
        })
    }, [])

    return (
        <Link 
            href="/dashboard/kitchen"
            className="bg-white border border-gray-100 p-6 rounded-[2.5rem] shadow-sm hover:border-gray-900/10 transition-all flex items-center justify-between group active:scale-[0.98]"
        >
            <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-[24px] bg-[#B13A2B]/5 text-[#B13A2B] flex items-center justify-center group-hover:scale-110 transition-transform relative border border-[#B13A2B]/10">
                    <ChefHat className="w-7 h-7" />
                    {pendingCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#B13A2B] text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md">
                            {pendingCount}
                        </span>
                    )}
                </div>
                <div className="text-left">
                    <span className="block text-xs font-black uppercase text-gray-900 leading-none mb-1.5">Cozinha Central</span>
                    <span className="block text-sm font-bold text-gray-400 lowercase">
                        Separar pedidos de abastecimento
                    </span>
                </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 group-hover:bg-[#B13A2B] group-hover:text-white transition-all">
                <ChevronRight className="w-5 h-5" />
            </div>
        </Link>
    )
}
