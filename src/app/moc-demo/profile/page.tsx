
'use client'

import React from 'react'
import { useMocDemoStore } from '@/demo/use-moc-demo-store'
import DemoHeader from '../components/DemoHeader'
import DemoBottomNav from '../components/DemoBottomNav'
import { Trophy, Flame, Target, Star, Award, ChevronUp, ChevronDown, Minus } from 'lucide-react'

export default function DemoProfilePage() {
    const { activeUser, users } = useMocDemoStore()

    if (!activeUser) return null

    // Sort users by weekly points for ranking
    const topRanking = [...users]
        .sort((a, b) => b.weekly_points - a.weekly_points)

    const rankPosition = topRanking.findIndex(u => u.id === activeUser.id) + 1

    return (
        <div className="flex flex-col min-h-screen">
            <DemoHeader />
            
            <div className="flex-1 p-6 pb-24 overflow-y-auto space-y-8 animate-in fade-in duration-700">
                {/* Profile Header */}
                <section className="text-center space-y-4">
                    <div className="relative inline-block">
                        <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[#B13A2B] to-[#E54D3D] flex items-center justify-center text-white shadow-xl shadow-red-100 mx-auto">
                            <span className="text-3xl font-black">{activeUser.name.charAt(0)}</span>
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white border border-[#eeedea] shadow-md flex items-center justify-center text-[#B13A2B] font-black">
                            {activeUser.level}
                        </div>
                    </div>
                    
                    <div>
                        <h2 className="text-2xl font-black text-[#1b1c1a]">{activeUser.name}</h2>
                        <p className="text-xs font-bold text-[#8c716c] uppercase tracking-widest">{activeUser.job_title}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-2">
                        <div className="bg-[#f9f8f4] p-3 rounded-2xl border border-[#eeedea]">
                            <p className="text-[8px] font-black text-[#c0b3b1] uppercase tracking-widest mb-1">Pontos</p>
                            <p className="text-lg font-black text-[#1b1c1a]">{activeUser.points}</p>
                        </div>
                        <div className="bg-[#fff7f6] p-3 rounded-2xl border border-red-50">
                            <p className="text-[8px] font-black text-[#B13A2B] uppercase tracking-widest mb-1">Weekly</p>
                            <p className="text-lg font-black text-[#B13A2B]">{activeUser.weekly_points}</p>
                        </div>
                        <div className="bg-[#f0f9ff] p-3 rounded-2xl border border-blue-50">
                            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Streak</p>
                            <div className="flex items-center justify-center gap-1">
                                <Flame className="w-4 h-4 text-blue-500 fill-blue-500" />
                                <span className="text-lg font-black text-[#1b1c1a]">{activeUser.streak}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Ranking Section */}
                <section className="space-y-4">
                    <header className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em] flex items-center gap-2">
                            <Trophy className="w-4 h-4" /> Ranking Semanal
                        </h3>
                        <span className="text-[9px] font-bold text-[#c0b3b1] uppercase">Atualizado agora</span>
                    </header>

                    <div className="bg-white rounded-[2.5rem] border border-[#eeedea] shadow-sm overflow-hidden">
                        {topRanking.filter(u => u.role !== 'manager').map((user, index) => {
                            const isMe = user.id === activeUser.id
                            const position = index + 1
                            
                            return (
                                <div 
                                    key={user.id}
                                    className={`flex items-center justify-between p-4 border-b border-gray-50 last:border-0 ${isMe ? 'bg-red-50/30' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 flex items-center justify-center">
                                            {position === 1 ? <Award className="w-6 h-6 text-yellow-500 fill-yellow-100" /> :
                                             position === 2 ? <Award className="w-6 h-6 text-gray-400 fill-gray-100" /> :
                                             position === 3 ? <Award className="w-6 h-6 text-orange-400 fill-orange-50" /> :
                                             <span className="text-sm font-black text-[#c0b3b1]">{position}</span>}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-sm font-black ${isMe ? 'text-[#B13A2B]' : 'text-[#1b1c1a]'}`}>
                                                {user.name} {isMe && "(Você)"}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-bold text-[#8c716c] uppercase tracking-tighter">Nível {user.level}</span>
                                                <span className="text-[14px] opacity-20">•</span>
                                                <div className="flex items-center gap-0.5">
                                                    <Flame className="w-2.5 h-2.5 text-blue-400 fill-blue-400" />
                                                    <span className="text-[9px] font-bold text-blue-500">{user.streak}d</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className={`text-sm font-black ${isMe ? 'text-[#B13A2B]' : 'text-[#1b1c1a]'}`}>{user.weekly_points}</span>
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">pontos</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* Manager Info (if manager) */}
                {activeUser.role === 'manager' && (
                    <div className="p-4 rounded-3xl bg-[#1b1c1a] text-white">
                        <div className="flex items-center gap-3 mb-2">
                            <ShieldCheck className="w-5 h-5 text-white/50" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Visão de Gerência</span>
                        </div>
                        <p className="text-xs font-medium text-white/70 leading-relaxed">
                            Como gerente, você não entra na disputa do ranking operacional, mas pode visualizar e validar todas as rotinas em tempo real.
                        </p>
                    </div>
                )}
            </div>

            <DemoBottomNav />
        </div>
    )
}

function ShieldCheck({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}
