'use client'

import React from 'react'
import { Flame, Eye, Settings as SettingsIcon, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
    userName?: string
    isDemoMode?: boolean
    isManager?: boolean
    viewMode?: 'manager' | 'operator'
    setViewMode?: (mode: 'manager' | 'operator') => void
    showBack?: boolean
    backUrl?: string
}

export default function Header({ 
    userName, 
    isDemoMode, 
    isManager, 
    viewMode, 
    setViewMode,
    showBack,
    backUrl = '/dashboard'
}: HeaderProps) {
    
    function getGreeting() {
        const h = new Date().getHours()
        if (h < 12) return 'Bom dia'
        if (h < 18) return 'Boa tarde'
        return 'Bom turno'
    }

    return (
        <header className="px-5 pt-6 pb-2.5 bg-white border-b border-gray-100 mb-4 md:mb-6 flex flex-col gap-4 md:gap-5 shadow-sm sticky top-0 z-30 transition-all">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 md:gap-3">
                    {showBack && (
                        <Link href={backUrl} className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors text-[#58413e]">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    )}
                    <div className="w-9 h-9 md:w-10 md:h-10 bg-[#B13A2B] rounded-2xl flex items-center justify-center shadow-lg shadow-red-100 shrink-0">
                        <Flame className="w-4.5 h-4.5 md:w-5 md:h-5 text-white" fill="currentColor" />
                    </div>
                    <div>
                        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5 md:mb-1">NaBrasa Unit 1</p>
                        <h1 className="text-base md:text-lg font-black text-gray-900 tracking-tight leading-tight">
                            {getGreeting()}, {userName || 'Colaborador'}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isDemoMode && (
                        <div className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full hidden sm:flex items-center gap-1">
                            <span className="text-[8px] font-black uppercase tracking-widest font-sans">Demo</span>
                        </div>
                    )}
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center font-black text-[#B13A2B] text-xs md:text-sm shrink-0">
                        {(userName || 'v').charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>

            {/* Switcher de Visão (Apenas Gerentes) */}
            {isManager && setViewMode && (
                <div className="flex bg-gray-100 p-1 rounded-2xl">
                    <button 
                        onClick={() => setViewMode('manager')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            viewMode === 'manager' 
                                ? 'bg-white text-gray-900 shadow-sm' 
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <SettingsIcon className="w-3.5 h-3.5" />
                        Visão Gerente
                    </button>
                    <button 
                        onClick={() => setViewMode('operator')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            viewMode === 'operator' 
                                ? 'bg-white text-[#B13A2B] shadow-sm' 
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <Eye className="w-3.5 h-3.5" />
                        Ver como Operador
                    </button>
                </div>
            )}
        </header>
    )
}
