'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { ConfirmModal } from '@/components/ConfirmModal'
import { logoutOperator } from '@/app/actions/pinAuth'
import BottomNav from './components/operator/BottomNav'
import KitchenBottomNav from './components/operator/KitchenBottomNav'
import IcaraiRouteGuard from './components/operator/IcaraiRouteGuard'

export default function ClientDashboardLayout({
    children,
    initialOp,
    hasManagerSession
}: {
    children: React.ReactNode,
    initialOp: { name: string, role: string } | null
    hasManagerSession?: boolean
}) {
    // Server já garantiu autenticação — sem spinner bloqueante
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const [opName] = useState<string | null>(initialOp ? initialOp.name : null)
    const router = useRouter()
    const pathname = usePathname()

    const isKitchen = initialOp?.role === 'kitchen' || initialOp?.name === 'Cozinha Central'
    const isNormalExecutionPage = pathname?.includes('/routines/') || pathname?.includes('/checklist/') || pathname?.includes('/count/') || pathname?.includes('/purchases')
    const showNormalBottomNav = !isKitchen && !isNormalExecutionPage

    const isKitchenExecutionPage = pathname?.match(/\/dashboard\/count\/.+/) || pathname?.match(/\/dispatch$/) || pathname?.match(/\/dashboard\/purchases\/.+/) || pathname?.match(/\/history\/[0-9a-fA-F-]+$/)
    const showKitchenBottomNav = isKitchen && !isKitchenExecutionPage
    const isAnyNavVisible = showNormalBottomNav || showKitchenBottomNav

    // Guarda complementar: detecta expiração de sessão em tempo real
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' && !opName) {
                import('./hooks/useDashboardIdentity').then(m => m.clearDashboardIdentityCache())
                router.push('/login')
            }
        })
        return () => subscription.unsubscribe()
    }, [router, opName])


    return (
        <div className="min-h-screen bg-gray-50">
            <ConfirmModal
                isOpen={showLogoutConfirm}
                title={opName ? "Trocar Operador?" : "Sair do sistema?"}
                message={opName ? "Você tem certeza que quer encerrar a sessão deste usuário?" : "Você precisará fazer login novamente para acessar."}
                onCancel={() => setShowLogoutConfirm(false)}
                onConfirm={async () => {
                    setShowLogoutConfirm(false);
                    const { clearDashboardIdentityCache } = await import('./hooks/useDashboardIdentity');
                    clearDashboardIdentityCache();
                    if (opName) {
                        await logoutOperator();
                        router.push('/login');
                    } else {
                        await supabase.auth.signOut();
                        router.push('/login');
                    }
                }}
            />
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
                <div className="px-4 h-16 flex justify-between items-center max-w-md lg:max-w-6xl mx-auto">
                    <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">NaBrasa <span className="text-[#b33324]">Controle</span></h1>
                    <div className="flex items-center gap-3">
                        {opName && <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg">OP: {opName}</span>}
                        <button onClick={() => setShowLogoutConfirm(true)} className="text-sm font-bold text-gray-500 hover:text-red-600 transition-colors">
                            {opName ? 'Trocar' : 'Sair'}
                        </button>
                    </div>
                </div>
            </header>
            <main className={`max-w-md lg:max-w-6xl mx-auto relative z-0 ${isAnyNavVisible ? 'pb-24' : 'pb-6'}`}>
                <IcaraiRouteGuard>
                    {children}
                </IcaraiRouteGuard>
            </main>
            {showNormalBottomNav && <BottomNav />}
            {showKitchenBottomNav && <KitchenBottomNav />}
        </div>
    )
}
