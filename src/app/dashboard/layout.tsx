'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { ConfirmModal } from '@/components/ConfirmModal'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true)
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const router = useRouter()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                router.push('/login')
            } else {
                setLoading(false)
            }
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!session) {
                router.push('/login')
            }
        })

        return () => subscription.unsubscribe()
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <ConfirmModal
                isOpen={showLogoutConfirm}
                title="Sair do sistema?"
                message="Você precisará fazer login novamente para acessar o sistema."
                onCancel={() => setShowLogoutConfirm(false)}
                onConfirm={() => { setShowLogoutConfirm(false); supabase.auth.signOut(); }}
            />
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
                <div className="px-4 h-16 flex justify-between items-center max-w-md mx-auto">
                    <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">NaBrasa <span className="text-[#b33324]">Controle</span></h1>
                    <button onClick={() => setShowLogoutConfirm(true)} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Sair</button>
                </div>
            </header>
            <main className="pb-20 max-w-md mx-auto relative z-0">
                {children}
            </main>
        </div>
    )
}
