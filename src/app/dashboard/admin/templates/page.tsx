"use client"

import { useRouter } from 'next/navigation'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import AdminChecklistManager from '../checklists/AdminChecklistManager'

export default function TemplatesManagementPage() {
    const router = useRouter()

    return (
        <div className="pb-20 min-h-screen bg-gray-50/20">
            {/* HEADER FIXO */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20 px-4 py-4 md:px-6 shadow-sm">
                <div className="flex items-center gap-4 max-w-7xl mx-auto">
                    <button 
                        onClick={() => router.push('/dashboard/admin')}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-all active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <ClipboardCheck className="w-5 h-5 text-gray-400" />
                            Templates de Checklist
                        </h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gestão de Estrutura e Regras</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
                <AdminChecklistManager />
            </div>
        </div>
    )
}
