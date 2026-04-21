"use client"

import { 
    Zap, 
    Clock, 
    ChevronRight,
} from 'lucide-react'

import { runChecklistDistributionAction } from '@/app/actions/checklistAction'
import toast from 'react-hot-toast'
import { useState } from 'react'
import Link from 'next/link'

interface ManagerQuickActionsProps {
    lateCount: number;
}


export default function ManagerQuickActions({ lateCount }: ManagerQuickActionsProps) {
    const lateText = lateCount > 0
        ? `${lateCount} ${lateCount === 1 ? 'tarefa de auditoria' : 'tarefas de auditoria'} em atraso`
        : "sem atrasos no momento"

    return (
        <section>
            <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-6 bg-gray-900 rounded-full" />
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Intervenção Operacional</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
                <Link 
                    href="/dashboard/admin/checklists?tab=operational"
                    className="bg-white border border-gray-100 p-6 rounded-[2.5rem] shadow-sm hover:border-gray-900/10 transition-all flex items-center justify-between group active:scale-[0.98]"
                >
                    <div className="flex items-center gap-5">
                        <div className={`w-16 h-16 rounded-[24px] bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <Clock className="w-7 h-7" />
                        </div>
                        <div className="text-left">
                            <span className="block text-xs font-black uppercase text-gray-900 leading-none mb-1.5">Gerenciar Atrasos</span>
                            <span className="block text-sm font-bold text-gray-400 lowercase">{lateText}</span>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 group-hover:bg-gray-900 group-hover:text-white transition-all">
                        <ChevronRight className="w-5 h-5" />
                    </div>
                </Link>
            </div>
        </section>
    )
}

