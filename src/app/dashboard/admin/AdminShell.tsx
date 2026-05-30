'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface AdminShellProps {
    children: React.ReactNode
    title?: string
}

export default function AdminShell({ children, title = 'Administração' }: AdminShellProps) {
    const router = useRouter()

    return (
        <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
            <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center space-x-3 sticky top-[64px] z-40 shadow-sm">
                <button 
                    onClick={() => router.push('/dashboard')} 
                    className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 transition active:scale-95"
                    aria-label="Voltar para o Dashboard"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="font-bold text-gray-900 tracking-tight">{title}</span>
            </div>
            <div className="pt-2">
                {children}
            </div>
        </div>
    )
}
