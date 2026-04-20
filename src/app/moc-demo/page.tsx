
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useMocDemoStore } from '@/demo/use-moc-demo-store'
import { DEMO_USERS } from '@/demo/mock-data'
import { User, ChevronRight, ShieldCheck, UserCheck } from 'lucide-react'

export default function MocDemoLoginPage() {
    const router = useRouter()
    const { setActiveUser } = useMocDemoStore()

    const handleSelectUser = (userId: string) => {
        setActiveUser(userId)
        router.push('/moc-demo/dashboard')
    }

    return (
        <div className="p-6 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <header className="mb-10 text-center">
                <div className="flex flex-col items-center gap-2 mb-4">
                    <span className="text-[10px] font-black text-[#B13A2B] uppercase tracking-[0.3em] bg-red-50 px-3 py-1 rounded-full border border-red-100">NaBrasa Controle</span>
                    <h1 className="text-3xl font-black tracking-tight text-[#1b1c1a]">MOC Demo</h1>
                    <p className="text-xs text-[#8c716c] font-medium max-w-[200px] mx-auto leading-relaxed">
                        Selecione um perfil para visualizar a experiência do colaborador
                    </p>
                </div>
            </header>

            <div className="space-y-4">
                <h2 className="text-[10px] font-black text-[#c0b3b1] uppercase tracking-[0.2em] mb-2 px-1">Entrar como:</h2>
                
                <div className="grid gap-3">
                    {DEMO_USERS.map((user) => (
                        <button
                            key={user.id}
                            onClick={() => handleSelectUser(user.id)}
                            className="w-full flex items-center justify-between p-4 rounded-3xl bg-[#F8F7F4] border border-[#eeedea] hover:bg-white hover:border-[#B13A2B]/30 hover:shadow-lg hover:shadow-red-50/50 active:scale-[0.98] transition-all group text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                                    user.role === 'manager' ? 'bg-[#1b1c1a] text-white' : 
                                    user.role === 'leader' ? 'bg-[#B13A2B] text-white' : 'bg-white text-[#8c716c] border border-[#eeedea]'
                                }`}>
                                    {user.role === 'manager' ? <ShieldCheck className="w-6 h-6" /> : 
                                     user.role === 'leader' ? <UserCheck className="w-6 h-6" /> : <User className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-[#1b1c1a] leading-tight group-hover:text-[#B13A2B] transition-colors">{user.name}</h3>
                                    <p className="text-[10px] font-bold text-[#8c716c] uppercase tracking-wide mt-0.5">{user.job_title}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-[#c0b3b1] group-hover:text-[#B13A2B] transition-all group-hover:translate-x-1" />
                        </button>
                    ))}
                </div>
            </div>

            <footer className="mt-12 text-center pb-8">
                <p className="text-[10px] font-bold text-[#c0b3b1] uppercase tracking-[0.1em]">Versão de Demonstração Isolada</p>
                <p className="text-[9px] text-[#c0b3b1] mt-1 italic">Nenhum dado real será afetado nesta sessão</p>
            </footer>
        </div>
    )
}
