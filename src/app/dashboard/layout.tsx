'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { ConfirmModal } from '@/components/ConfirmModal'
import { logoutOperator, getActiveOperator } from '@/app/actions/pinAuth'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true)
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const [opName, setOpName] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        let isMounted = true

        async function checkAuth() {
            const op = await getActiveOperator()
            if (!isMounted) return

            if (op) {
                setOpName(op.name)
                setLoading(false)
                return // Operator is logged in, no Supabase Auth needed
            }

            const { data: { session } } = await supabase.auth.getSession()
            if (!session && isMounted) {
                router.push('/login')
            } else if (isMounted) {
                setLoading(false)
            }
        }

        checkAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!session && !opName) {
                // router.push('/login')
                // Wait for strict checkAuth over opName, don't aggressively push.
            }
        })

        return () => { isMounted = false; subscription.unsubscribe() }
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
                title={opName ? "Trocar Operador?" : "Sair do sistema?"}
                message={opName ? "Você tem certeza que quer encerrar a sessão deste usuário?" : "Você precisará fazer login novamente para acessar."}
                onCancel={() => setShowLogoutConfirm(false)}
                onConfirm={async () => {
                    setShowLogoutConfirm(false);
                    if (opName) {
                        await logoutOperator();
                        router.push('/login');
                    } else {
                        supabase.auth.signOut();
                    }
                }}
            />
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
                <div className="px-4 h-16 flex justify-between items-center max-w-md mx-auto">
                    <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">NaBrasa <span className="text-[#b33324]">Controle</span></h1>
                    <div className="flex items-center gap-3">
                        {opName && <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg">OP: {opName}</span>}
                        <button onClick={() => setShowLogoutConfirm(true)} className="text-sm font-bold text-gray-500 hover:text-red-600 transition-colors">
                            {opName ? 'Trocar' : 'Sair'}
                        </button>
                    </div>
                </div>
            </header>
            <main className="pb-20 max-w-md mx-auto relative z-0">
                {children}
            </main>
        </div>
    )
}
