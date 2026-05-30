
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useMocDemoStore } from '@/demo/use-moc-demo-store'
import { LogOut, RefreshCw, ChevronDown } from 'lucide-react'
import Link from 'next/link'

export default function DemoHeader() {
    const { activeUser, users, setActiveUser } = useMocDemoStore()
    const router = useRouter()
    const [isMenuOpen, setIsMenuOpen] = React.useState(false)

    if (!activeUser) return null

    const handleLogout = () => {
        router.push('/moc-demo')
    }

    const handleSwitchUser = (userId: string) => {
        setActiveUser(userId)
        setIsMenuOpen(false)
    }

    return (
        <header className="sticky top-0 z-[60] bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-[#B13A2B] uppercase tracking-[0.2em] leading-none">NaBrasa Controle</span>
                    <span className="text-[10px] font-bold text-[#c0b3b1] uppercase tracking-[0.1em] border-l border-gray-200 pl-2 leading-none">Demo</span>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-1.5 mt-1 group"
                >
                    <span className="text-sm font-black text-[#1b1c1a] group-hover:text-[#B13A2B] transition-colors">{activeUser.name}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#c0b3b1] group-hover:text-[#B13A2B] transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            <div className="flex items-center gap-3">
                <button 
                    onClick={handleLogout}
                    className="w-10 h-10 rounded-2xl bg-[#F8F7F4] border border-[#eeedea] flex items-center justify-center text-[#8c716c] hover:bg-red-50 hover:border-red-100 hover:text-[#B13A2B] transition-all"
                    title="Sair da Demo"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            {/* Switch User Menu */}
            {isMenuOpen && (
                <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-xl p-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <span className="text-[10px] font-black text-[#c0b3b1] uppercase tracking-[0.2em]">Alternar Perfil Demo</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 max-h-[40vh] overflow-y-auto pr-1">
                        {users.map(user => (
                            <button
                                key={user.id}
                                onClick={() => handleSwitchUser(user.id)}
                                className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                                    activeUser.id === user.id ? 'bg-[#B13A2B]/5 text-[#B13A2B] border border-[#B13A2B]/10' : 'hover:bg-gray-50 text-[#58413e]'
                                }`}
                            >
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-black">{user.name}</span>
                                    <span className="text-[10px] font-bold opacity-60 uppercase">{user.job_title}</span>
                                </div>
                                {activeUser.id === user.id && <div className="w-1.5 h-1.5 rounded-full bg-[#B13A2B]" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </header>
    )
}
