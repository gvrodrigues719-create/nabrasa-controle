'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import AdminChecklistManager from './AdminChecklistManager'

export default function AdminChecklistsPage() {
    const router = useRouter()

    return (
        <main className="container mx-auto py-6 px-4">
            <div className="mb-8 flex items-center gap-4">
                <button 
                    onClick={() => router.push('/dashboard')}
                    className="p-2 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-600 hover:bg-gray-50 transition active:scale-95 shrink-0"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Auditoria & Performance</h1>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Torre de Controle Operacional</p>
                </div>
            </div>
            
            <AdminChecklistManager />
        </main>
    )
}
