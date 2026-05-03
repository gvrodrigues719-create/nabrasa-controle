'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Loader2, ArrowLeft } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        async function checkAuth() {
            // 1. Tenta pegar o operador via PIN (Sessão Operacional)
            const { getActiveOperator } = await import('@/app/actions/pinAuth')
            const op = await getActiveOperator()

            if (op) {
                if (op.role === 'admin' || op.role === 'manager') {
                    setLoading(false)
                    return
                } else {
                    router.push('/dashboard')
                    return
                }
            }

            // 2. Se não houver PIN, tenta Supabase Auth (E-mail/Senha)
            const { data: { user } } = await supabase.auth.getUser()
            
            if (!user) {
                router.push('/login')
                return
            }

            const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
            if (profile && (profile.role === 'admin' || profile.role === 'manager')) {
                setLoading(false)
            } else {
                router.push('/dashboard')
            }
        }

        checkAuth()
    }, [router])

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-600 w-8 h-8" /></div>
    }

    return (
        <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
            <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center space-x-3 sticky top-[64px] z-40 shadow-sm">
                <button onClick={() => router.push('/dashboard')} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 transition">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="font-bold text-gray-900 tracking-tight">Administração</span>
            </div>
            <div className="pt-2">
                {children}
            </div>
        </div>
    )
}
