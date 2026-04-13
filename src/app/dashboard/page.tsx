'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ClipboardList, Settings, ShieldCheck, Box } from 'lucide-react'

export default function DashboardPage() {
    const [userRole, setUserRole] = useState<string>('operator')
    const [userName, setUserName] = useState<string>('')
    const router = useRouter()

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('role, name')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    setUserRole(profile.role)
                    // Bug 3: prioriza nome real, fallback para parte local do email
                    const displayName = profile.name?.trim() || user.email?.split('@')[0] || 'Usuário'
                    setUserName(displayName)
                }
            }
        }
        loadProfile()
    }, [])

    return (
        <div className="p-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-700 font-bold text-xl uppercase tracking-wider">
                        {userName.substring(0, 2)}
                    </span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Olá, {userName}</h2>
                    <p className="text-sm text-gray-500 capitalize">{userRole === 'operator' ? 'Operador' : userRole === 'manager' ? 'Gerente' : 'Administrador'}</p>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Ações Principais</h3>

                <button
                    onClick={() => router.push('/dashboard/routines')}
                    className="w-full bg-indigo-600 text-white p-5 rounded-2xl flex items-center justify-between shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all active:scale-95"
                >
                    <div className="flex items-center space-x-4">
                        <ClipboardList className="w-8 h-8" />
                        <span className="font-semibold text-xl tracking-tight">Efetuar Contagem</span>
                    </div>
                </button>

                {['admin', 'manager'].includes(userRole) && (
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <button
                            onClick={() => router.push('/dashboard/admin/reports')}
                            className="bg-white border border-gray-200 p-5 rounded-2xl flex flex-col items-center justify-center text-gray-800 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm space-y-3 active:scale-95"
                        >
                            <ShieldCheck className="w-8 h-8 text-indigo-600" />
                            <span className="font-semibold text-sm">Auditoria</span>
                        </button>
                        <button
                            onClick={() => router.push('/dashboard/admin')}
                            className="bg-white border border-gray-200 p-5 rounded-2xl flex flex-col items-center justify-center text-gray-800 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm space-y-3 active:scale-95"
                        >
                            <Settings className="w-8 h-8 text-gray-500" />
                            <span className="font-semibold text-sm">Configurar</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
